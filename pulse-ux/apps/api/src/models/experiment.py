"""
Experiment definition and lifecycle management.

Experiments represent A/B tests that compare different UX variants
on a specific URL pattern within a registered site.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class ExperimentStatus(str, Enum):
    """Lifecycle states for an experiment."""

    DRAFT = "draft"  # Initial creation, variants being generated
    PENDING = "pending"  # Variants ready, awaiting activation
    ACTIVE = "active"  # Live and collecting data
    PAUSED = "paused"  # Temporarily stopped
    COMPLETED = "completed"  # Winner selected
    ARCHIVED = "archived"  # Removed from active consideration


class Experiment(Document):
    """
    Represents an A/B test experiment targeting a specific URL pattern.

    Attributes:
        site_id: Reference to the parent Site document
        name: Human-readable experiment name
        description: Detailed description of the experiment's purpose
        url_pattern: Regex pattern matching URLs where this experiment applies
        target_url: The specific URL used for initial scraping and variant generation
        status: Current lifecycle state
        traffic_allocation: Percentage of traffic to include in experiment (0-100)
        created_by: User ID who created this experiment
        created_at: Timestamp of creation
        updated_at: Timestamp of last modification
        started_at: When the experiment was first activated
        ended_at: When the experiment was completed or archived
        winner_variant_id: Reference to the winning Variant document
        base_html_snapshot: Original HTML captured at experiment creation
        base_screenshot_url: Screenshot of original page state
    """

    site_id: Indexed(str)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    url_pattern: str = Field(...)
    target_url: str = Field(...)
    status: ExperimentStatus = Field(default=ExperimentStatus.DRAFT)
    traffic_allocation: int = Field(default=100, ge=0, le=100)
    created_by: Indexed(str)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = Field(default=None)
    ended_at: Optional[datetime] = Field(default=None)
    winner_variant_id: Optional[str] = Field(default=None)
    base_html_snapshot: Optional[str] = Field(default=None)
    base_screenshot_url: Optional[str] = Field(default=None)

    class Settings:
        name = "experiments"
        indexes = [
            IndexModel([("site_id", ASCENDING), ("status", ASCENDING)]),
        ]
