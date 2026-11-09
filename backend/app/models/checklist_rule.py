from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class ChecklistRule(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "checklist_rules"

    __table_args__ = (
        UniqueConstraint(
            "insurer_id",
            "procedure_name",
            "document_type",
            name="uq_checklist_rule",
        ),
    )

    insurer_id: Mapped[str] = mapped_column(
        ForeignKey("insurers.id", ondelete="RESTRICT"),
        nullable=False,
    )

    procedure_name: Mapped[str] = mapped_column(
        String(255), nullable=False
    )

    document_type: Mapped[str] = mapped_column(
        String(80), nullable=False
    )

    is_mandatory: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )

    insurer = relationship("Insurer")