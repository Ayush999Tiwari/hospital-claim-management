from typing import Literal

from pydantic import BaseModel, EmailStr, ConfigDict


UserRole = Literal[
    "Desk Executive",
    "Desk Head",
    "Treating Doctor",
    "CFO",
]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str


class AuthenticatedUser(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    roles: list[str]

    model_config = ConfigDict(from_attributes=True)