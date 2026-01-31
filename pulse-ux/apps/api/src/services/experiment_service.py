"""
Experiment service for A/B test lifecycle management.

This is a CRITICAL service that orchestrates:
- Experiment creation with async variant generation
- Experiment lifecycle (activate, pause, complete)
- Comparison data retrieval
"""

import asyncio
import logging
from datetime import datetime
from typing import Any

from src.models.experiment import Experiment, ExperimentStatus
from src.models.variant import Variant
from src.models.site import Site
from src.workers.scraper_worker import scrape_url
from src.workers.llm_worker import generate_variants_for_experiment, generate_comparison_analysis

logger = logging.getLogger(__name__)


class ExperimentService:
    """Service for experiment management operations."""

    async def create_experiment(
        self,
        site_id: str,
        created_by: str,
        name: str,
        target_url: str,
        description: str | None = None,
        url_pattern: str | None = None,
        optimization_goal: str | None = None,
        num_variants: int = 2,
    ) -> Experiment:
        """
        Create a new experiment and trigger async variant generation.

        Args:
            site_id: Site ID for this experiment.
            created_by: User ID who created the experiment.
            name: Experiment name.
            target_url: URL to optimize.
            description: Optional description.
            url_pattern: URL pattern for matching.
            optimization_goal: What to optimize for.
            num_variants: Number of variants to generate.

        Returns:
            Created Experiment document.
        """
        # Use target URL as pattern if not specified
        if url_pattern is None:
            # Escape special regex characters
            escaped_url = target_url.replace(".", "\\.").replace("/", "\\/")
            url_pattern = f"^{escaped_url}$"

        experiment = Experiment(
            site_id=site_id,
            name=name,
            description=description,
            url_pattern=url_pattern,
            target_url=target_url,
            status=ExperimentStatus.DRAFT,
            created_by=created_by,
        )
        await experiment.insert()

        # Create control variant
        control = Variant(
            experiment_id=str(experiment.id),
            name="Control",
            description="Original page without modifications",
            is_control=True,
            patches=[],
        )
        await control.insert()

        # Trigger async variant generation in background
        asyncio.create_task(
            self._generate_variants_async(
                experiment_id=str(experiment.id),
                target_url=target_url,
                optimization_goal=optimization_goal,
                num_variants=num_variants,
            )
        )

        return experiment

    async def _generate_variants_async(
        self,
        experiment_id: str,
        target_url: str,
        optimization_goal: str | None,
        num_variants: int,
    ) -> None:
        """
        Background task to generate variants for an experiment.

        This runs asynchronously after experiment creation.
        """
        logger.info(f"Starting variant generation for experiment {experiment_id}")

        try:
            # 1. Scrape the target URL
            logger.info(f"Scraping URL: {target_url}")
            scrape_result = await scrape_url(target_url, include_screenshot=True)

            # Update experiment with HTML snapshot and screenshot
            experiment = await Experiment.get(experiment_id)
            if experiment:
                experiment.base_html_snapshot = scrape_result.get("html")
                experiment.base_screenshot_url = scrape_result.get("screenshot")
                await experiment.save()

            # 2. Generate variants via LLM
            logger.info(f"Generating {num_variants} variants via LLM")
            await generate_variants_for_experiment(
                experiment_id=experiment_id,
                html=scrape_result.get("html", ""),
                target_url=target_url,
                optimization_goal=optimization_goal,
                num_variants=num_variants,
            )

            logger.info(f"Variant generation complete for experiment {experiment_id}")

        except Exception as e:
            logger.error(f"Variant generation failed for experiment {experiment_id}: {e}")
            # Update experiment with error
            experiment = await Experiment.get(experiment_id)
            if experiment:
                experiment.description = f"Variant generation failed: {str(e)}"
                experiment.updated_at = datetime.utcnow()
                await experiment.save()

    async def list_experiments(
        self,
        user_id: str,
        site_id: str | None = None,
        status: ExperimentStatus | None = None,
    ) -> list[Experiment]:
        """
        List experiments with optional filtering.

        Args:
            user_id: User ID for authorization.
            site_id: Optional site filter.
            status: Optional status filter.

        Returns:
            List of Experiment documents.
        """
        # Build query
        query = {"created_by": user_id}
        if site_id:
            query["site_id"] = site_id
        if status:
            query["status"] = status

        return await Experiment.find(query).sort("-created_at").to_list()

    async def get_experiment(
        self,
        experiment_id: str,
        user_id: str,
    ) -> Experiment | None:
        """
        Get an experiment by ID if accessible by the user.

        Args:
            experiment_id: Experiment ID.
            user_id: User ID for authorization.

        Returns:
            Experiment document or None.
        """
        return await Experiment.find_one(
            Experiment.id == experiment_id,
            Experiment.created_by == user_id,
        )

    async def get_experiment_variants(
        self,
        experiment_id: str,
    ) -> list[Variant]:
        """
        Get all variants for an experiment.

        Args:
            experiment_id: Experiment ID.

        Returns:
            List of Variant documents.
        """
        return await Variant.find(
            Variant.experiment_id == experiment_id
        ).to_list()

    async def activate_experiment(
        self,
        experiment_id: str,
        user_id: str,
    ) -> Experiment | None:
        """
        Activate an experiment to start collecting data.

        Args:
            experiment_id: Experiment ID.
            user_id: User ID for authorization.

        Returns:
            Updated Experiment or None if not found/cannot activate.
        """
        experiment = await self.get_experiment(experiment_id, user_id)
        if experiment is None:
            return None

        if experiment.status not in [ExperimentStatus.PENDING, ExperimentStatus.PAUSED]:
            return None

        experiment.status = ExperimentStatus.ACTIVE
        experiment.started_at = experiment.started_at or datetime.utcnow()
        experiment.updated_at = datetime.utcnow()
        await experiment.save()
        return experiment

    async def pause_experiment(
        self,
        experiment_id: str,
        user_id: str,
    ) -> Experiment | None:
        """
        Pause an active experiment.

        Args:
            experiment_id: Experiment ID.
            user_id: User ID for authorization.

        Returns:
            Updated Experiment or None if not found/cannot pause.
        """
        experiment = await self.get_experiment(experiment_id, user_id)
        if experiment is None:
            return None

        if experiment.status != ExperimentStatus.ACTIVE:
            return None

        experiment.status = ExperimentStatus.PAUSED
        experiment.updated_at = datetime.utcnow()
        await experiment.save()
        return experiment

    async def complete_experiment(
        self,
        experiment_id: str,
        user_id: str,
        winner_variant_id: str,
    ) -> Experiment | None:
        """
        Complete an experiment and select the winner.

        Args:
            experiment_id: Experiment ID.
            user_id: User ID for authorization.
            winner_variant_id: ID of the winning variant.

        Returns:
            Updated Experiment or None if not found/cannot complete.
        """
        experiment = await self.get_experiment(experiment_id, user_id)
        if experiment is None:
            return None

        if experiment.status not in [ExperimentStatus.ACTIVE, ExperimentStatus.PAUSED]:
            return None

        # Verify winner variant exists
        winner = await Variant.find_one(
            Variant.id == winner_variant_id,
            Variant.experiment_id == experiment_id,
        )
        if winner is None:
            return None

        experiment.status = ExperimentStatus.COMPLETED
        experiment.ended_at = datetime.utcnow()
        experiment.winner_variant_id = winner_variant_id
        experiment.updated_at = datetime.utcnow()
        await experiment.save()
        return experiment

    async def get_comparison(
        self,
        experiment_id: str,
        user_id: str,
    ) -> tuple[Experiment, list[Variant], str | None] | None:
        """
        Get side-by-side comparison data with AI analysis.

        Args:
            experiment_id: Experiment ID.
            user_id: User ID for authorization.

        Returns:
            Tuple of (experiment, variants, ai_analysis) or None.
        """
        experiment = await self.get_experiment(experiment_id, user_id)
        if experiment is None:
            return None

        variants = await Variant.find(
            Variant.experiment_id == experiment_id
        ).to_list()

        # Generate AI analysis
        ai_analysis = None
        try:
            ai_analysis = await generate_comparison_analysis(experiment_id)
        except Exception as e:
            logger.warning(f"Failed to generate AI analysis: {e}")

        return (experiment, variants, ai_analysis)


# Singleton instance
experiment_service = ExperimentService()
