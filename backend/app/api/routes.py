from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..core.config import settings
from ..db.dependencies import get_current_user, get_db, require_admin
from ..models.entities import ComparisonRun, UploadBatch, User
from ..schemas.contracts import AuditLineResponse, CompareResponse, DashboardResponse, IssueResponse, TokenResponse, UploadResponse, UserResponse
from ..services.auth import authenticate_user, issue_token
from ..services.comparison import compare_upload_batch
from ..services.reporting import export_excel, export_pdf


api_router = APIRouter()
ALLOWED_UPLOAD_SUFFIXES = {".csv", ".xls", ".xlsx", ".pdf"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


@api_router.post("/auth/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenResponse(access_token=issue_token(user), email=user.email, role=user.role)


@api_router.get("/auth/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(email=user.email, role=user.role)


@api_router.post("/upload", response_model=UploadResponse)
def upload_files(
    sage_file: UploadFile = File(...),
    document_file: UploadFile = File(...),
    company_key: str = Form("default"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UploadResponse:
    sage_path = persist_upload(sage_file)
    document_path = persist_upload(document_file)
    batch = UploadBatch(
        company_key=company_key.strip() or "default",
        sage_filename=sage_file.filename or sage_path.name,
        sage_path=str(sage_path),
        document_filename=document_file.filename or document_path.name,
        document_path=str(document_path),
        created_by_id=user.id,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return UploadResponse(
        upload_batch_id=batch.id,
        sage_filename=batch.sage_filename,
        document_filename=batch.document_filename,
        company_key=batch.company_key,
    )


@api_router.post("/compare/{upload_batch_id}", response_model=CompareResponse)
def compare(
    upload_batch_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CompareResponse:
    batch = db.query(UploadBatch).filter(UploadBatch.id == upload_batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload batch not found")
    try:
        comparison = compare_upload_batch(db, batch)
    except (ImportError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return serialize_dashboard(comparison)


@api_router.get("/dashboard/{comparison_id}", response_model=DashboardResponse)
def dashboard(
    comparison_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardResponse:
    comparison = fetch_comparison(db, comparison_id)
    return serialize_dashboard(comparison)


@api_router.get("/export/excel/{comparison_id}")
def download_excel(
    comparison_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> FileResponse:
    comparison = fetch_comparison(db, comparison_id)
    output = export_excel(comparison)
    return FileResponse(output, filename=output.name)


@api_router.get("/export/pdf/{comparison_id}")
def download_pdf(
    comparison_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> FileResponse:
    comparison = fetch_comparison(db, comparison_id)
    output = export_pdf(comparison)
    return FileResponse(output, filename=output.name)


@api_router.get("/admin/ping")
def admin_ping(_: User = Depends(require_admin)) -> dict[str, str]:
    return {"status": "admin-ok"}


def persist_upload(upload: UploadFile) -> Path:
    safe_name = Path(upload.filename or "document.bin").name.replace(" ", "_")
    if Path(safe_name).suffix.lower() not in ALLOWED_UPLOAD_SUFFIXES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV, XLS, XLSX, and PDF uploads are supported")
    destination = settings.upload_dir / safe_name
    stem, suffix = destination.stem, destination.suffix
    counter = 1
    while destination.exists():
        destination = settings.upload_dir / f"{stem}-{counter}{suffix}"
        counter += 1
    bytes_written = 0
    with destination.open("wb") as buffer:
        while chunk := upload.file.read(1024 * 1024):
            bytes_written += len(chunk)
            if bytes_written > MAX_UPLOAD_BYTES:
                destination.unlink(missing_ok=True)
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Upload exceeds the 25 MB limit")
            buffer.write(chunk)
    return destination


def fetch_comparison(db: Session, comparison_id: int) -> ComparisonRun:
    comparison = db.query(ComparisonRun).filter(ComparisonRun.id == comparison_id).first()
    if not comparison:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comparison not found")
    return comparison


def serialize_dashboard(comparison: ComparisonRun) -> DashboardResponse:
    audit_statuses = [line.status for line in comparison.audit_lines]
    return DashboardResponse(
        comparison_id=comparison.id,
        matched_count=comparison.matched_count,
        error_count=comparison.error_count,
        missing_products=comparison.missing_products,
        complete_audit_total=len(audit_statuses),
        matched_with_differences=audit_statuses.count("matched_with_differences"),
        extra_document_lines=audit_statuses.count("extra_in_document"),
        invoice_total=comparison.invoice_total,
        sage_total=comparison.sage_total,
        difference_total=comparison.difference_total,
        created_at=comparison.created_at,
        issues=[
            IssueResponse(
                id=issue.id,
                severity=issue.severity,
                category=issue.category,
                article_code=issue.article_code,
                description=issue.description,
                sage_value=issue.sage_value,
                document_value=issue.document_value,
                message=issue.message,
            )
            for issue in comparison.issues
        ],
        audit_lines=[
            AuditLineResponse(
                id=line.id,
                status=line.status,
                match_method=line.match_method,
                confidence=line.confidence,
                sage_article_code=line.sage_article_code,
                sage_description=line.sage_description,
                sage_quantity=line.sage_quantity,
                sage_unit=line.sage_unit,
                sage_unit_price=line.sage_unit_price,
                sage_total=line.sage_total,
                document_article_code=line.document_article_code,
                document_description=line.document_description,
                document_quantity=line.document_quantity,
                document_unit=line.document_unit,
                document_unit_price=line.document_unit_price,
                document_total=line.document_total,
                notes=line.notes,
            )
            for line in comparison.audit_lines
        ],
    )
