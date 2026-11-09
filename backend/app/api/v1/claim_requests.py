from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permissions
from app.models import User
from app.schemas.claim_request import (
    ClaimRequestCreate,
    ClaimRequestUpdate,
    ClaimRequestResponse,
    ClaimRequestInboxResponse,
)
from app.services.claim_request_service import (
    create_claim_request,
    list_claim_requests,
    get_claim_request,
    update_claim_request,
    list_all_claim_requests,
)


router = APIRouter(tags=["Claim Requests"])


@router.post(
    "/claims/{claim_id}/requests",
    response_model=ClaimRequestResponse,
    status_code=201,
)
def create_request(
    claim_id: UUID,
    payload: ClaimRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("queries:manage")),
):
    return create_claim_request(
        db=db,
        claim_id=claim_id,
        request_type=payload.request_type,
        requested_amount=payload.requested_amount,
    )


@router.get(
    "/claims/{claim_id}/requests",
    response_model=list[ClaimRequestResponse],
)
def get_requests(
    claim_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("queries:read")),
):
    return list_claim_requests(
        db=db,
        claim_id=claim_id,
    )


@router.get(
    "/claim-requests/{request_id}",
    response_model=ClaimRequestResponse,
)
def get_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("queries:read")),
):
    return get_claim_request(
        db=db,
        request_id=request_id,
    )


@router.patch(
    "/claim-requests/{request_id}",
    response_model=ClaimRequestResponse,
)
def patch_request(
    request_id: UUID,
    payload: ClaimRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("queries:manage")),
):
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided",
        )

    return update_claim_request(
        db=db,
        request_id=request_id,
        update_data=update_data,
    )

@router.get(
    "/claim-requests",
    response_model=list[ClaimRequestInboxResponse],
)
def get_all_claim_requests(
    status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("queries:read")),
):
    return list_all_claim_requests(
        db=db,
        status=status,
        limit=limit,
    )