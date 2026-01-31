"""
Authentication service for MongoDB-based user management.

This module provides secure password hashing, JWT token generation,
and user authentication without external OAuth providers.
"""

from datetime import datetime, timedelta
from typing import Optional

from pydantic import EmailStr

from src.config import settings
from src.models.user import User, RefreshToken
from src.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token as verify_token,
    create_refresh_token,
    hash_refresh_token,
)


class AuthService:
    """
    Service for handling authentication operations.

    Provides methods for:
    - User registration with password hashing
    - Login verification
    - JWT token generation and validation
    - Refresh token management
    """

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a plain password against its hash.

        Args:
            plain_password: The password to verify.
            hashed_password: The bcrypt hash to check against.

        Returns:
            True if password matches, False otherwise.
        """
        return verify_password(plain_password, hashed_password)

    def hash_password(self, password: str) -> str:
        """
        Hash a password using bcrypt.

        Args:
            password: Plain text password to hash.

        Returns:
            Bcrypt hash of the password.
        """
        return hash_password(password)

    def create_access_token(self, user_id: str) -> str:
        """
        Create a short-lived JWT access token.

        Args:
            user_id: The user's database ID.

        Returns:
            Encoded JWT token string.
        """
        return create_access_token(user_id)

    def verify_access_token(self, token: str) -> Optional[str]:
        """
        Verify and decode a JWT access token.

        Args:
            token: The JWT token to verify.

        Returns:
            User ID if valid, None otherwise.
        """
        return verify_token(token)

    async def register_user(
        self,
        email: EmailStr,
        password: str,
        name: str,
        organization_name: Optional[str] = None,
    ) -> User:
        """
        Register a new user account.

        Args:
            email: User's email address.
            password: Plain text password (will be hashed).
            name: User's display name.
            organization_name: Optional organization name.

        Returns:
            Created User document.

        Raises:
            ValueError: If email is already registered.
        """
        # Check if email already exists
        existing = await User.find_one(User.email == email)
        if existing:
            raise ValueError("Email already registered")

        # Create user with hashed password
        user = User(
            email=email,
            password_hash=self.hash_password(password),
            name=name,
            organization_name=organization_name,
        )
        await user.insert()
        return user

    async def authenticate_user(
        self,
        email: EmailStr,
        password: str,
    ) -> Optional[User]:
        """
        Authenticate a user by email and password.

        Args:
            email: User's email address.
            password: Plain text password to verify.

        Returns:
            User document if authentication succeeds, None otherwise.
        """
        user = await User.find_one(User.email == email)
        if not user:
            return None

        if not self.verify_password(password, user.password_hash):
            return None

        # Update last login timestamp
        user.last_login_at = datetime.utcnow()
        await user.save()

        return user

    async def authenticate_oauth_user(
        self,
        email: EmailStr,
        name: str,
        provider: str,
        provider_id: str,
        avatar_url: Optional[str] = None,
    ) -> User:
        """
        Authenticate or register a user via OAuth provider.

        Args:
            email: User's email from provider.
            name: User's name from provider.
            provider: Provider name (e.g., 'google', 'github').
            provider_id: Unique ID from the provider.
            avatar_url: Optional avatar URL.

        Returns:
            User document.
        """
        user = await User.find_one(User.email == email)
        
        if user:
            # Update info if needed
            user_updated = False
            if not user.auth_provider_id:
                user.auth_provider = provider
                user.auth_provider_id = provider_id
                user_updated = True
            
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
                user_updated = True
                
            user.last_login_at = datetime.utcnow()
            await user.save()
            return user

        # Create new user
        user = User(
            email=email,
            name=name,
            auth_provider=provider,
            auth_provider_id=provider_id,
            avatar_url=avatar_url,
            is_verified=True,  # OAuth emails are generally verified
            last_login_at=datetime.utcnow()
        )
        await user.insert()
        return user

    async def create_session(
        self,
        user: User,
    ) -> tuple[str, str]:
        """
        Create a new session with access and refresh tokens.

        Args:
            user: The authenticated user.

        Returns:
            Tuple of (access_token, refresh_token).
        """
        access_token = self.create_access_token(str(user.id))
        refresh_token, token_hash = create_refresh_token()

        # Store refresh token in database
        refresh_doc = RefreshToken(
            user_id=str(user.id),
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        await refresh_doc.insert()

        return access_token, refresh_token

    async def refresh_access_token(
        self,
        refresh_token: str,
    ) -> Optional[str]:
        """
        Generate a new access token using a refresh token.

        Args:
            refresh_token: The refresh token to validate.

        Returns:
            New access token if refresh token is valid, None otherwise.
        """
        token_hash = hash_refresh_token(refresh_token)

        refresh_doc = await RefreshToken.find_one(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at == None,
            RefreshToken.expires_at > datetime.utcnow(),
        )

        if not refresh_doc:
            return None

        return self.create_access_token(refresh_doc.user_id)

    async def revoke_refresh_token(self, refresh_token: str) -> bool:
        """
        Revoke a refresh token (logout).

        Args:
            refresh_token: The refresh token to revoke.

        Returns:
            True if revoked, False if not found.
        """
        token_hash = hash_refresh_token(refresh_token)

        refresh_doc = await RefreshToken.find_one(
            RefreshToken.token_hash == token_hash
        )

        if not refresh_doc:
            return False

        refresh_doc.revoked_at = datetime.utcnow()
        await refresh_doc.save()
        return True

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """
        Get a user by their ID.

        Args:
            user_id: The user's database ID.

        Returns:
            User document or None if not found.
        """
        return await User.get(user_id)


# Singleton instance
auth_service = AuthService()
