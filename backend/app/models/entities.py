from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UploadBatch(Base):
    __tablename__ = "upload_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_key: Mapped[str] = mapped_column(String(120), default="default", index=True)
    sage_filename: Mapped[str] = mapped_column(String(255))
    sage_path: Mapped[str] = mapped_column(String(512))
    document_filename: Mapped[str] = mapped_column(String(255))
    document_path: Mapped[str] = mapped_column(String(512))
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    created_by: Mapped[User] = relationship()
    comparisons: Mapped[list["ComparisonRun"]] = relationship(back_populates="upload_batch")


class ComparisonRun(Base):
    __tablename__ = "comparison_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    upload_batch_id: Mapped[int] = mapped_column(ForeignKey("upload_batches.id"), index=True)
    company_key: Mapped[str] = mapped_column(String(120), default="default", index=True)
    matched_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    missing_products: Mapped[int] = mapped_column(Integer, default=0)
    invoice_total: Mapped[float] = mapped_column(Float, default=0.0)
    sage_total: Mapped[float] = mapped_column(Float, default=0.0)
    difference_total: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    upload_batch: Mapped[UploadBatch] = relationship(back_populates="comparisons")
    issues: Mapped[list["ComparisonIssue"]] = relationship(back_populates="comparison", cascade="all, delete-orphan")
    audit_lines: Mapped[list["ComparisonAuditLine"]] = relationship(back_populates="comparison", cascade="all, delete-orphan")


class ComparisonIssue(Base):
    __tablename__ = "comparison_issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    comparison_id: Mapped[int] = mapped_column(ForeignKey("comparison_runs.id"), index=True)
    severity: Mapped[str] = mapped_column(String(32), default="medium")
    category: Mapped[str] = mapped_column(String(80))
    article_code: Mapped[str | None] = mapped_column(String(160), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sage_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    message: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)

    comparison: Mapped[ComparisonRun] = relationship(back_populates="issues")


class ComparisonAuditLine(Base):
    __tablename__ = "comparison_audit_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    comparison_id: Mapped[int] = mapped_column(ForeignKey("comparison_runs.id"), index=True)
    status: Mapped[str] = mapped_column(String(80), index=True)
    match_method: Mapped[str] = mapped_column(String(80), default="none")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    sage_article_code: Mapped[str | None] = mapped_column(String(160), nullable=True)
    sage_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sage_quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    sage_unit: Mapped[str | None] = mapped_column(String(80), nullable=True)
    sage_unit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    sage_total: Mapped[float | None] = mapped_column(Float, nullable=True)
    document_article_code: Mapped[str | None] = mapped_column(String(160), nullable=True)
    document_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    document_unit: Mapped[str | None] = mapped_column(String(80), nullable=True)
    document_unit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    document_total: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)

    comparison: Mapped[ComparisonRun] = relationship(back_populates="audit_lines")
