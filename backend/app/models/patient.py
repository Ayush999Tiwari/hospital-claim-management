from datetime import date
from sqlalchemy import Date, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin


class Patient(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "patients"
    patient_number: Mapped[str] = mapped_column(
        String(30), unique=True, index=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    admissions = relationship("Admission", back_populates="patient")