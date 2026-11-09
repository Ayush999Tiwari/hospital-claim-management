from uuid import UUID
from typing import Any

from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permissions
from app.models import User

from app.schemas.document import DocumentResponse

from app.services.audit_service import log_action

from app.services.document_classification_service import (
    classify_document_text,
)
from app.services.checklist_service import (
    suggest_checklist_slots,
)
from app.services.document_service import (
    save_document,
    get_claim_documents,
    get_document,
)
from app.services.ocr_service import extract_document_text


claims_documents_router = APIRouter(
    prefix="/claims",
    tags=["Claim Documents"],
)

documents_router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


def build_field_evidence(
    extracted_fields: dict[str, Any],
    extracted_text: str,
) -> dict[str, dict[str, Any]]:
    """
    Evidence is only returned when the extracted value can be located
    in the OCR text. We do not fabricate a source snippet.
    """
    evidence: dict[str, dict[str, Any]] = {}

    text = extracted_text or ""
    lowered_text = text.lower()

    for field_name, field_value in extracted_fields.items():
        value = "" if field_value is None else str(field_value).strip()

        if not value:
            evidence[field_name] = {
                "snippet": None,
                "matched": False,
            }
            continue

        position = lowered_text.find(value.lower())

        if position == -1:
            evidence[field_name] = {
                "snippet": None,
                "matched": False,
            }
            continue

        start = max(0, position - 90)
        end = min(len(text), position + len(value) + 90)

        snippet = text[start:end].strip()

        if start > 0:
            snippet = "..." + snippet

        if end < len(text):
            snippet = snippet + "..."

        evidence[field_name] = {
            "snippet": snippet,
            "matched": True,
        }

    return evidence


@claims_documents_router.post(
    "/{claim_id}/documents",
    response_model=DocumentResponse,
    status_code=201,
)
def upload_claim_document(
    claim_id: UUID,
    file: UploadFile = File(...),
    document_type: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("documents:upload")
    ),
):
    document = save_document(
        db=db,
        claim_id=claim_id,
        user_id=current_user.id,
        file=file,
        document_type=document_type,
    )

    log_action(
        db=db,
        actor=current_user,
        action="DOCUMENT_UPLOADED",
        entity_type="DOCUMENT",
        entity_id=str(document.id),
        description=f"Uploaded {document.original_filename}",
        metadata={
            "claim_id": str(claim_id),
            "document_type": document.document_type,
        },
    )

    db.commit()
    db.refresh(document)

    return document


@claims_documents_router.get(
    "/{claim_id}/documents",
    response_model=list[DocumentResponse],
)
def list_claim_documents(
    claim_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("documents:read")
    ),
):
    return get_claim_documents(
        db=db,
        claim_id=claim_id,
    )


@documents_router.get("/{document_id}/download")
def download_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("documents:download")
    ),
):
    document, file_path = get_document(
        db=db,
        document_id=document_id,
    )

    log_action(
        db=db,
        actor=current_user,
        action="DOCUMENT_DOWNLOADED",
        entity_type="DOCUMENT",
        entity_id=str(document.id),
        description=f"Downloaded {document.original_filename}",
    )

    db.commit()

    return FileResponse(
        path=file_path,
        media_type=document.mime_type,
        filename=document.original_filename,
        headers={"X-Content-Type-Options": "nosniff"},
    )


