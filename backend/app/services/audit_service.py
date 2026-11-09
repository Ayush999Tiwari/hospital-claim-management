
from sqlalchemy.orm import Session
from app.models import AuditLog, User


def log_action(
    db: Session,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: str,
    description: str | None = None,
    metadata: dict | None = None,
):
    entry = AuditLog(
        actor_user_id=str(actor.id) if actor else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        description=description,
        metadata_json=metadata,
    )
    db.add(entry)
    db.flush()
    return entry
