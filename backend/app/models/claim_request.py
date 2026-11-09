from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class ClaimRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "claim_requests"
    __table_args__ = (
        UniqueConstraint(
            "claim_id",
            "request_type",
            "sequence_number",
            name="uq_claim_request_sequence",
        ),
        CheckConstraint(
            "sequence_number >= 1",
            name="ck_claim_request_sequence_positive",
        ),
        CheckConstraint(
            "requested_amount >= 0",
            name="ck_claim_request_amount_nonnegative",
        ),
    )
    claim_id: Mapped[str] = mapped_column(
        ForeignKey("claims.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    request_type: Mapped[str] = mapped_column(
        String(40), nullable=False
    )
    sequence_number: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(40), default="DRAFT", nullable=False, index=True
    )
    requested_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    approved_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    insurer_reference: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    claim = relationship("Claim", back_populates="requests")