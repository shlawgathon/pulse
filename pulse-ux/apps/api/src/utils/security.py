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

import bcrypt
from jose import JWTError, jwt

from src.config import settings


def _prepare_password_for_bcrypt(password: str) -> bytes:
    """
    Prepare a password for bcrypt hashing.
    
    Bcrypt has a 72-byte limit. For long passwords, we pre-hash with SHA-256
    to get a fixed-length input. This is a standard pattern (used by Dropbox, etc.).
    
    Args:
        password: Plain text password.
        
    Returns:
        Password bytes safe for bcrypt (always <= 72 bytes).
    """
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        # Pre-hash long passwords with SHA-256 (produces 64-char hex string)
        return hashlib.sha256(password_bytes).hexdigest().encode("utf-8")
    return password_bytes


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against its bcrypt hash.

    Args:
        plain_password: The password to verify.
        hashed_password: The bcrypt hash to check against.

    Returns:
        True if password matches, False otherwise.
    """
    prepared = _prepare_password_for_bcrypt(plain_password)
    return bcrypt.checkpw(prepared, hashed_password.encode("utf-8"))


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password to hash.

    Returns:
        Bcrypt hash of the password.
    """
    prepared = _prepare_password_for_bcrypt(password)
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(prepared, salt).decode("utf-8")


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
