"""
Actuator service for handling public endpoint logic.

This service manages:
- Fetching active experiments for visitors
- Assigning variants with sticky bucketing
- Tracking events from the actuator script
"""

import re
import hashlib
from datetime import datetime
from typing import Any

from src.models.site import Site
from src.models.experiment import Experiment, ExperimentStatus
from src.models.variant import Variant
from src.models.assignment import Assignment


class ActuatorService:
    """Service for actuator script operations."""

    def _url_matches_pattern(self, url: str, pattern: str) -> bool:
        """Check if a URL matches an experiment's URL pattern."""
        try:
            # Convert simple wildcards to regex if not already a regex
            if not pattern.startswith("^"):
                # Convert glob-style patterns to regex
                regex_pattern = pattern.replace("**", ".*").replace("*", "[^/]*")
                regex_pattern = f"^{regex_pattern}"
                if not pattern.endswith("*"):
                    regex_pattern += "$"
            else:
                regex_pattern = pattern

            return bool(re.match(regex_pattern, url))
        except re.error:
            # If pattern is invalid, try exact match
            return url == pattern

    def _get_bucket(self, visitor_id: str, experiment_id: str, num_variants: int) -> int:
        """
        Deterministically assign a visitor to a bucket.
        Uses consistent hashing for sticky bucketing.
        """
        combined = f"{visitor_id}:{experiment_id}"
        hash_value = int(hashlib.md5(combined.encode()).hexdigest(), 16)
        return hash_value % num_variants

    async def get_experiments_for_visitor(
        self,
        public_key: str,
        visitor_id: str,
        url: str,
        user_agent: str | None = None,
        referrer: str | None = None,
    ) -> dict[str, Any] | None:
        """
        Get active experiments and variant assignments for a visitor.

        Args:
            public_key: Site's public key.
            visitor_id: Visitor's unique identifier.
            url: Current page URL.
            user_agent: Visitor's user agent.
            referrer: Referring URL.

        Returns:
            Dict with visitor_id and assignments, or None if site not found.
        """
        # Look up site by public_key
        site = await Site.find_one(
            Site.public_key == public_key,
            Site.is_active == True,
        )
        if not site:
            return None

        # Find active experiments matching the URL
        experiments = await Experiment.find(
            Experiment.site_id == str(site.id),
            Experiment.status == ExperimentStatus.ACTIVE,
        ).to_list()

        matching_experiments = [
            exp for exp in experiments
            if self._url_matches_pattern(url, exp.url_pattern)
        ]

        assignments = []

        for experiment in matching_experiments:
            # Get all variants for this experiment
            variants = await Variant.find(
                Variant.experiment_id == str(experiment.id)
            ).to_list()

            if not variants:
                continue

            # Check for existing assignment
            existing = await Assignment.find_one(
                Assignment.visitor_id == visitor_id,
                Assignment.experiment_id == str(experiment.id),
            )

            if existing:
                # Use existing assignment
                assigned_variant = next(
                    (v for v in variants if str(v.id) == existing.variant_id),
                    None
                )
                if assigned_variant:
                    assignments.append({
                        "experiment_id": str(experiment.id),
                        "variant_id": str(assigned_variant.id),
                        "is_control": assigned_variant.is_control,
                        "patches": [p.model_dump() for p in assigned_variant.patches],
                    })
                continue

            # Check traffic allocation
            import random
            if random.random() * 100 > experiment.traffic_allocation:
                continue

            # Assign to a bucket
            bucket = self._get_bucket(visitor_id, str(experiment.id), len(variants))
            assigned_variant = variants[bucket]

            # Store the assignment
            assignment = Assignment(
                visitor_id=visitor_id,
                experiment_id=str(experiment.id),
                variant_id=str(assigned_variant.id),
                user_agent=user_agent,
                referrer=referrer,
            )
            await assignment.insert()

            assignments.append({
                "experiment_id": str(experiment.id),
                "variant_id": str(assigned_variant.id),
                "is_control": assigned_variant.is_control,
                "patches": [p.model_dump() for p in assigned_variant.patches],
            })

        return {
            "visitor_id": visitor_id,
            "assignments": assignments,
        }

    async def track_impression(
        self,
        visitor_id: str,
        experiment_id: str,
        variant_id: str,
    ) -> bool:
        """
        Track an impression event.

        Args:
            visitor_id: Visitor's identifier.
            experiment_id: Experiment ID.
            variant_id: Variant ID.

        Returns:
            True if tracked successfully.
        """
        # Verify assignment exists
        assignment = await Assignment.find_one(
            Assignment.visitor_id == visitor_id,
            Assignment.experiment_id == experiment_id,
            Assignment.variant_id == variant_id,
        )

        if not assignment:
            return False

        # Increment variant impressions (if not already counted for this visitor)
        if not assignment.impression_tracked:
            variant = await Variant.get(variant_id)
            if variant:
                variant.impressions += 1
                await variant.save()

            assignment.impression_tracked = True
            await assignment.save()

        return True

    async def track_conversion(
        self,
        visitor_id: str,
        experiment_id: str,
        variant_id: str,
        event_name: str | None = None,
        metadata: dict | None = None,
    ) -> bool:
        """
        Track a conversion event.

        Args:
            visitor_id: Visitor's identifier.
            experiment_id: Experiment ID.
            variant_id: Variant ID.
            event_name: Optional event name.
            metadata: Optional event metadata.

        Returns:
            True if tracked successfully.
        """
        # Verify assignment exists
        assignment = await Assignment.find_one(
            Assignment.visitor_id == visitor_id,
            Assignment.experiment_id == experiment_id,
            Assignment.variant_id == variant_id,
        )

        if not assignment:
            return False

        # Increment variant conversions (if not already converted for this visitor)
        if not assignment.conversion_tracked:
            variant = await Variant.get(variant_id)
            if variant:
                variant.conversions += 1
                await variant.save()

            assignment.conversion_tracked = True
            assignment.converted_at = datetime.utcnow()
            await assignment.save()

        return True


# Singleton instance
actuator_service = ActuatorService()
