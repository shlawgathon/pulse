"""
Tracks generated Pull Requests for winning variants.

This model records the status and details of GitHub PRs created
when a user selects a winning variant from an experiment.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, Any

from beanie import Document, Indexed
from pydantic import Field


class PRStatus(str, Enum):
    """Pull Request lifecycle states."""

    PENDING = "pending"  # PR creation in progress
    CREATED = "created"  # PR successfully created
    MERGED = "merged"  # PR has been merged
    CLOSED = "closed"  # PR was closed without merging
    FAILED = "failed"  # PR creation failed


class PullRequest(Document):
    """
    Tracks a Pull Request generated from a winning experiment variant.

    When a user selects a winner, the system generates code changes
    and creates a PR in the linked GitHub repository.

    Attributes:
        experiment_id: Reference to the source Experiment
        variant_id: Reference to the winning Variant
        site_id: Reference to the Site (for GitHub credentials)
        github_pr_number: The PR number in GitHub
        github_pr_url: Direct URL to the PR
        branch_name: Name of the feature branch
        status: Current PR state
        code_changes: JSON representation of the changes made
        created_at: Timestamp of PR creation
        merged_at: Timestamp when PR was merged (if applicable)
        error_message: Error details if creation failed
    """

    experiment_id: Indexed(str)
    variant_id: str = Field(...)
    site_id: Indexed(str)
    github_pr_number: Optional[int] = Field(default=None)
    github_pr_url: Optional[str] = Field(default=None)
    branch_name: str = Field(...)
    status: Indexed(PRStatus) = Field(default=PRStatus.PENDING)
    code_changes: Optional[dict[str, Any]] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    merged_at: Optional[datetime] = Field(default=None)
    error_message: Optional[str] = Field(default=None)

    class Settings:
        name = "pull_requests"
