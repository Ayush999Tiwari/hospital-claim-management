
from io import BytesIO
from pathlib import Path

import fitz
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permissions
from app.models import Claim, Document, User
from app.services.audit_service import log_action

router = APIRouter(prefix="/claims", tags=["PDF Packets"])

BACKEND_DIR = Path(__file__).resolve().parents[3]
UPLOAD_DIR = (BACKEND_DIR / "private_uploads").resolve()

PATH_FIELDS = (
    "storage_path",
    "file_path",
    "stored_path",
    "file_key",
    "path",
)


def get_document_path(document):
    for field in PATH_FIELDS:
        if hasattr(document, field):
            value = getattr(document, field)
            if value:
                path = Path(value)
                if not path.is_absolute():
                    path = UPLOAD_DIR / path

                resolved = path.resolve()

                if resolved.is_relative_to(UPLOAD_DIR) and resolved.is_file():
                    return resolved

    return None


@router.get("/{claim_id}/pdf-packet")
def generate_pdf_packet(
    claim_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("documents:download")
    ),
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()

    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    documents = (
        db.query(Document)
        .filter(Document.claim_id == claim_id)
        .order_by(Document.created_at.asc())
        .all()
    )

    if not documents:
        raise HTTPException(status_code=404, detail="No documents found")

    merged = fitz.open()
    included = 0
    skipped = []

    for document in documents:
        path = get_document_path(document)

        if not path:
            skipped.append(str(document.id))
            continue

        try:
            if path.suffix.lower() == ".pdf":
                source = fitz.open(str(path))
                merged.insert_pdf(source)
                source.close()

            elif path.suffix.lower() in (".jpg", ".jpeg", ".png"):
                source = fitz.open(str(path))
                pdf_bytes = source.convert_to_pdf()
                source.close()

                image_pdf = fitz.open("pdf", pdf_bytes)
                merged.insert_pdf(image_pdf)
                image_pdf.close()

            else:
                skipped.append(str(document.id))
                continue

            included += 1

        except Exception:
            skipped.append(str(document.id))

    if included == 0:
        merged.close()
        raise HTTPException(
            status_code=422,
            detail="No supported documents could be added to the PDF packet",
        )

    output = BytesIO(merged.tobytes(garbage=4, deflate=True))
    merged.close()
    output.seek(0)

    log_action(
        db=db,
        actor=current_user,
        action="PDF_PACKET_GENERATED",
        entity_type="CLAIM",
        entity_id=str(claim.id),
        description=f"Generated PDF packet with {included} documents",
        metadata={
            "included_documents": included,
            "skipped_document_ids": skipped,
        },
    )
    db.commit()

    filename = f"{claim.claim_number}-packet.pdf"

    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Included-Documents": str(included),
            "X-Skipped-Documents": str(len(skipped)),
        },
    )
