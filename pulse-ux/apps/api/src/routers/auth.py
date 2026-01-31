"""
Authentication router for user registration, login, and token management.

Endpoints:
- POST /register: Create a new user account
- POST /login: Authenticate and receive tokens
- POST /refresh: Refresh access token
- POST /logout: Revoke refresh token
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, Field

from src.services.auth_service import auth_service
from src.dependencies import get_current_user
from src.models.user import User

router = APIRouter()


# Request/Response schemas
class RegisterRequest(BaseModel):
    """Request body for user registration."""

    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    name: str = Field(..., min_length=1, max_length=100, description="User's display name")
    organization_name: str | None = Field(None, max_length=100, description="Organization name")


class LoginRequest(BaseModel):
    """Request body for user login."""

    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")


class RefreshRequest(BaseModel):
    """Request body for token refresh."""

    refresh_token: str = Field(..., description="Refresh token")


class TokenResponse(BaseModel):
    """Response containing access and refresh tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User data returned in responses."""

    id: str
    email: str
    name: str
    organization_name: str | None = None
    avatar_url: str | None = None


class AuthResponse(BaseModel):
    """Combined response with user data and tokens."""

    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest) -> AuthResponse:
    """
    Create a new user account.

    Args:
        request: Registration data including email, password, name, and optional org name.

    Returns:
        User data and authentication tokens.

    Raises:
        HTTPException: If email is already registered.
    """
    try:
        user = await auth_service.register_user(
            email=request.email,
            password=request.password,
            name=request.name,
            organization_name=request.organization_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    access_token, refresh_token = await auth_service.create_session(user)

    return AuthResponse(
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            organization_name=user.organization_name,
            avatar_url=user.avatar_url,
        ),
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest) -> AuthResponse:
    """
    Authenticate a user and return tokens.

    Args:
        request: Login credentials (email and password).

    Returns:
        User data and authentication tokens.

    Raises:
        HTTPException: If credentials are invalid.
    """
    user = await auth_service.authenticate_user(
        email=request.email,
        password=request.password,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token, refresh_token = await auth_service.create_session(user)

    return AuthResponse(
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            organization_name=user.organization_name,
            avatar_url=user.avatar_url,
        ),
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshRequest) -> TokenResponse:
    """
    Refresh an access token using a refresh token.

    Args:
        request: The refresh token.

    Returns:
        New access token (refresh token remains the same).

    Raises:
        HTTPException: If refresh token is invalid or expired.
    """
    new_access_token = await auth_service.refresh_access_token(request.refresh_token)

    if new_access_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=request.refresh_token,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: RefreshRequest,
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Revoke a refresh token (logout).

    Args:
        request: The refresh token to revoke.
        current_user: The authenticated user (from JWT).

    Returns:
        No content on success.
    """
    await auth_service.revoke_refresh_token(request.refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Get the current authenticated user's information.

    Args:
        current_user: The authenticated user (from JWT).

    Returns:
        User data.
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        organization_name=current_user.organization_name,
        avatar_url=current_user.avatar_url,
    )
