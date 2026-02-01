"""
LLM worker for async variant generation via Claude.

This worker handles:
- Generating UX improvement variants from HTML
- Analyzing experiment results
"""

import logging
from datetime import datetime

from src.services.llm_service import llm_service
from src.models.experiment import Experiment, ExperimentStatus
from src.models.variant import Variant, DOMPatch, PatchAction
from src.models.user import User
from src.integrations.resend import resend_client
from src.config import settings

logger = logging.getLogger(__name__)


async def generate_variants_for_experiment(
    experiment_id: str,
    html: str,
    target_url: str,
    optimization_goal: str | None = None,
    num_variants: int = 2,
    screenshot_url: str | None = None,
    css: str | None = None,
) -> list[str]:
    """
    Generate variants for an experiment using LLM.

    Args:
        experiment_id: ID of the experiment
        html: HTML content of the target page
        target_url: URL being optimized
        optimization_goal: Optimization goal
        num_variants: Number of variants to generate
        screenshot_url: Optional URL of a screenshot for vision-based analysis
        css: Optional CSS content for styling context

    Returns:
        List of created variant IDs
    """
    logger.info(f"Generating {num_variants} variants for experiment {experiment_id}")

    try:
        # Generate variants via LLM (with optional vision from screenshot and CSS context)
        logger.info(f"Calling LLM with screenshot: {bool(screenshot_url)}, CSS: {bool(css)}")
        response = await llm_service.generate_variants(
            html=html,
            css=css,
            target_url=target_url,
            optimization_goal=optimization_goal,
            num_variants=num_variants,
            screenshot_url=screenshot_url,
        )
        logger.info(f"LLM returned {len(response.variants)} variants")

        variant_ids = []

        # Get the experiment to access base_html_snapshot
        experiment = await Experiment.get(experiment_id)
        base_html = experiment.base_html_snapshot if experiment else html

        # Create variant documents
        for gen_variant in response.variants:
            # Convert patches
            patches = []
            for patch in gen_variant.patches:
                try:
                    action = PatchAction(patch.action)
                except ValueError:
                    # Skip invalid actions
                    logger.warning(f"Skipping invalid patch action: {patch.action}")
                    continue

                patches.append(DOMPatch(
                    action=action,
                    selector=patch.selector,
                    value=patch.value,
                    property_name=patch.property_name,
                ))

            # Generate rendered HTML with patches applied (we store the base + patches, frontend renders)
            # For now, just store the patches - the frontend will apply them dynamically
            variant = Variant(
                experiment_id=experiment_id,
                name=gen_variant.name,
                description=gen_variant.description,
                is_control=False,
                patches=patches,
                rendered_html=base_html,  # Store base HTML; patches applied client-side
            )
            await variant.insert()
            variant_ids.append(str(variant.id))

        # Update experiment status
        experiment = await Experiment.get(experiment_id)
        if experiment:
            experiment.status = ExperimentStatus.PENDING
            experiment.updated_at = datetime.utcnow()
            await experiment.save()

            # Send email notification to creator
            try:
                user = await User.get(experiment.created_by)
                if user and user.email:
                    experiment_url = f"{settings.APP_URL}/experiments/{experiment_id}"
                    await resend_client.send_experiment_ready(
                        to=user.email,
                        experiment_name=experiment.name,
                        experiment_url=experiment_url,
                    )
                    logger.info(f"Sent experiment ready email to {user.email}")
            except Exception as email_error:
                logger.warning(f"Failed to send experiment ready email: {email_error}")

        logger.info(f"Created {len(variant_ids)} variants for experiment {experiment_id}")
        return variant_ids

    except Exception as e:
        import traceback
        error_details = f"{type(e).__name__}: {str(e) or 'No message'}"
        logger.error(f"Failed to generate variants for experiment {experiment_id}: {error_details}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")

        # Update experiment status to indicate failure
        experiment = await Experiment.get(experiment_id)
        if experiment:
            experiment.status = ExperimentStatus.DRAFT
            experiment.description = f"Variant generation failed: {error_details}"
            experiment.updated_at = datetime.utcnow()
            await experiment.save()

        raise


async def generate_comparison_analysis(
    experiment_id: str,
) -> str | None:
    """
    Generate AI analysis for an experiment's variants.

    Args:
        experiment_id: ID of the experiment

    Returns:
        Analysis text or None on failure
    """
    logger.info(f"Generating comparison analysis for experiment {experiment_id}")

    try:
        # Get variants
        variants = await Variant.find(
            Variant.experiment_id == experiment_id
        ).to_list()

        if not variants:
            return None

        # Find control
        control = next((v for v in variants if v.is_control), None)
        control_desc = control.description if control else "Original page"

        # Prepare variant data
        variant_data = [
            {
                "name": v.name,
                "description": v.description or "",
                "impressions": v.impressions,
                "conversions": v.conversions,
            }
            for v in variants
            if not v.is_control
        ]

        if not variant_data:
            return None

        analysis = await llm_service.generate_comparison_analysis(
            control_description=control_desc,
            variants=variant_data,
        )

        return analysis

    except Exception as e:
        logger.error(f"Failed to generate analysis for experiment {experiment_id}: {e}")
        return None
