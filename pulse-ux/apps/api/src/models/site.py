"""
Site configuration representing a customer's registered website.

This model stores the connection details, authentication credentials,
and configuration for sites where experiments can be deployed.
"""

from datetime import datetime
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class Site(Document):
    """
    Represents a registered website where experiments can be deployed.

    Attributes:
        name: Human-readable site identifier (e.g., "Personal-Site")
        domain: The primary domain where the actuator script is installed
        owner_id: Reference to the user who registered this site
        public_key: Non-secret key embedded in the actuator script for identification
        allowed_origins: List of origins permitted to serve experiments (CORS)
        github_repo: Optional GitHub repository URL for PR generation
        github_pat: GitHub Personal Access Token (encrypted, for initial implementation)
        created_at: Timestamp when the site was registered
        updated_at: Timestamp of last modification
        is_active: Whether experiments can be deployed to this site
    """

    name: str = Field(..., min_length=1, max_length=100)
    domain: Indexed(str)
    owner_id: Indexed(str)
    public_key: Indexed(str, unique=True)
    allowed_origins: list[str] = Field(default_factory=list)
    github_repo: Optional[str] = Field(default=None)
    github_pat: Optional[str] = Field(default=None)  # Encrypted PAT for initial implementation
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)

    class Settings:
        name = "sites"
