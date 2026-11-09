from datetime import datetime
from uuid import UUID;

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    id: UUID
    claim_id: UUID
    uploaded_by: UUID
    uploaded_by_name: str

    original_filename: str
    mime_type: str
    file_size: int
    document_type: str | None = None
    classification_status: str
    created_at: datetime
    updated_at: datetime
    extracted_fields: dict | None = None
    extraction_evidence: dict | None = None
    confirmed_fields: dict | None = None
    extraction_review_status: str = "PENDING"

    model_config = ConfigDict(from_attributes=True)