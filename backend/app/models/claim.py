from decimal import Decimal
from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin


class Claim(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "claims"
    claim_number: Mapped[str] = mapped_column(
        String(30), unique=True, index=True, nullable=False
    )
    documents = relationship(
    "Document",
    back_populates="claim",
)
    admission_id: Mapped[str] = mapped_column(
        ForeignKey("admissions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    insurer_id: Mapped[str] = mapped_column(
        ForeignKey("insurers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    tpa_id: Mapped[str | None] = mapped_column(
        ForeignKey("tpas.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
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
    admission = relationship("Admission", back_populates="claims")
    insurer = relationship("Insurer", back_populates="claims")
    tpa = relationship("TPA", back_populates="claims")
    requests = relationship(
        "ClaimRequest", back_populates="claim"
    )