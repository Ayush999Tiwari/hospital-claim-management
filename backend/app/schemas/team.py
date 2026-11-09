from uuid import UUID
from pydantic import BaseModel, ConfigDict


class TeamMemberResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: str | None = None
    is_active: bool
    roles: list[str]

    model_config = ConfigDict(from_attributes=True)