
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import User
from app.core.security import verify_password, create_access_token


def authenticate_user(
    db: Session,
    email: str,
    password: str,
    role: str,
):
    user = db.scalar(
        select(User)
        .options(selectinload(User.roles))
        .where(User.email == email.lower())
    )

    if not user or not user.is_active:
        return None

    if not verify_password(password, user.password_hash):
        return None

    user_roles = {user_role.name for user_role in user.roles}

    if role not in user_roles:
        return None

    return user


def login_user(
    db: Session,
    email: str,
    password: str,
    role: str,
):
    user = authenticate_user(
        db=db,
        email=email,
        password=password,
        role=role,
    )

    if not user:
        return None

    token = create_access_token(str(user.id))

    return {
        "access_token": token,
        "token_type": "bearer",
    }
