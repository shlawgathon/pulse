"""
Site service for managing registered websites.

This service handles:
- Site CRUD operations
- Public key generation
- Script tag generation
"""

import secrets
from datetime import datetime
from urllib.parse import urlparse

from beanie import PydanticObjectId

from src.models.site import Site
from src.config import settings


class SiteService:
    """Service for site management operations."""

    def generate_public_key(self) -> str:
        """Generate a unique public key for a site."""
        return f"pk_{secrets.token_urlsafe(24)}"

    def normalize_domain(self, domain_or_url: str) -> str:
        """
        Extract the domain from a URL or normalize a bare domain.
        
        Examples:
            - "https://example.com/path" -> "example.com"
            - "http://example.com" -> "example.com"
            - "example.com" -> "example.com"
        """
        domain = domain_or_url.strip()
        
        # If it looks like a URL, parse it
        if domain.startswith(("http://", "https://")):
            parsed = urlparse(domain)
            domain = parsed.netloc or parsed.path
        
        # Remove any trailing slashes or paths
        domain = domain.split("/")[0]
        
        # Remove port if present
        domain = domain.split(":")[0]
        
        return domain.lower()

    def generate_script_tag(self, public_key: str) -> str:
        """
        Generate the script tag for embedding on customer sites.

        Args:
            public_key: The site's public key.

        Returns:
            HTML script tag as a string.
        """
        # In production, this would point to a CDN URL
        api_url = settings.APP_URL.rstrip("/")
        return f'<script src="{api_url}/actuator.js" data-pulse-key="{public_key}" defer></script>'

    async def create_site(
        self,
        owner_id: str,
        name: str,
        domain: str,
        github_repo: str | None = None,
        github_pat: str | None = None,
    ) -> Site:
        """
        Create a new site.

        Args:
            owner_id: User ID of the site owner.
            name: Display name for the site.
            domain: Site domain or URL.
            github_repo: Optional GitHub repository URL.
            github_pat: Optional GitHub PAT.

        Returns:
            Created Site document.
        """
        # Normalize the domain (extract from URL if needed)
        normalized_domain = self.normalize_domain(domain)
        
        site = Site(
            name=name,
            domain=normalized_domain,
            owner_id=owner_id,
            public_key=self.generate_public_key(),
            allowed_origins=[f"https://{normalized_domain}", f"http://{normalized_domain}"],
            github_repo=github_repo,
            github_pat=github_pat,
        )
        await site.insert()
        return site

    async def list_sites(self, owner_id: str) -> list[Site]:
        """
        List all sites owned by a user.

        Args:
            owner_id: User ID of the site owner.

        Returns:
            List of Site documents.
        """
        return await Site.find(
            Site.owner_id == owner_id,
            Site.is_active == True,
        ).to_list()

    async def get_site(self, site_id: str, owner_id: str) -> Site | None:
        """
        Get a site by ID if owned by the user.

        Args:
            site_id: Site ID.
            owner_id: User ID of the expected owner.

        Returns:
            Site document or None if not found.
        """
        return await Site.find_one(
            Site.id == PydanticObjectId(site_id),
            Site.owner_id == owner_id,
        )

    async def update_site(
        self,
        site_id: str,
        owner_id: str,
        **kwargs,
    ) -> Site | None:
        """
        Update a site's configuration.

        Args:
            site_id: Site ID.
            owner_id: User ID of the expected owner.
            **kwargs: Fields to update.

        Returns:
            Updated Site document or None if not found.
        """
        site = await self.get_site(site_id, owner_id)
        if site is None:
            return None

        for key, value in kwargs.items():
            if hasattr(site, key) and value is not None:
                setattr(site, key, value)

        site.updated_at = datetime.utcnow()
        await site.save()
        return site

    async def deactivate_site(self, site_id: str, owner_id: str) -> bool:
        """
        Deactivate a site (soft delete).

        Args:
            site_id: Site ID.
            owner_id: User ID of the expected owner.

        Returns:
            True if deactivated, False if not found.
        """
        site = await self.get_site(site_id, owner_id)
        if site is None:
            return False

        site.is_active = False
        site.updated_at = datetime.utcnow()
        await site.save()
        return True


# Singleton instance
site_service = SiteService()
