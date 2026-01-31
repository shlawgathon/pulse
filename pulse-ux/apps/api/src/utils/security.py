"""
Security utilities for password hashing and JWT tokens.

This module provides cryptographic functions for:
- Password hashing with bcrypt
- JWT token generation and verification
- Secure random token generation
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from src.config import settings


# Password hashing context using bcrypt with work factor 12
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against its bcrypt hash.

    Args:
        plain_password: The password to verify.
        hashed_password: The bcrypt hash to check against.

    Returns:
        True if password matches, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password to hash.

    Returns:
        Bcrypt hash of the password.
    """
    return pwd_context.hash(password)


def create_access_token(user_id: str) -> str:
    """
    Create a short-lived JWT access token.

    Args:
        user_id: The user's database ID.

    Returns:
        Encoded JWT token string.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "access",
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_access_token(token: str) -> str | None:
    """
    Verify and decode a JWT access token.

    Args:
        token: The JWT token to verify.

    Returns:
        User ID if valid, None otherwise.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "access":
            return None
        return payload.get("sub")
    except JWTError:
        return None


def create_refresh_token() -> tuple[str, str]:
    """
    Create a refresh token and its hash for storage.

    The raw token is returned to the client, while only the hash
    is stored in the database for security.

    Returns:
        Tuple of (raw_token, token_hash) - store only the hash.
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    return raw_token, token_hash


def hash_refresh_token(token: str) -> str:
    """
    Hash a refresh token for database lookup.

    Args:
        token: The raw refresh token.

    Returns:
        SHA-256 hash of the token.
    """
    return hashlib.sha256(token.encode()).hexdigest()


def generate_secure_key(length: int = 32) -> str:
    """
    Generate a cryptographically secure random key.

    Args:
        length: Number of bytes of randomness (output will be longer due to base64).

    Returns:
        URL-safe base64-encoded random string.
    """
    return secrets.token_urlsafe(length)
