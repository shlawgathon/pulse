"""
FastAPI dependencies for authentication and authorization.

This module provides reusable dependencies for:
- Extracting and validating JWT tokens
- Getting the current authenticated user
- Authorization checks
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from src.services.auth_service import auth_service
from src.models.user import User

# Security scheme for Swagger UI
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    Dependency to get the current authenticated user from JWT.

    Args:
        credentials: HTTP Bearer token credentials.

    Returns:
        The authenticated User document.

    Raises:
        HTTPException: If token is invalid or user not found.
    """
    token = credentials.credentials

    # Verify the token and extract user ID
    user_id = auth_service.verify_access_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch the user from database
    user = await User.get(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to get the current active user.

    This is an alias for get_current_user that makes intent clearer.

    Args:
        current_user: The authenticated user.

    Returns:
        The authenticated User document.
    """
    return current_user
