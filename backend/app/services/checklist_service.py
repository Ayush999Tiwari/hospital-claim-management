
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models import (
    Claim,
    Insurer,
    ChecklistRule,
    ClaimChecklistItem,
    Document,
    User,
)
from app.services.audit_service import log_action


def create_checklist_rule(db: Session, data):
    insurer = db.get(Insurer, data.insurer_id)

    if not insurer or not insurer.is_active:
        raise HTTPException(status_code=404, detail="Active insurer not found")

    rule = ChecklistRule(
        insurer_id=data.insurer_id,
        procedure_name=data.procedure_name.strip(),
        document_type=data.document_type.strip(),
        is_mandatory=data.is_mandatory,
    )

    try:
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A checklist rule already exists for this insurer, procedure and document type",
        )


def list_checklist_rules(
    db: Session,
    insurer_id: UUID | None = None,
    procedure_name: str | None = None,
    is_active: bool | None = None,
):
    query = select(ChecklistRule).order_by(ChecklistRule.created_at.desc())

    if insurer_id:
        query = query.where(ChecklistRule.insurer_id == insurer_id)

    if procedure_name:
        query = query.where(
            ChecklistRule.procedure_name.ilike(procedure_name.strip())
        )

    if is_active is not None:
        query = query.where(ChecklistRule.is_active == is_active)

    return db.scalars(query).all()


def generate_claim_checklist(db: Session, claim_id: UUID):
    claim = db.scalar(
        select(Claim)
        .options(joinedload(Claim.admission))
        .where(Claim.id == claim_id)
    )

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    rules = db.scalars(
        select(ChecklistRule).where(
            ChecklistRule.insurer_id == claim.insurer_id,
            ChecklistRule.procedure_name == claim.admission.procedure_name,
            ChecklistRule.is_active.is_(True),
        )
    ).all()

    if not rules:
        raise HTTPException(
            status_code=404,
            detail="No active checklist rules found for this insurer and procedure",
        )

    existing_rule_ids = set(
        db.scalars(
            select(ClaimChecklistItem.rule_id).where(
                ClaimChecklistItem.claim_id == claim_id
            )
        ).all()
    )

    new_items = [
        ClaimChecklistItem(
            claim_id=claim_id,
            rule_id=rule.id,
            status="MISSING",
            is_verified=False,
        )
        for rule in rules
        if rule.id not in existing_rule_ids
    ]

    if new_items:
        db.add_all(new_items)
        db.commit()

    return list_claim_checklist(db, claim_id)


def list_claim_checklist(db: Session, claim_id: UUID):
    claim = db.get(Claim, claim_id)

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    query = (
        select(ClaimChecklistItem)
        .options(
            joinedload(ClaimChecklistItem.rule),
            joinedload(ClaimChecklistItem.document),
        )
        .where(ClaimChecklistItem.claim_id == claim_id)
        .order_by(ClaimChecklistItem.created_at.asc())
    )

    return db.scalars(query).all()


def update_checklist_item(
    db: Session,
    item_id: UUID,
    document_id: UUID | None = None,
    is_verified: bool | None = None,
    actor: User | None = None,
):
    item = db.scalar(
        select(ClaimChecklistItem)
        .options(
            joinedload(ClaimChecklistItem.rule),
            joinedload(ClaimChecklistItem.document),
        )
        .where(ClaimChecklistItem.id == item_id)
    )

    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    # Capture previous state before applying changes.
    old_document_id = str(item.document_id) if item.document_id else None
    old_is_verified = item.is_verified

    if document_id is not None:
        document = db.get(Document, document_id)

        if not document or document.claim_id != item.claim_id:
            raise HTTPException(
                status_code=400,
                detail="Document does not belong to this claim",
            )

        item.document_id = document_id
        item.status = "UPLOADED"
        item.is_verified = False

    if is_verified is not None:
        if is_verified and not item.document_id:
            raise HTTPException(
                status_code=400,
                detail="Upload a document before verifying this checklist item",
            )

        item.is_verified = is_verified
        item.status = (
            "VERIFIED"
            if is_verified
            else ("UPLOADED" if item.document_id else "MISSING")
        )

    try:
        if actor:
            if item.is_verified != old_is_verified:
                action = (
                    "CHECKLIST_ITEM_VERIFIED"
                    if item.is_verified
                    else "CHECKLIST_ITEM_UNVERIFIED"
                )
                description = (
                    "Checklist document verified by user"
                    if item.is_verified
                    else "Checklist verification removed"
                )

            elif (
                item.document_id is not None
                and str(item.document_id) != old_document_id
            ):
                action = "CHECKLIST_DOCUMENT_ATTACHED"
                description = "Document attached to checklist item"

            else:
                action = "CHECKLIST_ITEM_UPDATED"
                description = "Checklist item updated"

            log_action(
                db=db,
                actor=actor,
                action=action,
                entity_type="CLAIM",
                entity_id=str(item.claim_id),
                description=description,
                metadata={
                    "checklist_item_id": str(item.id),
                    "previous_document_id": old_document_id,
                    "document_id": (
                        str(item.document_id)
                        if item.document_id
                        else None
                    ),
                    "previous_is_verified": old_is_verified,
                    "is_verified": item.is_verified,
                    "status": item.status,
                },
            )

        db.commit()

        return db.scalar(
            select(ClaimChecklistItem)
            .options(
                joinedload(ClaimChecklistItem.rule),
                joinedload(ClaimChecklistItem.document),
            )
            .where(ClaimChecklistItem.id == item_id)
        )

    except Exception:
        db.rollback()
        raise


def update_checklist_rule_status(
    db: Session,
    rule_id: UUID,
    is_active: bool,
):
    rule = db.get(ChecklistRule, rule_id)

    if not rule:
        raise HTTPException(
            status_code=404,
            detail="Checklist rule not found",
        )

    rule.is_active = is_active

    try:
        db.commit()
        db.refresh(rule)
        return rule
    except Exception:
        db.rollback()
        raise


def suggest_checklist_slots(
    db: Session,
    claim_id: UUID,
    detected_document_type: str | None,
):
    """
    Return checklist slots for a claim and indicate
    which slots match the classified document type.
    """

    claim = db.get(Claim, claim_id)

    if not claim:
        raise HTTPException(
            status_code=404,
            detail="Claim not found",
        )

    items = db.scalars(
        select(ClaimChecklistItem)
        .options(joinedload(ClaimChecklistItem.rule))
        .where(ClaimChecklistItem.claim_id == claim_id)
        .order_by(ClaimChecklistItem.created_at.asc())
    ).all()

    normalized_type = (
        detected_document_type.strip().casefold()
        if detected_document_type
        else None
    )

    suggestions = []

    for item in items:
        rule_type = item.rule.document_type.strip().casefold()

        suggestions.append({
            "checklist_item_id": item.id,
            "rule_id": item.rule_id,
            "document_type": item.rule.document_type,
            "is_mandatory": item.rule.is_mandatory,
            "status": item.status,
            "is_verified": item.is_verified,
            "already_has_document": item.document_id is not None,
            "suggested": (
                normalized_type is not None
                and normalized_type == rule_type
            ),
        })

    return suggestions
