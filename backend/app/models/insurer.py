from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin

class Insurer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "insurers"
    name: Mapped[str] = mapped_column(
        String(150), unique=True, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    claims = relationship("Claim", back_populates="insurer")