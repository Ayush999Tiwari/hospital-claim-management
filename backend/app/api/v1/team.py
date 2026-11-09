from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permissions
from app.models import User
from app.schemas.team import TeamMemberResponse

router = APIRouter(prefix="/team", tags=["Team Management"])


@router.get("/", response_model=list[TeamMemberResponse])
def get_team_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("team:manage")
    ),
):
    users = (
        db.query(User)
        .order_by(User.full_name.asc())
        .all()
    )

    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "is_active": user.is_active,
            "roles": [role.name for role in user.roles],
        }
        for user in users
    ]