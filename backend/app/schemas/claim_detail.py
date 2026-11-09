from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PatientDetail(BaseModel):
    id: UUID
    patient_number: str
    full_name: str

    model_config = ConfigDict(from_attributes=True)


class AdmissionDetail(BaseModel):
    id: UUID
    admission_number: str
    primary_diagnosis: str
    procedure_name: str | None
    admitted_at: datetime
    discharged_at: datetime | None
    status: str

    model_config = ConfigDict(from_attributes=True)


class ChecklistDetail(BaseModel):
    id: UUID
    document_type: str
    procedure_name: str
    is_mandatory: bool
    status: str
    is_verified: bool
    document_id: UUID | None

    model_config = ConfigDict(from_attributes=True)


class ClaimDetailResponse(BaseModel):
    id: UUID
    claim_number: str
    status: str
    requested_amount: Decimal
    approved_amount: Decimal | None
    created_at: datetime

    patient: PatientDetail
    admission: AdmissionDetail

    insurer_name: str
    tpa_name: str | None

    checklist: list[ChecklistDetail]