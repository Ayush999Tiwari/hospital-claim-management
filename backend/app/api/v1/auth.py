from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    AuthenticatedUser,
)
from app.services.auth_service import login_user
from app.models import User


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
):
    result = login_user(
        db=db,
        email=credentials.email,
        password=credentials.password,
        role=credentials.role,
    )

    if not result:
        raise HTTPException(
            status_code=401,
            detail="Invalid email, password, or selected role",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return result


@router.get("/me", response_model=AuthenticatedUser)
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "full_name": current_user.full_name,
        "email": current_user.email,
        "roles": [role.name for role in current_user.roles],
    }