"""
User account model for MongoDB-based authentication.

This model stores user credentials and profile information
for the initial password-based authentication system.
GitHub OAuth integration is planned for future releases.
"""

from datetime import datetime
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field, EmailStr
from pymongo import IndexModel, ASCENDING


class User(Document):
    """
    Represents a registered user account.

    Attributes:
        email: User's email address (unique identifier for login)
        password_hash: bcrypt-hashed password (never store plaintext)
        name: User's display name
        avatar_url: Optional URL to user's avatar image
        organization_name: Name of user's organization (shown in sidebar)
        is_active: Whether the account is active
        is_verified: Whether email has been verified
        created_at: Timestamp when account was created
        updated_at: Timestamp of last profile update
        last_login_at: Timestamp of most recent login
    """

    email: Indexed(EmailStr, unique=True)
    password_hash: str = Field(...)
    name: str = Field(..., min_length=1, max_length=100)
    avatar_url: Optional[str] = Field(default=None)
    organization_name: Optional[str] = Field(default=None, max_length=100)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = Field(default=None)

    class Settings:
        name = "users"


class RefreshToken(Document):
    """
    Stores refresh tokens for JWT authentication.

    Refresh tokens are stored as SHA-256 hashes for security.
    Expired tokens are automatically deleted via TTL index.

    Attributes:
        user_id: Reference to the User document
        token_hash: SHA-256 hash of the refresh token
        expires_at: When this token expires
        created_at: When this token was issued
        revoked_at: When this token was revoked (if applicable)
    """

    user_id: str = Field(...)
    token_hash: Indexed(str)
    expires_at: datetime = Field(...)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    revoked_at: Optional[datetime] = Field(default=None)

    class Settings:
        name = "refresh_tokens"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            # TTL index for automatic cleanup of expired tokens
            IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0),
        ]
