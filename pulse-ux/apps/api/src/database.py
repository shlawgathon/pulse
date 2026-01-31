"""
MongoDB database connection and initialization using Motor and Beanie.

This module provides async database connection management with proper
lifecycle handling for FastAPI applications.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from src.config import settings


# Global database client (initialized on startup)
_client: AsyncIOMotorClient | None = None


async def init_db() -> None:
    """
    Initialize the MongoDB connection and Beanie ODM.

    This should be called during application startup (in the lifespan context).
    It creates the Motor client and initializes Beanie with all document models.
    """
    global _client

    # Create Motor client
    _client = AsyncIOMotorClient(settings.DATABASE_URL)

    # Get database name from connection string or use default 'pulse'
    try:
        db = _client.get_default_database()
    except Exception:
        # No default database in connection string, use 'pulse'
        db = _client["pulse"]

    # Import models here to avoid circular imports
    from src.models.user import User, RefreshToken
    from src.models.site import Site
    from src.models.experiment import Experiment
    from src.models.variant import Variant
    from src.models.assignment import Assignment
    from src.models.pull_request import PullRequest

    # Initialize Beanie with all document models
    await init_beanie(
        database=db,
        document_models=[
            User,
            RefreshToken,
            Site,
            Experiment,
            Variant,
            Assignment,
            PullRequest,
        ],
    )


async def close_db() -> None:
    """
    Close the MongoDB connection.

    This should be called during application shutdown (in the lifespan context).
    """
    global _client

    if _client is not None:
        _client.close()
        _client = None


def get_client() -> AsyncIOMotorClient:
    """
    Get the MongoDB client instance.

    Returns:
        The Motor async client.

    Raises:
        RuntimeError: If database has not been initialized.
    """
    if _client is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return _client
