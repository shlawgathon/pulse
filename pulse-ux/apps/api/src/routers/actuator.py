"""
Actuator router for public endpoints used by the injected script.

These endpoints do NOT require authentication - they use the site's
public key for identification via the X-Public-Key header.

Endpoints:
- POST /assign: Get variant assignments for a visitor
- POST /track/impression: Track variant impressions
- POST /track/conversion: Track conversion events
"""

from fastapi import APIRouter, HTTPException, Header, status
from pydantic import BaseModel, Field

from src.services.actuator_service import actuator_service

router = APIRouter()


# Request/Response schemas
class AssignRequest(BaseModel):
    """Request for variant assignment."""

    visitor_id: str = Field(..., description="Visitor's unique identifier")
    url: str = Field(..., description="Current page URL")
    user_agent: str | None = Field(None, description="Visitor's user agent")
    referrer: str | None = Field(None, description="Referring URL")


class DOMPatchResponse(BaseModel):
    """DOM patch to apply."""

    action: str
    selector: str
    value: str
    property_name: str | None = None


class VariantAssignment(BaseModel):
    """Experiment assignment with patches."""

    experiment_id: str
    variant_id: str
    is_control: bool
    patches: list[DOMPatchResponse]


class AssignResponse(BaseModel):
    """Response containing variant assignments."""

    visitor_id: str
    assignments: list[VariantAssignment]


class ImpressionRequest(BaseModel):
    """Impression tracking request."""

    visitor_id: str = Field(..., description="Visitor's unique identifier")
    experiment_id: str = Field(..., description="Experiment ID")
    variant_id: str = Field(..., description="Variant ID")


class ConversionRequest(BaseModel):
    """Conversion tracking request."""

    visitor_id: str = Field(..., description="Visitor's unique identifier")
    experiment_id: str = Field(..., description="Experiment ID")
    variant_id: str = Field(..., description="Variant ID")
    event_name: str | None = Field("conversion", description="Event name")
    metadata: dict | None = Field(None, description="Additional event data")


@router.post("/assign", response_model=AssignResponse)
async def assign_variant(
    request: AssignRequest,
    x_public_key: str = Header(..., alias="X-Public-Key"),
) -> AssignResponse:
    """
    Get variant assignments for a visitor.

    This is called by the actuator script on page load to determine
    which experiments apply and what variant to show.

    Args:
        request: Assignment request with visitor info.
        x_public_key: Site's public key from header.

    Returns:
        Visitor ID and list of variant assignments with patches.

    Raises:
        HTTPException: If site not found.
    """
    result = await actuator_service.get_experiments_for_visitor(
        public_key=x_public_key,
        visitor_id=request.visitor_id,
        url=request.url,
        user_agent=request.user_agent,
        referrer=request.referrer,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found",
        )

    return AssignResponse(
        visitor_id=result["visitor_id"],
        assignments=[
            VariantAssignment(
                experiment_id=a["experiment_id"],
                variant_id=a["variant_id"],
                is_control=a["is_control"],
                patches=[
                    DOMPatchResponse(
                        action=p["action"],
                        selector=p["selector"],
                        value=p["value"],
                        property_name=p.get("property_name"),
                    )
                    for p in a["patches"]
                ],
            )
            for a in result["assignments"]
        ],
    )


@router.post("/track/impression", status_code=status.HTTP_204_NO_CONTENT)
async def track_impression(
    request: ImpressionRequest,
    x_public_key: str | None = Header(None, alias="X-Public-Key"),
) -> None:
    """
    Track an impression event.

    Called when a visitor sees a variant. Uses sendBeacon on the
    client side for reliable delivery even when page unloads.

    Args:
        request: Impression data.
        x_public_key: Site's public key (optional for beacon requests).
    """
    await actuator_service.track_impression(
        visitor_id=request.visitor_id,
        experiment_id=request.experiment_id,
        variant_id=request.variant_id,
    )


@router.post("/track/conversion", status_code=status.HTTP_204_NO_CONTENT)
async def track_conversion(
    request: ConversionRequest,
    x_public_key: str | None = Header(None, alias="X-Public-Key"),
) -> None:
    """
    Track a conversion event.

    Called when a visitor completes a conversion goal.

    Args:
        request: Conversion data.
        x_public_key: Site's public key (optional for beacon requests).
    """
    await actuator_service.track_conversion(
        visitor_id=request.visitor_id,
        experiment_id=request.experiment_id,
        variant_id=request.variant_id,
        event_name=request.event_name,
        metadata=request.metadata,
    )
