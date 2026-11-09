
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Claim, Document


STORAGE_ROOT = Path(__file__).resolve().parents[2] / "private_uploads"

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_FILES = {
    ".pdf": ("application/pdf", b"%PDF-"),
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
}


def serialize_document(document: Document) -> dict:
    return {
        "id": document.id,
        "claim_id": document.claim_id,
        "uploaded_by": document.uploaded_by,
        "uploaded_by_name": document.uploader.full_name,
        "original_filename": document.original_filename,
        "mime_type": document.mime_type,
        "file_size": document.file_size,
        "document_type": document.document_type,
        "classification_status": document.classification_status,
        "created_at": document.created_at,
        "updated_at": document.updated_at,
    }


def get_claim(db: Session, claim_id: UUID):
    claim = db.scalar(
        select(Claim).where(Claim.id == claim_id)
    )

    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found",
        )

    return claim


def save_document(
    db: Session,
    claim_id: UUID,
    user_id: UUID,
    file: UploadFile,
    document_type: str | None = None,
):
    get_claim(db, claim_id)

    extension = Path(file.filename or "").suffix.lower()

    if extension not in ALLOWED_FILES:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPG, JPEG and PNG files are allowed",
        )

    expected_mime, signature = ALLOWED_FILES[extension]

    if file.content_type != expected_mime:
        raise HTTPException(
            status_code=400,
            detail="File extension and content type do not match",
        )

    if document_type and len(document_type) > 80:
        raise HTTPException(
            status_code=400,
            detail="Document type cannot exceed 80 characters",
        )

    contents = file.file.read(MAX_FILE_SIZE + 1)

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty",
        )

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum file size is 10 MB",
        )

    if not contents.startswith(signature):
        raise HTTPException(
            status_code=400,
            detail="Invalid file content",
        )

    document_id = uuid4()
    stored_filename = f"{document_id}{extension}"

    relative_key = (
        Path("claims") / str(claim_id) / stored_filename
    )

    file_path = STORAGE_ROOT / relative_key

    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(contents)

    document = Document(
        id=document_id,
        claim_id=claim_id,
        uploaded_by=user_id,
        original_filename=Path(file.filename or "upload").name,
        storage_key=relative_key.as_posix(),
        mime_type=expected_mime,
        file_size=len(contents),
        document_type=document_type,
        classification_status="PENDING",
    )

    try:
        db.add(document)
        db.commit()

        document = db.scalar(
            select(Document)
            .options(joinedload(Document.uploader))
            .where(Document.id == document_id)
        )

        return serialize_document(document)

    except Exception:
        db.rollback()
        file_path.unlink(missing_ok=True)
        raise


def get_claim_documents(db: Session, claim_id: UUID):
    get_claim(db, claim_id)

    query = (
        select(Document)
        .options(joinedload(Document.uploader))
        .where(Document.claim_id == claim_id)
        .order_by(Document.created_at.desc())
    )

    documents = db.scalars(query).all()

    return [
        serialize_document(document)
        for document in documents
    ]


def get_document(db: Session, document_id: UUID):
    document = db.scalar(
        select(Document).where(Document.id == document_id)
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    root = STORAGE_ROOT.resolve()
    file_path = (root / document.storage_key).resolve()

    if not file_path.is_relative_to(root) or not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Stored document not found",
        )

    return document, file_path
