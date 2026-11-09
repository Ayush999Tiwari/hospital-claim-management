from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.database import SessionLocal
from app.models import Claim, Admission, Patient

db = SessionLocal()

try:
    claims = db.scalars(
        select(Claim).options(
            joinedload(Claim.admission).joinedload(Admission.patient)
        ).order_by(Claim.claim_number)
    ).unique().all()

    for claim in claims:
        print(
            f"{claim.claim_number} | "
            f"{claim.admission.patient.full_name} | "
            f"{claim.status} | "
            f"₹{claim.requested_amount}"
        )

    print(f"\nTotal claims: {len(claims)}")

finally:
    db.close()