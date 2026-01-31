"""
Experiments router for A/B test management.

Endpoints:
- POST /: Create a new experiment
- GET /: List experiments with filtering
- GET /{experiment_id}: Get experiment details
- POST /{experiment_id}/activate: Activate an experiment
- POST /{experiment_id}/pause: Pause an experiment
- POST /{experiment_id}/complete: Complete and select winner
- GET /{experiment_id}/comparison: Get side-by-side comparison data
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field

from src.dependencies import get_current_user
from src.models.user import User
from src.models.experiment import ExperimentStatus
from src.services.experiment_service import experiment_service

router = APIRouter()


# Request/Response schemas
class ExperimentCreate(BaseModel):
    """Request body for creating a new experiment."""

    site_id: str = Field(..., description="Site ID for this experiment")
    name: str = Field(..., min_length=1, max_length=200, description="Experiment name")
    description: str | None = Field(None, max_length=2000, description="Experiment description")
    target_url: str = Field(..., description="URL to optimize")
    url_pattern: str | None = Field(None, description="URL pattern for matching (regex)")
    optimization_goal: str | None = Field(None, description="What to optimize for")
    num_variants: int = Field(default=2, ge=1, le=5, description="Number of variants to generate")


class ExperimentResponse(BaseModel):
    """Experiment data returned in responses."""

    id: str
    site_id: str
    name: str
    description: str | None = None
    target_url: str
    url_pattern: str
    status: str
    traffic_allocation: int
    created_at: str
    started_at: str | None = None
    ended_at: str | None = None
    winner_variant_id: str | None = None
    base_screenshot_url: str | None = None


class VariantResponse(BaseModel):
    """Variant data returned in responses."""

    id: str
    name: str
    description: str | None = None
    is_control: bool
    patches: list[dict]
    screenshot_url: str | None = None
    impressions: int
    conversions: int


class ComparisonResponse(BaseModel):
    """Side-by-side comparison data."""

    experiment: ExperimentResponse
    variants: list[VariantResponse]
    ai_analysis: str | None = None


class CompleteRequest(BaseModel):
    """Request body for completing an experiment."""

    winner_variant_id: str = Field(..., description="ID of the winning variant")


@router.post("/", response_model=ExperimentResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_experiment(
    request: ExperimentCreate,
    current_user: User = Depends(get_current_user),
) -> ExperimentResponse:
    """
    Create a new experiment.

    This triggers async variant generation via Firecrawl and Claude.

    Args:
        request: Experiment creation data.
        current_user: The authenticated user.

    Returns:
        Created experiment (variants will be generated asynchronously).
    """
    experiment = await experiment_service.create_experiment(
        site_id=request.site_id,
        created_by=str(current_user.id),
        name=request.name,
        description=request.description,
        target_url=request.target_url,
        url_pattern=request.url_pattern,
        optimization_goal=request.optimization_goal,
        num_variants=request.num_variants,
    )

    return ExperimentResponse(
        id=str(experiment.id),
        site_id=experiment.site_id,
        name=experiment.name,
        description=experiment.description,
        target_url=experiment.target_url,
        url_pattern=experiment.url_pattern,
        status=experiment.status.value,
        traffic_allocation=experiment.traffic_allocation,
        created_at=experiment.created_at.isoformat(),
        started_at=experiment.started_at.isoformat() if experiment.started_at else None,
        ended_at=experiment.ended_at.isoformat() if experiment.ended_at else None,
        winner_variant_id=experiment.winner_variant_id,
        base_screenshot_url=experiment.base_screenshot_url,
    )


@router.get("/", response_model=list[ExperimentResponse])
async def list_experiments(
    current_user: User = Depends(get_current_user),
    site_id: str | None = Query(None, description="Filter by site"),
    status: str | None = Query(None, description="Filter by status"),
) -> list[ExperimentResponse]:
    """
    List experiments with optional filtering.

    Args:
        current_user: The authenticated user.
        site_id: Optional site ID filter.
        status: Optional status filter.

    Returns:
        List of experiments.
    """
    experiments = await experiment_service.list_experiments(
        user_id=str(current_user.id),
        site_id=site_id,
        status=ExperimentStatus(status) if status else None,
    )

    return [
        ExperimentResponse(
            id=str(exp.id),
            site_id=exp.site_id,
            name=exp.name,
            description=exp.description,
            target_url=exp.target_url,
            url_pattern=exp.url_pattern,
            status=exp.status.value,
            traffic_allocation=exp.traffic_allocation,
            created_at=exp.created_at.isoformat(),
            started_at=exp.started_at.isoformat() if exp.started_at else None,
            ended_at=exp.ended_at.isoformat() if exp.ended_at else None,
            winner_variant_id=exp.winner_variant_id,
            base_screenshot_url=exp.base_screenshot_url,
        )
        for exp in experiments
    ]


@router.get("/{experiment_id}", response_model=ExperimentResponse)
async def get_experiment(
    experiment_id: str,
    current_user: User = Depends(get_current_user),
) -> ExperimentResponse:
    """
    Get experiment details.

    Args:
        experiment_id: The experiment's ID.
        current_user: The authenticated user.

    Returns:
        Experiment details.

    Raises:
        HTTPException: If experiment not found.
    """
    experiment = await experiment_service.get_experiment(
        experiment_id=experiment_id,
        user_id=str(current_user.id),
    )

    if experiment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")

    return ExperimentResponse(
        id=str(experiment.id),
        site_id=experiment.site_id,
        name=experiment.name,
        description=experiment.description,
        target_url=experiment.target_url,
        url_pattern=experiment.url_pattern,
        status=experiment.status.value,
        traffic_allocation=experiment.traffic_allocation,
        created_at=experiment.created_at.isoformat(),
        started_at=experiment.started_at.isoformat() if experiment.started_at else None,
        ended_at=experiment.ended_at.isoformat() if experiment.ended_at else None,
        winner_variant_id=experiment.winner_variant_id,
        base_screenshot_url=experiment.base_screenshot_url,
    )


@router.get("/{experiment_id}/variants", response_model=list[VariantResponse])
async def get_experiment_variants(
    experiment_id: str,
    current_user: User = Depends(get_current_user),
) -> list[VariantResponse]:
    """
    Get all variants for an experiment.

    Args:
        experiment_id: The experiment's ID.
        current_user: The authenticated user.

    Returns:
        List of variants.

    Raises:
        HTTPException: If experiment not found.
    """
    # Verify user has access to the experiment
    experiment = await experiment_service.get_experiment(
        experiment_id=experiment_id,
        user_id=str(current_user.id),
    )

    if experiment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")

    variants = await experiment_service.get_experiment_variants(experiment_id)

    return [
        VariantResponse(
            id=str(v.id),
            name=v.name,
            description=v.description,
            is_control=v.is_control,
            patches=[p.model_dump() for p in v.patches],
            screenshot_url=v.screenshot_url,
            impressions=v.impressions,
            conversions=v.conversions,
        )
        for v in variants
    ]


@router.post("/{experiment_id}/activate", response_model=ExperimentResponse)
async def activate_experiment(
    experiment_id: str,
    current_user: User = Depends(get_current_user),
) -> ExperimentResponse:
    """
    Activate an experiment to start collecting data.

    Args:
        experiment_id: The experiment's ID.
        current_user: The authenticated user.

    Returns:
        Updated experiment.

    Raises:
        HTTPException: If experiment not found or cannot be activated.
    """
    experiment = await experiment_service.activate_experiment(
        experiment_id=experiment_id,
        user_id=str(current_user.id),
    )

    if experiment is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Experiment not found or cannot be activated",
        )

    return ExperimentResponse(
        id=str(experiment.id),
        site_id=experiment.site_id,
        name=experiment.name,
        description=experiment.description,
        target_url=experiment.target_url,
        url_pattern=experiment.url_pattern,
        status=experiment.status.value,
        traffic_allocation=experiment.traffic_allocation,
        created_at=experiment.created_at.isoformat(),
        started_at=experiment.started_at.isoformat() if experiment.started_at else None,
        ended_at=experiment.ended_at.isoformat() if experiment.ended_at else None,
        winner_variant_id=experiment.winner_variant_id,
        base_screenshot_url=experiment.base_screenshot_url,
    )


@router.post("/{experiment_id}/pause", response_model=ExperimentResponse)
async def pause_experiment(
    experiment_id: str,
    current_user: User = Depends(get_current_user),
) -> ExperimentResponse:
    """
    Pause an active experiment.

    Args:
        experiment_id: The experiment's ID.
        current_user: The authenticated user.

    Returns:
        Updated experiment.

    Raises:
        HTTPException: If experiment not found or cannot be paused.
    """
    experiment = await experiment_service.pause_experiment(
        experiment_id=experiment_id,
        user_id=str(current_user.id),
    )

    if experiment is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Experiment not found or cannot be paused",
        )

    return ExperimentResponse(
        id=str(experiment.id),
        site_id=experiment.site_id,
        name=experiment.name,
        description=experiment.description,
        target_url=experiment.target_url,
        url_pattern=experiment.url_pattern,
        status=experiment.status.value,
        traffic_allocation=experiment.traffic_allocation,
        created_at=experiment.created_at.isoformat(),
        started_at=experiment.started_at.isoformat() if experiment.started_at else None,
        ended_at=experiment.ended_at.isoformat() if experiment.ended_at else None,
        winner_variant_id=experiment.winner_variant_id,
        base_screenshot_url=experiment.base_screenshot_url,
    )


@router.post("/{experiment_id}/complete", response_model=ExperimentResponse)
async def complete_experiment(
    experiment_id: str,
    request: CompleteRequest,
    current_user: User = Depends(get_current_user),
) -> ExperimentResponse:
    """
    Complete an experiment and select the winner.

    Args:
        experiment_id: The experiment's ID.
        request: The winning variant ID.
        current_user: The authenticated user.

    Returns:
        Updated experiment.

    Raises:
        HTTPException: If experiment not found or cannot be completed.
    """
    experiment = await experiment_service.complete_experiment(
        experiment_id=experiment_id,
        user_id=str(current_user.id),
        winner_variant_id=request.winner_variant_id,
    )

    if experiment is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Experiment not found or cannot be completed",
        )

    return ExperimentResponse(
        id=str(experiment.id),
        site_id=experiment.site_id,
        name=experiment.name,
        description=experiment.description,
        target_url=experiment.target_url,
        url_pattern=experiment.url_pattern,
        status=experiment.status.value,
        traffic_allocation=experiment.traffic_allocation,
        created_at=experiment.created_at.isoformat(),
        started_at=experiment.started_at.isoformat() if experiment.started_at else None,
        ended_at=experiment.ended_at.isoformat() if experiment.ended_at else None,
        winner_variant_id=experiment.winner_variant_id,
        base_screenshot_url=experiment.base_screenshot_url,
    )


@router.get("/{experiment_id}/comparison", response_model=ComparisonResponse)
async def get_comparison(
    experiment_id: str,
    current_user: User = Depends(get_current_user),
) -> ComparisonResponse:
    """
    Get side-by-side comparison data for an experiment.

    Args:
        experiment_id: The experiment's ID.
        current_user: The authenticated user.

    Returns:
        Comparison data including experiment, variants, and AI analysis.

    Raises:
        HTTPException: If experiment not found.
    """
    comparison = await experiment_service.get_comparison(
        experiment_id=experiment_id,
        user_id=str(current_user.id),
    )

    if comparison is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")

    experiment, variants, ai_analysis = comparison

    return ComparisonResponse(
        experiment=ExperimentResponse(
            id=str(experiment.id),
            site_id=experiment.site_id,
            name=experiment.name,
            description=experiment.description,
            target_url=experiment.target_url,
            url_pattern=experiment.url_pattern,
            status=experiment.status.value,
            traffic_allocation=experiment.traffic_allocation,
            created_at=experiment.created_at.isoformat(),
            started_at=experiment.started_at.isoformat() if experiment.started_at else None,
            ended_at=experiment.ended_at.isoformat() if experiment.ended_at else None,
            winner_variant_id=experiment.winner_variant_id,
            base_screenshot_url=experiment.base_screenshot_url,
        ),
        variants=[
            VariantResponse(
                id=str(v.id),
                name=v.name,
                description=v.description,
                is_control=v.is_control,
                patches=[p.model_dump() for p in v.patches],
                screenshot_url=v.screenshot_url,
                impressions=v.impressions,
                conversions=v.conversions,
            )
            for v in variants
        ],
        ai_analysis=ai_analysis,
    )
