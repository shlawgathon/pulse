"""
Session recordings captured via rrweb for experiment visitors.

This collection stores rrweb event data for replaying user sessions
during A/B testing experiments.
"""

from datetime import datetime
from typing import Any

from beanie import Document, Indexed
from pydantic import Field
from pymongo import IndexModel, ASCENDING, DESCENDING


class SessionRecording(Document):
    """
    Stores rrweb session recording data for experiment visitors.

    Attributes:
        session_id: Unique identifier for this recording session
        visitor_id: Reference to visitor (matches Assignment.visitor_id)
        experiment_id: Reference to the Experiment being recorded
        variant_id: Reference to the assigned Variant
        site_id: Reference to the parent Site
        url: Page URL where recording was captured
        user_agent: Visitor's browser user agent
        events: List of rrweb events (stored as JSON array)
        events_count: Number of events in the recording
        duration_ms: Recording duration in milliseconds
        started_at: When recording started
        ended_at: When recording ended
        is_complete: Whether recording ended normally
    """

    session_id: str = Field(...)
    visitor_id: str = Field(..., min_length=1, max_length=100)
    experiment_id: str = Field(...)
    variant_id: str = Field(...)
    site_id: str = Field(...)
    url: str = Field(..., max_length=2000)
    user_agent: str | None = Field(default=None, max_length=500)

    # Recording data - stored as list of dicts (rrweb events)
    events: list[dict[str, Any]] = Field(default_factory=list)
    events_count: int = Field(default=0)
    duration_ms: int = Field(default=0)

    # Timestamps
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: datetime | None = Field(default=None)

    # Metadata
    is_complete: bool = Field(default=False)

    class Settings:
        name = "session_recordings"
        indexes = [
            # Query recordings by experiment (most common query)
            IndexModel(
                [("experiment_id", ASCENDING), ("started_at", DESCENDING)]
            ),
            # Query by visitor for listing their sessions
            IndexModel([("visitor_id", ASCENDING), ("experiment_id", ASCENDING)]),
            # Session lookup for upserting events (unique)
            IndexModel([("session_id", ASCENDING)], unique=True),
        ]
