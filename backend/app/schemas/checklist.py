
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ChecklistRuleCreate(BaseModel):
    insurer_id: UUID
    procedure_name: str = Field(min_length=2, max_length=255)
    document_type: str = Field(min_length=2, max_length=80)
    is_mandatory: bool = True


class ChecklistRuleResponse(BaseModel):
    id: UUID
    insurer_id: UUID
    procedure_name: str
    document_type: str
    is_mandatory: bool
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChecklistItemResponse(BaseModel):
    id: UUID
    claim_id: UUID
    rule_id: UUID
    rule: ChecklistRuleResponse
    document_id: UUID | None = None
    status: str
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChecklistItemUpdate(BaseModel):
    document_id: UUID | None = None
    is_verified: bool | None = None
class ChecklistRuleStatusUpdate(BaseModel):
    is_active: bool