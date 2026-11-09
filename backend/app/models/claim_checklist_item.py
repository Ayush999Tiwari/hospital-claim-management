from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class ClaimChecklistItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "claim_checklist_items"

    __table_args__ = (
        UniqueConstraint(
            "claim_id",
            "rule_id",
            name="uq_claim_checklist_rule",
        ),
    )

    claim_id: Mapped[str] = mapped_column(
        ForeignKey("claims.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    rule_id: Mapped[str] = mapped_column(
        ForeignKey("checklist_rules.id", ondelete="RESTRICT"),
        nullable=False,
    )

    document_id: Mapped[str | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30), default="MISSING", nullable=False
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    claim = relationship("Claim")
    rule = relationship("ChecklistRule")
    document = relationship("Document")