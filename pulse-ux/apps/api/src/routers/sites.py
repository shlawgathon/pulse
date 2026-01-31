"""
Sites router for managing registered websites.

Endpoints:
- POST /: Register a new site
- GET /: List user's sites
- GET /{site_id}: Get site details
- PATCH /{site_id}: Update site configuration
- DELETE /{site_id}: Deactivate a site
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

from src.dependencies import get_current_user
from src.models.user import User
from src.services.site_service import site_service

router = APIRouter()


# Request/Response schemas
class SiteCreate(BaseModel):
    """Request body for creating a new site."""

    name: str = Field(..., min_length=1, max_length=100, description="Site display name")
    domain: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Site domain or URL (e.g., example.com or https://example.com/)",
    )
    github_repo: str | None = Field(None, description="GitHub repository URL for PR generation")
    github_pat: str | None = Field(None, description="GitHub Personal Access Token")


class SiteUpdate(BaseModel):
    """Request body for updating a site."""

    name: str | None = Field(None, min_length=1, max_length=100)
    github_repo: str | None = None
    github_pat: str | None = None
    is_active: bool | None = None


class SiteResponse(BaseModel):
    """Site data returned in responses."""

    id: str
    name: str
    domain: str
    public_key: str
    allowed_origins: list[str]
    github_repo: str | None = None
    is_active: bool
    created_at: str
    script_tag: str


@router.post("/", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
async def create_site(
    request: SiteCreate,
    current_user: User = Depends(get_current_user),
) -> SiteResponse:
    """
    Register a new site for experimentation.

    Args:
        request: Site creation data.
        current_user: The authenticated user.

    Returns:
        Created site with public key and script tag.
    """
    site = await site_service.create_site(
        owner_id=str(current_user.id),
        name=request.name,
        domain=request.domain,
        github_repo=request.github_repo,
        github_pat=request.github_pat,
    )

    return SiteResponse(
        id=str(site.id),
        name=site.name,
        domain=site.domain,
        public_key=site.public_key,
        allowed_origins=site.allowed_origins,
        github_repo=site.github_repo,
        is_active=site.is_active,
        created_at=site.created_at.isoformat(),
        script_tag=site_service.generate_script_tag(site.public_key),
    )


@router.get("/", response_model=list[SiteResponse])
async def list_sites(
    current_user: User = Depends(get_current_user),
) -> list[SiteResponse]:
    """
    List all sites owned by the current user.

    Args:
        current_user: The authenticated user.

    Returns:
        List of sites.
    """
    sites = await site_service.list_sites(owner_id=str(current_user.id))

    return [
        SiteResponse(
            id=str(site.id),
            name=site.name,
            domain=site.domain,
            public_key=site.public_key,
            allowed_origins=site.allowed_origins,
            github_repo=site.github_repo,
            is_active=site.is_active,
            created_at=site.created_at.isoformat(),
            script_tag=site_service.generate_script_tag(site.public_key),
        )
        for site in sites
    ]


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(
    site_id: str,
    current_user: User = Depends(get_current_user),
) -> SiteResponse:
    """
    Get details for a specific site.

    Args:
        site_id: The site's ID.
        current_user: The authenticated user.

    Returns:
        Site details.

    Raises:
        HTTPException: If site not found or not owned by user.
    """
    site = await site_service.get_site(site_id=site_id, owner_id=str(current_user.id))

    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    return SiteResponse(
        id=str(site.id),
        name=site.name,
        domain=site.domain,
        public_key=site.public_key,
        allowed_origins=site.allowed_origins,
        github_repo=site.github_repo,
        is_active=site.is_active,
        created_at=site.created_at.isoformat(),
        script_tag=site_service.generate_script_tag(site.public_key),
    )


@router.patch("/{site_id}", response_model=SiteResponse)
async def update_site(
    site_id: str,
    request: SiteUpdate,
    current_user: User = Depends(get_current_user),
) -> SiteResponse:
    """
    Update a site's configuration.

    Args:
        site_id: The site's ID.
        request: Fields to update.
        current_user: The authenticated user.

    Returns:
        Updated site details.

    Raises:
        HTTPException: If site not found or not owned by user.
    """
    site = await site_service.update_site(
        site_id=site_id,
        owner_id=str(current_user.id),
        **request.model_dump(exclude_unset=True),
    )

    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    return SiteResponse(
        id=str(site.id),
        name=site.name,
        domain=site.domain,
        public_key=site.public_key,
        allowed_origins=site.allowed_origins,
        github_repo=site.github_repo,
        is_active=site.is_active,
        created_at=site.created_at.isoformat(),
        script_tag=site_service.generate_script_tag(site.public_key),
    )


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site(
    site_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Deactivate a site (soft delete).

    Args:
        site_id: The site's ID.
        current_user: The authenticated user.

    Raises:
        HTTPException: If site not found or not owned by user.
    """
    success = await site_service.deactivate_site(
        site_id=site_id,
        owner_id=str(current_user.id),
    )

    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
