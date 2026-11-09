from app.api.v1.doctor_approvals import router as doctor_approvals_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.team import router as team_router
from app.api.v1.claim_requests import router as claim_requests_router
from app.core.config import settings
from app.api.v1.auth import router as auth_router
from app.api.v1.claims import router as claims_router
from app.api.v1.reports import router as reports_router
from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.pdf_packets import router as pdf_packets_router


from app.api.v1.documents import (
    claims_documents_router,
    documents_router,
)
from app.api.v1.checklists import (
    rules_router,
    checklists_router,
    items_router,
)

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(claims_router, prefix=settings.API_V1_PREFIX)
app.include_router(claims_documents_router, prefix=settings.API_V1_PREFIX)
app.include_router(documents_router, prefix=settings.API_V1_PREFIX)
app.include_router(rules_router, prefix=settings.API_V1_PREFIX)
app.include_router(checklists_router, prefix=settings.API_V1_PREFIX)
app.include_router(items_router, prefix=settings.API_V1_PREFIX)
app.include_router(claim_requests_router, prefix=settings.API_V1_PREFIX)
app.include_router(team_router, prefix="/api/v1")
app.include_router(doctor_approvals_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(audit_logs_router, prefix="/api/v1")
app.include_router(pdf_packets_router, prefix="/api/v1")
@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/")
def root():
    return {"message": "Hospital Claims Management API"}
