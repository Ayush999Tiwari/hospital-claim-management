
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.services.audit_service import log_action
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permissions
from app.models import User, Claim, DoctorApproval

router = APIRouter(prefix="/doctor-approvals", tags=["Doctor Approvals"])


class ApprovalCreate(BaseModel):
    claim_id: UUID
    doctor_id: UUID
    requested_action: str = "APPROVE_CLAIM"


class ApprovalDecision(BaseModel):
    decision: str = Field(
        pattern="^(APPROVED|REJECTED|CORRECTION_REQUIRED)$"
    )
    doctor_comment: str | None = None


def user_has_role(user: User, role_name: str) -> bool:
    return any(role.name == role_name for role in user.roles)


def approval_response(item: DoctorApproval):
    return {
        "id": str(item.id),
        "claim_id": str(item.claim_id),
        "doctor_id": str(item.doctor_id),
        "requested_by_id": (
            str(item.requested_by_id) if item.requested_by_id else None
        ),
        "requested_action": item.requested_action,
        "decision": item.decision,
        "doctor_comment": item.doctor_comment,
        "requested_at": item.requested_at,
        "reviewed_at": item.reviewed_at,
    }


@router.post("/", status_code=201)
def create_doctor_approval(
    payload: ApprovalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("claims:update")),
):
    claim = db.query(Claim).filter(
        Claim.id == payload.claim_id
    ).first()

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    doctor = (
        db.query(User)
        .options(joinedload(User.roles))
        .filter(
            User.id == payload.doctor_id,
            User.is_active.is_(True),
        )
        .first()
    )

    if not doctor or not user_has_role(doctor, "Treating Doctor"):
        raise HTTPException(
            status_code=400,
            detail="Selected user is not an active Treating Doctor",
        )

    approval = DoctorApproval(
        claim_id=str(claim.id),
        doctor_id=str(doctor.id),
        requested_by_id=str(current_user.id),
        requested_action=payload.requested_action,
        decision="PENDING",
    )

    db.add(approval)

    log_action(
        db=db,
        actor=current_user,
        action="DOCTOR_APPROVAL_REQUESTED",
        entity_type="CLAIM",
        entity_id=str(claim.id),
        description=f"Doctor approval requested from {doctor.full_name}",
        metadata={"doctor_id": str(doctor.id)},
    )

    db.commit()
    db.refresh(approval)

    return approval_response(approval)


@router.get("/mine")
def get_my_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not user_has_role(current_user, "Treating Doctor"):
        raise HTTPException(
            status_code=403,
            detail="Treating Doctor access required",
        )

    approvals = (
        db.query(DoctorApproval)
        .filter(DoctorApproval.doctor_id == str(current_user.id))
        .order_by(DoctorApproval.requested_at.desc())
        .all()
    )

    return [approval_response(item) for item in approvals]


@router.patch("/{approval_id}/decision")
def decide_approval(
    approval_id: UUID,
    payload: ApprovalDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not user_has_role(current_user, "Treating Doctor"):
        raise HTTPException(
            status_code=403,
            detail="Treating Doctor access required",
        )

    approval = db.query(DoctorApproval).filter(
        DoctorApproval.id == approval_id
    ).first()

    if not approval:
        raise HTTPException(
            status_code=404,
            detail="Approval request not found",
        )

    if str(approval.doctor_id) != str(current_user.id):
        raise HTTPException(
            status_code=403,
            detail="You cannot review another doctor's request",
        )

    if approval.decision != "PENDING":
        raise HTTPException(
            status_code=409,
            detail="This request has already been reviewed",
        )

    approval.decision = payload.decision
    approval.doctor_comment = payload.doctor_comment
    approval.reviewed_at = datetime.now(timezone.utc)

    log_action(
        db=db,
        actor=current_user,
        action=f"DOCTOR_{payload.decision}",
        entity_type="CLAIM",
        entity_id=str(approval.claim_id),
        description=payload.doctor_comment,
        metadata={"approval_id": str(approval.id)},
    )

    db.commit()
    db.refresh(approval)

    return approval_response(approval)
