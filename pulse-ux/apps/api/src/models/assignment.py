"""
Visitor-to-variant assignments ensuring sticky bucketing.

This collection tracks which variant each visitor has been assigned
to ensure consistent experience across sessions.
"""

from datetime import datetime

from beanie import Document, Indexed
from pydantic import Field
from pymongo import IndexModel, ASCENDING


class Assignment(Document):
    """
    Maps a visitor to their assigned variant for sticky bucketing.

    Assignments ensure that a visitor always sees the same variant
    throughout an experiment, providing consistent user experience
    and valid statistical results.

    Attributes:
        experiment_id: Reference to the Experiment
        visitor_id: Stable identifier for the visitor (cookie/fingerprint hash)
        variant_id: Reference to the assigned Variant
        assigned_at: Timestamp when assignment was made
        last_seen_at: Timestamp of most recent activity
        impression_tracked: Whether impression has been counted
        conversion_tracked: Whether conversion has been counted
        converted_at: Timestamp of conversion
        user_agent: Visitor's user agent
        referrer: Referring URL
    """

    experiment_id: str = Field(...)
    visitor_id: str = Field(..., min_length=1, max_length=100)
    variant_id: str = Field(...)
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen_at: datetime = Field(default_factory=datetime.utcnow)

    # Tracking flags to prevent double counting
    impression_tracked: bool = Field(default=False)
    conversion_tracked: bool = Field(default=False)
    converted_at: datetime | None = Field(default=None)

    # Additional metadata
    user_agent: str | None = Field(default=None)
    referrer: str | None = Field(default=None)

    class Settings:
        name = "assignments"
        indexes = [
            # Unique compound index for lookup
            IndexModel([("experiment_id", ASCENDING), ("visitor_id", ASCENDING)], unique=True),
            IndexModel([("variant_id", ASCENDING)]),
            # 90-day TTL for automatic cleanup
            IndexModel([("last_seen_at", ASCENDING)], expireAfterSeconds=7776000),
        ]
