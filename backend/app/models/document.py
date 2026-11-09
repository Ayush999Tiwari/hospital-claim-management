from uuid import UUID

from sqlalchemy import (
    ForeignKey,
    String,
    BigInteger,
    Text,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class Document(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "documents"

    claim_id: Mapped[UUID] = mapped_column(
        ForeignKey("claims.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    uploaded_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    storage_key: Mapped[str] = mapped_column(
        String(500),
        unique=True,
        nullable=False,
    )

    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    file_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    document_type: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
        index=True,
    )

    classification_status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        nullable=False,
    )

    extracted_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # AI-extracted field values. These are suggestions, not confirmed claim data.
    extracted_fields: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # Evidence snippets copied from the actual OCR text for each extracted field.
    extraction_evidence: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # Values explicitly reviewed and confirmed by an authorised desk user.
    confirmed_fields: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    extraction_review_status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        nullable=False,
    )

    claim = relationship(
        "Claim",
        back_populates="documents",
    )

    uploader = relationship(
        "User",
        back_populates="uploaded_documents",
    )