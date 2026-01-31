"""
Pull Requests router for managing generated PRs.

Endpoints:
- POST /generate: Generate a PR for a completed experiment
- GET /{pr_id}: Get PR details
- GET /: List PRs with filtering
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field

from src.dependencies import get_current_user
from src.models.user import User
from src.services.pr_service import pr_service

router = APIRouter()


# Request/Response schemas
class GeneratePRRequest(BaseModel):
    """Request body for generating a PR."""

    experiment_id: str = Field(..., description="The experiment ID")
    variant_id: str = Field(..., description="The winning variant ID")


class PRResponse(BaseModel):
    """Pull Request data returned in responses."""

    id: str
    experiment_id: str
    variant_id: str
    site_id: str
    github_pr_number: int | None = None
    github_pr_url: str | None = None
    branch_name: str
    status: str
    created_at: str
    merged_at: str | None = None
    error_message: str | None = None


@router.post(
    "/generate",
    response_model=PRResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_pr(
    request: GeneratePRRequest,
    current_user: User = Depends(get_current_user),
) -> PRResponse:
    """
    Generate a Pull Request for a completed experiment's winning variant.

    This triggers an async workflow to:
    1. Fetch experiment and winning variant
    2. Generate code transformations via LLM
    3. Create GitHub branch and commit
    4. Open Pull Request

    Args:
        request: PR generation request with experiment and variant IDs.
        current_user: The authenticated user.

    Returns:
        PR record (GitHub PR will be created asynchronously).

    Raises:
        HTTPException: If experiment not found or not completed.
    """
    pr = await pr_service.generate_pr(
        experiment_id=request.experiment_id,
        variant_id=request.variant_id,
        user_id=str(current_user.id),
    )

    if pr is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Experiment not found, not completed, or GitHub not configured",
        )

    return PRResponse(
        id=str(pr.id),
        experiment_id=pr.experiment_id,
        variant_id=pr.variant_id,
        site_id=pr.site_id,
        github_pr_number=pr.github_pr_number,
        github_pr_url=pr.github_pr_url,
        branch_name=pr.branch_name,
        status=pr.status.value,
        created_at=pr.created_at.isoformat(),
        merged_at=pr.merged_at.isoformat() if pr.merged_at else None,
        error_message=pr.error_message,
    )


@router.get("/", response_model=list[PRResponse])
async def list_prs(
    current_user: User = Depends(get_current_user),
    site_id: str | None = Query(None, description="Filter by site"),
    experiment_id: str | None = Query(None, description="Filter by experiment"),
) -> list[PRResponse]:
    """
    List PRs for the current user.

    Args:
        current_user: The authenticated user.
        site_id: Optional site ID filter.
        experiment_id: Optional experiment ID filter.

    Returns:
        List of PRs.
    """
    prs = await pr_service.list_prs(
        user_id=str(current_user.id),
        site_id=site_id,
        experiment_id=experiment_id,
    )

    return [
        PRResponse(
            id=str(pr.id),
            experiment_id=pr.experiment_id,
            variant_id=pr.variant_id,
            site_id=pr.site_id,
            github_pr_number=pr.github_pr_number,
            github_pr_url=pr.github_pr_url,
            branch_name=pr.branch_name,
            status=pr.status.value,
            created_at=pr.created_at.isoformat(),
            merged_at=pr.merged_at.isoformat() if pr.merged_at else None,
            error_message=pr.error_message,
        )
        for pr in prs
    ]


@router.get("/{pr_id}", response_model=PRResponse)
async def get_pr(
    pr_id: str,
    current_user: User = Depends(get_current_user),
) -> PRResponse:
    """
    Get PR details.

    Args:
        pr_id: The PR's ID.
        current_user: The authenticated user.

    Returns:
        PR details.

    Raises:
        HTTPException: If PR not found.
    """
    pr = await pr_service.get_pr(
        pr_id=pr_id,
        user_id=str(current_user.id),
    )

    if pr is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PR not found")

    return PRResponse(
        id=str(pr.id),
        experiment_id=pr.experiment_id,
        variant_id=pr.variant_id,
        site_id=pr.site_id,
        github_pr_number=pr.github_pr_number,
        github_pr_url=pr.github_pr_url,
        branch_name=pr.branch_name,
        status=pr.status.value,
        created_at=pr.created_at.isoformat(),
        merged_at=pr.merged_at.isoformat() if pr.merged_at else None,
        error_message=pr.error_message,
    )
