from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import (
    Patient,
    Admission,
    Insurer,
    TPA,
    Claim,
    ChecklistRule,
    ClaimChecklistItem,
)

db = SessionLocal()


def get_or_create(model, filters, defaults):
    instance = db.scalar(select(model).filter_by(**filters))

    if instance:
        return instance

    instance = model(**filters, **defaults)
    db.add(instance)
    db.flush()
    return instance


try:
    now = datetime.now(timezone.utc)

    # Insurers
    company_b = get_or_create(
        Insurer, {"name": "Company B"},
        {"is_active": True}
    )

    company_c = get_or_create(
        Insurer, {"name": "Company C"},
        {"is_active": True}
    )

    company_d = get_or_create(
        Insurer, {"name": "Company D"},
        {"is_active": True}
    )

    # TPAs
    tpa_b = get_or_create(
        TPA, {"name": "Company B"},
        {"is_active": True}
    )

    tpa_d = get_or_create(
        TPA, {"name": "Company D"},
        {"is_active": True}
    )

    # Sample claim data
    samples = [
        {
            "claim_number": "CLM-3381",
            "patient_number": "PAT-3381",
            "patient_name": "Rajendra Pawar",
            "admission_number": "ADM-3381",
            "diagnosis": "Gall bladder condition",
            "procedure": "Gall bladder removal",
            "status": "Query",
            "insurer": company_b,
            "tpa": tpa_b,
            "missing_document": "ultrasound_report",
        },
        {
            "claim_number": "CLM-3382",
            "patient_number": "PAT-3382",
            "patient_name": "Sunita Deshmukh",
            "admission_number": "ADM-3382",
            "diagnosis": "Knee joint condition",
            "procedure": "Total knee replacement",
            "status": "Pre-auth sent",
            "insurer": company_c,
            "tpa": None,
            "missing_document": None,
        },
        {
            "claim_number": "CLM-3385",
            "patient_number": "PAT-3385",
            "patient_name": "Imran Shaikh",
            "admission_number": "ADM-3385",
            "diagnosis": "Dengue with low platelets",
            "procedure": "Dengue with low platelets",
            "status": "Enhancement",
            "insurer": company_d,
            "tpa": tpa_d,
            "missing_document": "latest_platelet_count",
        },
    ]

    for item in samples:

        patient = get_or_create(
            Patient,
            {"patient_number": item["patient_number"]},
            {
                "full_name": item["patient_name"],
            }
        )

        admission = get_or_create(
            Admission,
            {"admission_number": item["admission_number"]},
            {
                "patient_id": patient.id,
                "admitted_at": now,
                "primary_diagnosis": item["diagnosis"],
                "procedure_name": item["procedure"],
                "status": "admitted",
            }
        )

        claim = get_or_create(
            Claim,
            {"claim_number": item["claim_number"]},
            {
                "admission_id": admission.id,
                "insurer_id": item["insurer"].id,
                "tpa_id": item["tpa"].id if item["tpa"] else None,
                "status": item["status"],
                "requested_amount": Decimal("85000.00"),
            }
        )

        # Create checklist rule and missing checklist item
        if item["missing_document"]:

            rule = get_or_create(
                ChecklistRule,
                {
                    "insurer_id": item["insurer"].id,
                    "procedure_name": item["procedure"],
                    "document_type": item["missing_document"],
                },
                {
                    "is_mandatory": True,
                    "is_active": True,
                }
            )

            checklist_item = db.scalar(
                select(ClaimChecklistItem).where(
                    ClaimChecklistItem.claim_id == claim.id,
                    ClaimChecklistItem.rule_id == rule.id,
                )
            )

            if not checklist_item:
                db.add(
                    ClaimChecklistItem(
                        claim_id=claim.id,
                        rule_id=rule.id,
                        status="missing",
                        is_verified=False,
                    )
                )

    db.commit()

    print("\nDemo data seeded successfully!")
    print("CLM-3381 | Rajendra Pawar | Query")
    print("CLM-3382 | Sunita Deshmukh | Pre-auth sent")
    print("CLM-3385 | Imran Shaikh | Enhancement")

except Exception as error:
    db.rollback()
    print("Seeding failed:", error)
    raise

finally:
    db.close()