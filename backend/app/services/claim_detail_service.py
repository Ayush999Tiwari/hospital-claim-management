from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Claim,
    Patient,
    Admission,
    Insurer,
    TPA,
    ClaimChecklistItem,
    ChecklistRule,
)


def get_claim_detail(db: Session, claim_id: UUID):

    claim = db.scalar(
        select(Claim).where(Claim.id == claim_id)
    )

    if not claim:
        return None

    admission = db.get(Admission, claim.admission_id)
    patient = db.get(Patient, admission.patient_id)

    insurer = db.get(Insurer, claim.insurer_id)

    tpa = (
        db.get(TPA, claim.tpa_id)
        if claim.tpa_id
        else None
    )

    checklist_rows = db.execute(
        select(ClaimChecklistItem, ChecklistRule)
        .join(
            ChecklistRule,
            ClaimChecklistItem.rule_id == ChecklistRule.id,
        )
        .where(ClaimChecklistItem.claim_id == claim.id)
    ).all()

    checklist = []

    for item, rule in checklist_rows:
        checklist.append({
            "id": item.id,
            "document_type": rule.document_type,
            "procedure_name": rule.procedure_name,
            "is_mandatory": rule.is_mandatory,
            "status": item.status,
            "is_verified": item.is_verified,
            "document_id": item.document_id,
        })

    return {
        "id": claim.id,
        "claim_number": claim.claim_number,
        "status": claim.status,
        "requested_amount": claim.requested_amount,
        "approved_amount": claim.approved_amount,
        "created_at": claim.created_at,
        "patient": patient,
        "admission": admission,
        "insurer_name": insurer.name,
        "tpa_name": tpa.name if tpa else None,
        "checklist": checklist,
    }