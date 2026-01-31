"""
Pull Request service for generating GitHub PRs from winning variants.

This service orchestrates:
- Code transformation via LLM
- GitHub branch and PR creation
- PR status tracking
"""

import asyncio
import logging
from datetime import datetime
import re

from src.models.pull_request import PullRequest, PRStatus
from src.models.experiment import Experiment, ExperimentStatus
from src.models.variant import Variant
from src.models.site import Site
from src.workers.pr_worker import generate_pr_for_experiment

logger = logging.getLogger(__name__)


class PRService:
    """Service for Pull Request operations."""

    def _generate_branch_name(self, experiment_name: str) -> str:
        """Generate a git-safe branch name from experiment name."""
        # Convert to lowercase, replace spaces with hyphens, remove special chars
        safe_name = re.sub(r"[^a-z0-9-]", "", experiment_name.lower().replace(" ", "-"))
        # Limit length and add prefix
        safe_name = safe_name[:40]
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M")
        return f"pulse/{safe_name}-{timestamp}"

    async def generate_pr(
        self,
        experiment_id: str,
        variant_id: str,
        user_id: str,
    ) -> PullRequest | None:
        """
        Generate a PR for a completed experiment's winning variant.

        Args:
            experiment_id: Experiment ID.
            variant_id: Variant ID to generate PR for.
            user_id: User ID for authorization.

        Returns:
            Created PullRequest or None if cannot generate.
        """
        # Get experiment and verify ownership
        experiment = await Experiment.find_one(
            Experiment.id == experiment_id,
            Experiment.created_by == user_id,
        )

        if experiment is None:
            logger.warning(f"Experiment {experiment_id} not found for user {user_id}")
            return None

        if experiment.status != ExperimentStatus.COMPLETED:
            logger.warning(f"Experiment {experiment_id} is not completed")
            return None

        # Get the variant
        variant = await Variant.find_one(
            Variant.id == variant_id,
            Variant.experiment_id == experiment_id,
        )
        if variant is None:
            logger.warning(f"Variant {variant_id} not found for experiment {experiment_id}")
            return None

        # Get the site for GitHub credentials
        site = await Site.get(experiment.site_id)
        if site is None:
            logger.warning(f"Site {experiment.site_id} not found")
            return None

        if not site.github_repo or not site.github_pat:
            logger.warning(f"GitHub not configured for site {site.id}")
            return None

        # Check for existing pending/created PR
        existing = await PullRequest.find_one(
            PullRequest.experiment_id == experiment_id,
            PullRequest.variant_id == variant_id,
            PullRequest.status.in_([PRStatus.PENDING, PRStatus.CREATED]),
        )
        if existing:
            logger.info(f"PR already exists for experiment {experiment_id} variant {variant_id}")
            return existing

        # Create PR record
        pr = PullRequest(
            experiment_id=experiment_id,
            variant_id=variant_id,
            site_id=str(site.id),
            branch_name=self._generate_branch_name(experiment.name),
            status=PRStatus.PENDING,
        )
        await pr.insert()

        # Trigger async PR generation
        asyncio.create_task(
            self._generate_pr_async(str(pr.id))
        )

        return pr

    async def _generate_pr_async(self, pr_id: str) -> None:
        """
        Background task to generate the PR.
        """
        logger.info(f"Starting async PR generation for {pr_id}")
        try:
            await generate_pr_for_experiment(pr_id)
        except Exception as e:
            logger.error(f"PR generation failed for {pr_id}: {e}")

    async def get_pr(
        self,
        pr_id: str,
        user_id: str,
    ) -> PullRequest | None:
        """
        Get a PR by ID if accessible by the user.

        Args:
            pr_id: PR ID.
            user_id: User ID for authorization.

        Returns:
            PullRequest or None.
        """
        pr = await PullRequest.get(pr_id)
        if pr is None:
            return None

        # Verify user owns the experiment
        experiment = await Experiment.find_one(
            Experiment.id == pr.experiment_id,
            Experiment.created_by == user_id,
        )
        if experiment is None:
            return None

        return pr

    async def list_prs(
        self,
        user_id: str,
        site_id: str | None = None,
        experiment_id: str | None = None,
    ) -> list[PullRequest]:
        """
        List PRs for the user.

        Args:
            user_id: User ID for authorization.
            site_id: Optional site filter.
            experiment_id: Optional experiment filter.

        Returns:
            List of PullRequest documents.
        """
        # If experiment_id is provided, verify ownership and return directly
        if experiment_id:
            experiment = await Experiment.find_one(
                Experiment.id == experiment_id,
                Experiment.created_by == user_id,
            )
            if experiment is None:
                return []

            return await PullRequest.find(
                PullRequest.experiment_id == experiment_id
            ).sort("-created_at").to_list()

        # Get experiments owned by user
        query = {"created_by": user_id}
        if site_id:
            query["site_id"] = site_id

        experiments = await Experiment.find(query).to_list()
        experiment_ids = [str(exp.id) for exp in experiments]

        if not experiment_ids:
            return []

        # Get PRs for those experiments
        return await PullRequest.find(
            {"experiment_id": {"$in": experiment_ids}}
        ).sort("-created_at").to_list()


# Singleton instance
pr_service = PRService()
