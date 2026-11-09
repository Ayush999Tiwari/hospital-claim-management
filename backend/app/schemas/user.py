from pydantic import BaseModel, EmailStr, ConfigDict


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: str | None = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)