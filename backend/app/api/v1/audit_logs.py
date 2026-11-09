
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permissions
from app.models import AuditLog, User

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("/")
def get_audit_logs(
    entity_type: str | None = None,
    entity_id: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("audit:read")),
):
    query = db.query(AuditLog)

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)

    entries = (
        query.order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(item.id),
            "actor_user_id": str(item.actor_user_id) if item.actor_user_id else None,
            "action": item.action,
            "entity_type": item.entity_type,
            "entity_id": item.entity_id,
            "description": item.description,
            "metadata": item.metadata_json,
            "created_at": item.created_at,
        }
        for item in entries
    ]
