from uuid import UUID, uuid4
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.claim import Claim
from app.models.admission import Admission
from app.models.insurer import Insurer
from app.models.tpa import TPA
from app.schemas.claim import ClaimCreate


def get_claims(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    status: str | None = None,
):
    query = select(Claim).order_by(Claim.created_at.desc())

    if status:
        query = query.where(Claim.status == status)

    query = query.offset(skip).limit(limit)

    return db.scalars(query).all()


def get_claim_by_id(db: Session, claim_id: UUID):
    query = select(Claim).where(Claim.id == claim_id)
    return db.scalar(query)


def create_claim(db: Session, payload: ClaimCreate) -> Claim:
    # Validate admission
    admission = db.scalar(
        select(Admission).where(
            Admission.id == payload.admission_id
        )
    )

    if not admission:
        raise ValueError("Selected admission does not exist.")

    # Validate insurer
    insurer = db.scalar(
        select(Insurer).where(
            Insurer.id == payload.insurer_id
        )
    )

    if not insurer:
        raise ValueError("Selected insurer does not exist.")

    if not insurer.is_active:
        raise ValueError("Selected insurer is inactive.")

    # Validate optional TPA
    if payload.tpa_id:
        tpa = db.scalar(
            select(TPA).where(TPA.id == payload.tpa_id)
        )

        if not tpa:
            raise ValueError("Selected TPA does not exist.")

        if not tpa.is_active:
            raise ValueError("Selected TPA is inactive.")

    # Generate a unique claim number
    year = datetime.now(timezone.utc).year
    claim_number = f"CLM-{year}-{uuid4().hex[:8].upper()}"

    claim = Claim(
        claim_number=claim_number,
        admission_id=payload.admission_id,
        insurer_id=payload.insurer_id,
        tpa_id=payload.tpa_id,
        requested_amount=payload.requested_amount,
        status="DRAFT",
    )

    db.add(claim)

    try:
        db.commit()
        db.refresh(claim)
    except Exception:
        db.rollback()
        raise

    return claim