@documents_router.post("/{document_id}/process")
def process_document_ocr(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("documents:process")
    ),
):
    document, file_path = get_document(
        db=db,
        document_id=document_id,
    )

    try:
        # 1. OCR
        ocr_result = extract_document_text(
            file_path=file_path,
            mime_type=document.mime_type,
        )

        extracted_text = ocr_result["text"] or ""
        document.extracted_text = extracted_text

        # 2. Classification and field extraction
        classification_result = classify_document_text(
            extracted_text
        )

        extracted_fields = (
            classification_result.get("extracted_fields") or {}
        )

        # 3. Evidence snippets from the OCR source text
        field_evidence = build_field_evidence(
            extracted_fields=extracted_fields,
            extracted_text=extracted_text,
        )

        # 4. Review status
        ocr_confidence = ocr_result.get("confidence")
        review_required = classification_result.get(
            "review_required",
            False,
        )

        if not extracted_text.strip():
            final_status = "REVIEW_REQUIRED"
        elif (
            ocr_confidence is not None
            and ocr_confidence < 0.85
        ):
            final_status = "REVIEW_REQUIRED"
        elif review_required:
            final_status = "REVIEW_REQUIRED"
        else:
            final_status = "EXTRACTED"

        document.document_type = classification_result.get(
            "document_type"
        )
        document.classification_status = final_status

        document.extracted_fields = extracted_fields
        document.extraction_evidence = field_evidence

        # Every new processing run requires a fresh human review.
        document.confirmed_fields = None
        document.extraction_review_status = "PENDING"

        # 5. Checklist suggestions
        checklist_suggestions = suggest_checklist_slots(
            db=db,
            claim_id=document.claim_id,
            detected_document_type=document.document_type,
        )

        # 6. Audit
        log_action(
            db=db,
            actor=current_user,
            action="DOCUMENT_PROCESSED",
            entity_type="DOCUMENT",
            entity_id=str(document.id),
            description="Document OCR, classification and extraction completed",
            metadata={
                "claim_id": str(document.claim_id),
                "document_type": document.document_type,
                "classification_status": final_status,
                "ocr_method": ocr_result.get("method"),
                "review_required": final_status == "REVIEW_REQUIRED",
                "extracted_field_count": len(extracted_fields),
            },
        )

        db.commit()
        db.refresh(document)

        return {
            "document_id": str(document.id),
            "original_filename": document.original_filename,
            "document_type": document.document_type,
            "classification_status": document.classification_status,
            "method": ocr_result.get("method"),
            "ocr_confidence": ocr_confidence,
            "classification_confidence": classification_result.get(
                "confidence",
                0,
            ),
            "review_required": final_status == "REVIEW_REQUIRED",
            "matched_keywords": classification_result.get(
                "matched_keywords",
                [],
            ),
            "page_count": ocr_result.get("page_count", 0),
            "extracted_fields": document.extracted_fields,
            "field_evidence": document.extraction_evidence,
            "confirmed_fields": document.confirmed_fields,
            "extraction_review_status": document.extraction_review_status,
            "checklist_suggestions": checklist_suggestions,
            "extracted_text": extracted_text,
        }

    except (ValueError, FileNotFoundError) as exc:
        db.rollback()
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except Exception:
        db.rollback()
        raise


@documents_router.patch("/{document_id}/extractions/confirm")
def confirm_document_extractions(
    document_id: UUID,
    payload: dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("documents:process")
    ),
):
    """
    Persist only the values explicitly reviewed by the desk user.
    This does not automatically modify claim or admission records.
    """
    document, _ = get_document(
        db=db,
        document_id=document_id,
    )

    fields = payload.get("fields")

    if not isinstance(fields, dict) or not fields:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one reviewed field.",
        )

    extracted_fields = document.extracted_fields or {}

    unknown_fields = set(fields.keys()) - set(extracted_fields.keys())

    if unknown_fields:
        raise HTTPException(
            status_code=422,
            detail=(
                "Unknown extracted fields: "
                + ", ".join(sorted(unknown_fields))
            ),
        )

    # Store the reviewed values separately from AI suggestions.
    document.confirmed_fields = fields
    document.extraction_review_status = "CONFIRMED"

    log_action(
        db=db,
        actor=current_user,
        action="DOCUMENT_EXTRACTIONS_CONFIRMED",
        entity_type="DOCUMENT",
        entity_id=str(document.id),
        description="Desk user reviewed and confirmed extracted document fields",
        metadata={
            "claim_id": str(document.claim_id),
            "confirmed_fields": fields,
        },
    )

    db.commit()
    db.refresh(document)

    return {
        "document_id": str(document.id),
        "extraction_review_status": document.extraction_review_status,
        "confirmed_fields": document.confirmed_fields,
        "message": "Reviewed fields saved successfully.",
    }