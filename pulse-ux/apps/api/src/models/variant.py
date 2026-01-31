"""
Variant definitions containing the DOM patches to apply.

Each variant represents a specific UX modification that can be
A/B tested against the control and other variants.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from pymongo import IndexModel, ASCENDING


class PatchAction(str, Enum):
    """Allowed DOM modification actions."""

    STYLE = "style"  # Modify CSS properties
    CLASS_ADD = "class_add"  # Add CSS classes
    CLASS_REMOVE = "class_remove"  # Remove CSS classes
    ATTRIBUTE = "attribute"  # Set/modify attributes
    TEXT = "text"  # Change text content
    HTML = "html"  # Replace innerHTML (use sparingly)
    HIDE = "hide"  # Set display: none
    SHOW = "show"  # Set display: block/flex/etc


class DOMPatch(BaseModel):
    """
    A single DOM modification instruction.

    Attributes:
        action: The type of DOM modification to perform
        selector: CSS selector targeting the element(s) to modify
        value: The value to apply (interpretation depends on action)
        property_name: For style/attribute actions, the specific property
    """

    action: PatchAction = Field(...)
    selector: str = Field(..., min_length=1, max_length=500)
    value: str = Field(..., max_length=5000)
    property_name: Optional[str] = Field(default=None, max_length=100)


class Variant(Document):
    """
    Represents a specific UX variant within an experiment.

    Attributes:
        experiment_id: Reference to the parent Experiment
        name: Human-readable variant name (e.g., "Red CTA Button")
        description: AI-generated or human description of changes
        is_control: Whether this is the control variant (no changes)
        patches: List of DOM modifications to apply
        screenshot_url: Screenshot showing this variant applied
        impressions: Count of unique visitors who saw this variant
        conversions: Count of successful conversions (if tracking enabled)
        created_at: Timestamp of creation
    """

    experiment_id: Indexed(str)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    is_control: bool = Field(default=False)
    patches: list[DOMPatch] = Field(default_factory=list)
    screenshot_url: Optional[str] = Field(default=None)
    rendered_html: Optional[str] = Field(default=None)  # Cached rendered HTML with patches applied
    impressions: int = Field(default=0)
    conversions: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "variants"
        indexes = [
            IndexModel([("experiment_id", ASCENDING), ("is_control", ASCENDING)]),
        ]
