
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import User


bearer_scheme = HTTPBearer()

# Central permission matrix
ROLE_PERMISSIONS = {
    "Desk Executive": {
        "claims:read",
        "claims:create",
        "claims:update",
        "documents:read",
        "documents:upload",
        "documents:download",
        "documents:process",
        "checklists:read",
        "queries:read",
        "queries:manage",
    },

    "Desk Head": {
        "claims:read",
        "claims:create",
        "claims:update",
        "documents:read",
        "documents:upload",
        "documents:download",
        "documents:process",
        "checklists:read",
        "checklists:manage",
        "queries:read",
        "queries:manage",
        "reports:read",
        "team:manage",
    },

    "Treating Doctor": {
        "doctor:assigned_claims_read",
        "doctor:approve",
    },

    "CFO": {
        "reports:read",
    },
}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        payload = decode_access_token(token)
        user_id = UUID(payload["sub"])

    except (
        jwt.InvalidTokenError,
        ValueError,
        KeyError,
        TypeError,
    ):
        raise credentials_exception

    user = db.scalar(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )

    if not user or not user.is_active:
        raise credentials_exception

    return user


def get_user_permissions(user: User) -> set[str]:
    permissions = set()

    for role in user.roles:
        permissions.update(
            ROLE_PERMISSIONS.get(role.name, set())
        )

    return permissions


def require_roles(*allowed_roles: str):

    if not allowed_roles:
        raise ValueError("At least one allowed role must be provided")

    def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:

        user_roles = {
            role.name for role in current_user.roles
        }

        if not user_roles.intersection(allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )

        return current_user

    return role_checker


def require_permissions(*required_permissions: str):

    if not required_permissions:
        raise ValueError("At least one permission must be provided")

    def permission_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:

        user_permissions = get_user_permissions(current_user)

        if not set(required_permissions).issubset(user_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )

        return current_user

    return permission_checker
