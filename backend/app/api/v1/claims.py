
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.schemas.claim_detail import ClaimDetailResponse
from app.schemas.claim import ClaimCreate, ClaimResponse

from app.services.claim_detail_service import get_claim_detail
from app.services.claim_service import (
    create_claim,
    get_claims,
    get_claim_by_id,
)

from app.core.database import get_db
from app.core.dependencies import require_permissions
from app.models import User, Admission, Insurer, TPA


router = APIRouter(prefix="/claims", tags=["Claims"])


@router.get("/options")
def get_claim_creation_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("claims:create")
    ),
):
    admissions = db.scalars(
        select(Admission)
        .options(selectinload(Admission.patient))
        .order_by(Admission.created_at.desc())
    ).all()

    insurers = db.scalars(
        select(Insurer)
        .where(Insurer.is_active.is_(True))
        .order_by(Insurer.name)
    ).all()

    tpas = db.scalars(
        select(TPA)
        .where(TPA.is_active.is_(True))
        .order_by(TPA.name)
    ).all()

    return {
        "admissions": [
            {
                "id": str(admission.id),
                "admission_number": admission.admission_number,
                "patient_name": admission.patient.full_name,
                "procedure_name": admission.procedure_name,
                "diagnosis": admission.primary_diagnosis,
            }
            for admission in admissions
        ],
        "insurers": [
            {
                "id": str(insurer.id),
                "name": insurer.name,
            }
            for insurer in insurers
        ],
        "tpas": [
            {
                "id": str(tpa.id),
                "name": tpa.name,
            }
            for tpa in tpas
        ],
    }


@router.post(
    "/",
    response_model=ClaimResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_claim(
    payload: ClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("claims:create")
    ),
):
    try:
        return create_claim(db=db, payload=payload)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


@router.get("/", response_model=list[ClaimResponse])
def list_claims(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("claims:read")
    ),
):
    return get_claims(
        db=db,
        skip=skip,
        limit=limit,
        status=status,
    )


@router.get("/{claim_id}", response_model=ClaimResponse)
def claim_detail(
    claim_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("claims:read")
    ),
):
    claim = get_claim_by_id(db, claim_id)

    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found",
        )

    return claim


@router.get(
    "/{claim_id}/detail",
    response_model=ClaimDetailResponse,
)
def claim_file_detail(
    claim_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permissions("claims:read")
    ),
):
    result = get_claim_detail(db, claim_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found",
        )

    return result
