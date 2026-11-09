
from sqlalchemy import func
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permissions
from app.models import Claim, User

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/cfo")
def get_cfo_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("reports:read")),
):
    total_claims = db.query(func.count(Claim.id)).scalar() or 0

    requested_total = db.query(
        func.coalesce(func.sum(Claim.requested_amount), 0)
    ).scalar()

    approved_total = db.query(
        func.coalesce(func.sum(Claim.approved_amount), 0)
    ).scalar()

    status_rows = (
        db.query(Claim.status, func.count(Claim.id))
        .group_by(Claim.status)
        .all()
    )

    return {
        "total_claims": total_claims,
        "requested_amount": float(requested_total),
        "approved_amount": float(approved_total),
        "pending_amount": float(requested_total - approved_total),
        "claims_by_status": {
            status: count for status, count in status_rows
        },
        "deductions_by_reason": [],
        "note": "Deduction reasons are not currently stored in the claim schema.",
    }
