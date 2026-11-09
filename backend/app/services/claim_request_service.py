from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy import select, func
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Claim, ClaimRequest


def create_claim_request(
    db: Session,
    claim_id: UUID,
    request_type: str,
    requested_amount,
):
    # Verify claim exists
    claim = db.scalar(
        select(Claim).where(Claim.id == claim_id)
    )

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    # Generate next sequence number for this request type
    max_sequence = db.scalar(
        select(func.max(ClaimRequest.sequence_number)).where(
            ClaimRequest.claim_id == claim_id,
            ClaimRequest.request_type == request_type,
        )
    )

    next_sequence = (max_sequence or 0) + 1

    claim_request = ClaimRequest(
        claim_id=claim_id,
        request_type=request_type,
        sequence_number=next_sequence,
        status="DRAFT",
        requested_amount=requested_amount,
    )

    try:
        db.add(claim_request)
        db.commit()
        db.refresh(claim_request)
        return claim_request

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Request sequence conflict. Please retry."
        )


def list_claim_requests(db: Session, claim_id: UUID):
    claim = db.scalar(
        select(Claim).where(Claim.id == claim_id)
    )

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    return db.scalars(
        select(ClaimRequest)
        .where(ClaimRequest.claim_id == claim_id)
        .order_by(
            ClaimRequest.request_type,
            ClaimRequest.sequence_number,
        )
    ).all()


def get_claim_request(db: Session, request_id: UUID):
    claim_request = db.scalar(
        select(ClaimRequest).where(ClaimRequest.id == request_id)
    )

    if not claim_request:
        raise HTTPException(status_code=404, detail="Claim request not found")

    return claim_request


def update_claim_request(
    db: Session,
    request_id: UUID,
    update_data: dict,
):
    claim_request = get_claim_request(db, request_id)

    new_status = update_data.get("status")

    if new_status == "SUBMITTED" and claim_request.submitted_at is None:
        claim_request.submitted_at = datetime.now(timezone.utc)

    if new_status in {"QUERY", "APPROVED", "REJECTED"}:
        claim_request.responded_at = datetime.now(timezone.utc)

    if (
        update_data.get("approved_amount") is not None
        and update_data["approved_amount"] > claim_request.requested_amount
    ):
        raise HTTPException(
            status_code=400,
            detail="Approved amount cannot exceed requested amount"
        )

    for field, value in update_data.items():
        setattr(claim_request, field, value)

    try:
        db.commit()
        db.refresh(claim_request)
        return claim_request

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Unable to update claim request"
        )

def list_all_claim_requests(
    db: Session,
    status: str | None = None,
    limit: int = 100,
):
    query = (
        select(ClaimRequest, Claim.claim_number)
        .join(Claim, ClaimRequest.claim_id == Claim.id)
        .order_by(ClaimRequest.created_at.desc())
        .limit(limit)
    )

    if status:
        query = query.where(ClaimRequest.status == status.upper())

    results = db.execute(query).all()

    return [
        {
            "id": request.id,
            "claim_id": request.claim_id,
            "claim_number": claim_number,
            "request_type": request.request_type,
            "sequence_number": request.sequence_number,
            "status": request.status,
            "requested_amount": request.requested_amount,
            "approved_amount": request.approved_amount,
            "insurer_reference": request.insurer_reference,
            "submitted_at": request.submitted_at,
            "responded_at": request.responded_at,
            "created_at": request.created_at,
            "updated_at": request.updated_at,
        }
        for request, claim_number in results
    ]