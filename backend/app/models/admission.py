from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class Admission(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "admissions"
    admission_number: Mapped[str] = mapped_column(
        String(30), unique=True, index=True, nullable=False
    )
    patient_id: Mapped[str] = mapped_column(
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    admitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    discharged_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    primary_diagnosis: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    procedure_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(30), default="ADMITTED", nullable=False
    )
    patient = relationship("Patient", back_populates="admissions")
    claims = relationship("Claim", back_populates="admission")