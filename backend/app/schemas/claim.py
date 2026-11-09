from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ClaimCreate(BaseModel):
    admission_id: UUID
    insurer_id: UUID
    tpa_id: UUID | None = None
    requested_amount: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
    )


class ClaimResponse(BaseModel):
    id: UUID
    claim_number: str
    admission_id: UUID
    insurer_id: UUID
    tpa_id: UUID | None = None
    status: str
    requested_amount: Decimal
    approved_amount: Decimal | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)