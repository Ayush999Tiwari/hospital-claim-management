from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


RequestType = Literal[
    "PRE_AUTH",
    "ENHANCEMENT",
    "DISCHARGE",
    "FINAL_CLAIM",
]

RequestStatus = Literal[
    "DRAFT",
    "SUBMITTED",
    "QUERY",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
]

class ClaimRequestCreate(BaseModel):
    request_type: RequestType
    requested_amount: Decimal = Field(ge=0)


class ClaimRequestUpdate(BaseModel):
    status: RequestStatus | None = None
    approved_amount: Decimal | None = Field(default=None, ge=0)
    insurer_reference: str | None = Field(default=None, max_length=100)


class ClaimRequestResponse(BaseModel):
    id: UUID
    claim_id: UUID
    request_type: str
    sequence_number: int
    status: str
    requested_amount: Decimal
    approved_amount: Decimal | None = None
    insurer_reference: str | None = None
    submitted_at: datetime | None = None
    responded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ClaimRequestInboxResponse(ClaimRequestResponse):
    claim_number: str