from datetime import datetime

from pydantic import BaseModel


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str
    role: str


class UserResponse(BaseModel):
    email: str
    role: str


class UploadResponse(BaseModel):
    upload_batch_id: int
    sage_filename: str
    document_filename: str
    company_key: str


class IssueResponse(BaseModel):
    id: int
    severity: str
    category: str
    article_code: str | None
    description: str | None
    sage_value: str | None
    document_value: str | None
    message: str


class DashboardResponse(BaseModel):
    comparison_id: int
    matched_count: int
    error_count: int
    missing_products: int
    complete_audit_total: int = 0
    matched_with_differences: int = 0
    extra_document_lines: int = 0
    invoice_total: float
    sage_total: float
    difference_total: float
    created_at: datetime
    issues: list[IssueResponse]


class CompareResponse(DashboardResponse):
    pass
