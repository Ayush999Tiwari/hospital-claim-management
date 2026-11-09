
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permissions
from app.models import User
from app.schemas.checklist import (
    ChecklistRuleCreate,
    ChecklistRuleResponse,
    ChecklistItemResponse,
    ChecklistItemUpdate,
    ChecklistRuleStatusUpdate,
)
from app.services.checklist_service import (
    create_checklist_rule,
    list_checklist_rules,
    generate_claim_checklist,
    list_claim_checklist,
    update_checklist_item,
    update_checklist_rule_status,
)


rules_router = APIRouter(
    prefix="/checklist-rules",
    tags=["Checklist Rules"],
)

checklists_router = APIRouter(
    prefix="/claims",
    tags=["Claim Checklists"],
)

items_router = APIRouter(
    prefix="/checklist-items",
    tags=["Checklist Items"],
)


# Desk Head only: create checklist rules.
@rules_router.post(
    "/",
    response_model=ChecklistRuleResponse,
    status_code=201,
)
def create_rule(
    data: ChecklistRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("checklists:manage")
    ),
):
    return create_checklist_rule(db, data)


# Desk Executive and Desk Head: view rules.
@rules_router.get(
    "/",
    response_model=list[ChecklistRuleResponse],
)
def get_rules(
    insurer_id: UUID | None = None,
    procedure_name: str | None = None,
    is_active: bool | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("checklists:read")
    ),
):
    return list_checklist_rules(
        db,
        insurer_id,
        procedure_name,
        is_active,
    )


# Desk roles: generate a claim checklist.
@checklists_router.post(
    "/{claim_id}/checklist/generate",
    response_model=list[ChecklistItemResponse],
)
def generate_checklist(
    claim_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("checklists:read")
    ),
):
    return generate_claim_checklist(db, claim_id)


# Desk roles: view a claim checklist.
@checklists_router.get(
    "/{claim_id}/checklist",
    response_model=list[ChecklistItemResponse],
)
def get_checklist(
    claim_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("checklists:read")
    ),
):
    return list_claim_checklist(db, claim_id)


# Desk roles: update checklist item and record audit log.
@items_router.patch(
    "/{item_id}",
    response_model=ChecklistItemResponse,
)
def update_item(
    item_id: UUID,
    data: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("checklists:update")
    ),
):
    return update_checklist_item(
        db=db,
        item_id=item_id,
        actor=current_user,
        **data.model_dump(exclude_unset=True),
    )


# Desk Head only: activate/deactivate checklist rules.
@rules_router.patch(
    "/{rule_id}/status",
    response_model=ChecklistRuleResponse,
)
def update_rule_status(
    rule_id: UUID,
    data: ChecklistRuleStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("checklists:manage")
    ),
):
    return update_checklist_rule_status(
        db=db,
        rule_id=rule_id,
        is_active=data.is_active,
    )
