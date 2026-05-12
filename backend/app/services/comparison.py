from __future__ import annotations

from collections import defaultdict, deque
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

import pandas as pd
from rapidfuzz import fuzz, process
from sqlalchemy.orm import Session

from ..models.entities import ComparisonAuditLine, ComparisonIssue, ComparisonRun, UploadBatch
from .file_parser import parse_document
from .normalization import normalize_code, normalize_text


@dataclass
class ComparisonSummary:
    matched_count: int
    error_count: int
    missing_products: int
    invoice_total: float
    sage_total: float
    difference_total: float
    issues: list[ComparisonIssue]


def compare_upload_batch(db: Session, upload_batch: UploadBatch) -> ComparisonRun:
    sage = enrich(parse_document(Path(upload_batch.sage_path)))
    document = enrich(parse_document(Path(upload_batch.document_path)))
    issues: list[ComparisonIssue] = []
    audit_lines: list[ComparisonAuditLine] = []
    matched_count = 0
    document_by_code = group_rows_by_key(document.itertuples(), "norm_code")
    document_descriptions = {row.norm_description: row for row in document.itertuples() if row.norm_description}
    used_document_indexes: set[int] = set()

    issues.extend(detect_duplicates(sage, "sage"))
    issues.extend(detect_duplicates(document, "document"))

    for sage_row in sage.itertuples():
        match = next_unused_match(document_by_code.get(sage_row.norm_code), used_document_indexes)
        match_method = "article_code" if match is not None and sage_row.norm_code else "none"
        confidence = 100.0 if match is not None and sage_row.norm_code else 0.0
        if match is None and sage_row.norm_description:
            available_descriptions = {
                description: row
                for description, row in document_descriptions.items()
                if row.Index not in used_document_indexes
            }
            candidate = process.extractOne(
                sage_row.norm_description,
                available_descriptions.keys(),
                scorer=fuzz.ratio,
                score_cutoff=78,
            )
            if candidate:
                match = available_descriptions[candidate[0]]
                match_method = "description_fuzzy"
                confidence = float(candidate[1])

        if match is None:
            audit_lines.append(build_audit_line("missing_in_document", "none", 0.0, sage_row, None, "Sage line has no matching document line."))
            issues.append(
                build_issue(
                    "high",
                    "missing_article",
                    sage_row.article_code,
                    sage_row.description,
                    str(sage_row.quantity),
                    None,
                    "Article present in Sage export but missing from uploaded document.",
                )
            )
            continue

        used_document_indexes.add(match.Index)
        matched_count += 1
        line_status = line_status_for(sage_row, match)
        audit_lines.append(build_audit_line(line_status, match_method, confidence, sage_row, match, line_note_for(line_status)))
        compare_numeric(issues, "quantity_difference", sage_row, match, "quantity", 0.0001)
        compare_unit(issues, sage_row, match)
        if getattr(sage_row, "has_unit_price", True) and getattr(match, "has_unit_price", True):
            compare_numeric(issues, "price_difference", sage_row, match, "unit_price", 0.01)
        if getattr(sage_row, "has_total", True) and getattr(match, "has_total", True):
            compare_numeric(issues, "incorrect_total", sage_row, match, "total", 0.01)

        if getattr(match, "has_total", True) and getattr(match, "has_unit_price", True) and abs(float(match.total) - float(match.computed_total)) > 0.01:
            issues.append(
                build_issue(
                    "medium",
                    "document_total_formula",
                    match.article_code,
                    match.description,
                    None,
                    f"{match.total:.2f} vs computed {match.computed_total:.2f}",
                    "Document total does not match quantity multiplied by unit price.",
                )
            )

    for document_row in document.itertuples():
        if document_row.Index not in used_document_indexes:
            audit_lines.append(build_audit_line("extra_in_document", "none", 0.0, None, document_row, "Document line has no matching Sage line."))
            issues.append(
                build_issue(
                    "medium",
                    "unexpected_document_line",
                    document_row.article_code,
                    document_row.description,
                    None,
                    str(document_row.quantity),
                    "Document contains a line that did not match the Sage export.",
                )
            )

    invoice_total = round(float(document["total"].sum()), 2)
    sage_total = round(float(sage["total"].sum()), 2)
    difference_total = round(invoice_total - sage_total, 2)
    missing_products = sum(issue.category == "missing_article" for issue in issues)
    comparison = ComparisonRun(
        upload_batch_id=upload_batch.id,
        company_key=upload_batch.company_key,
        matched_count=matched_count,
        error_count=len(issues),
        missing_products=missing_products,
        invoice_total=invoice_total,
        sage_total=sage_total,
        difference_total=difference_total,
        issues=issues,
        audit_lines=audit_lines,
    )
    db.add(comparison)
    db.commit()
    db.refresh(comparison)
    return comparison


def enrich(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    frame["norm_code"] = frame["article_code"].map(normalize_code)
    frame["norm_description"] = frame["description"].map(normalize_text)
    return frame


def group_rows_by_key(rows: Iterable[object], key_name: str) -> dict[str, deque[object]]:
    grouped: dict[str, deque[object]] = defaultdict(deque)
    for row in rows:
        key = getattr(row, key_name, "")
        if key:
            grouped[key].append(row)
    return grouped


def next_unused_match(candidates: deque[object] | None, used_indexes: set[int]) -> object | None:
    if not candidates:
        return None
    while candidates:
        candidate = candidates.popleft()
        if candidate.Index not in used_indexes:
            return candidate
    return None


def detect_duplicates(frame: pd.DataFrame, source: str) -> list[ComparisonIssue]:
    duplicate_mask = frame.duplicated(subset=["norm_code", "norm_description", "quantity", "unit_price", "total"], keep=False)
    issues: list[ComparisonIssue] = []
    for row in frame[duplicate_mask].itertuples():
        issues.append(
            build_issue(
                "low",
                "duplicate_line",
                row.article_code,
                row.description,
                source if source == "sage" else None,
                source if source == "document" else None,
                f"Duplicate line detected in {source} input.",
            )
        )
    return issues


def line_status_for(sage_row: object, document_row: object) -> str:
    differences: list[str] = []
    if abs(float(sage_row.quantity) - float(document_row.quantity)) > 0.0001:
        differences.append("quantity")
    if normalize_text(getattr(sage_row, "unit", "")) and normalize_text(getattr(document_row, "unit", "")):
        if normalize_text(sage_row.unit) != normalize_text(document_row.unit):
            differences.append("unit")
    if getattr(sage_row, "has_unit_price", True) and getattr(document_row, "has_unit_price", True):
        if abs(float(sage_row.unit_price) - float(document_row.unit_price)) > 0.01:
            differences.append("price")
    if getattr(sage_row, "has_total", True) and getattr(document_row, "has_total", True):
        if abs(float(sage_row.total) - float(document_row.total)) > 0.01:
            differences.append("total")
    return "matched" if not differences else "matched_with_differences"


def line_note_for(status: str) -> str:
    if status == "matched":
        return "Line matched with no checked differences."
    if status == "matched_with_differences":
        return "Line matched but one or more checked fields differ."
    return ""


def compare_unit(issues: list[ComparisonIssue], sage_row: object, document_row: object) -> None:
    sage_unit = normalize_text(getattr(sage_row, "unit", ""))
    document_unit = normalize_text(getattr(document_row, "unit", ""))
    if sage_unit and document_unit and sage_unit != document_unit:
        issues.append(
            build_issue(
                "medium",
                "unit_difference",
                getattr(sage_row, "article_code"),
                getattr(sage_row, "description"),
                getattr(sage_row, "unit"),
                getattr(document_row, "unit"),
                "Unit differs between Sage and document.",
            )
        )


def compare_numeric(
    issues: list[ComparisonIssue],
    category: str,
    sage_row: object,
    document_row: object,
    field_name: str,
    tolerance: float,
) -> None:
    sage_value = float(getattr(sage_row, field_name))
    document_value = float(getattr(document_row, field_name))
    if abs(sage_value - document_value) > tolerance:
        issues.append(
            build_issue(
                "high" if category != "incorrect_total" else "medium",
                category,
                getattr(sage_row, "article_code"),
                getattr(sage_row, "description"),
                f"{sage_value:.2f}",
                f"{document_value:.2f}",
                f"{field_name.replace('_', ' ').title()} differs between Sage and document.",
            )
        )


def build_issue(
    severity: str,
    category: str,
    article_code: str | None,
    description: str | None,
    sage_value: str | None,
    document_value: str | None,
    message: str,
) -> ComparisonIssue:
    return ComparisonIssue(
        severity=severity,
        category=category,
        article_code=article_code or None,
        description=description or None,
        sage_value=sage_value,
        document_value=document_value,
        message=message,
        payload={},
    )


def build_audit_line(
    status: str,
    match_method: str,
    confidence: float,
    sage_row: object | None,
    document_row: object | None,
    notes: str,
) -> ComparisonAuditLine:
    return ComparisonAuditLine(
        status=status,
        match_method=match_method,
        confidence=confidence,
        sage_article_code=value_or_none(sage_row, "article_code"),
        sage_description=value_or_none(sage_row, "description"),
        sage_quantity=float_value_or_none(sage_row, "quantity"),
        sage_unit=value_or_none(sage_row, "unit"),
        sage_unit_price=float_value_or_none(sage_row, "unit_price"),
        sage_total=float_value_or_none(sage_row, "total"),
        document_article_code=value_or_none(document_row, "article_code"),
        document_description=value_or_none(document_row, "description"),
        document_quantity=float_value_or_none(document_row, "quantity"),
        document_unit=value_or_none(document_row, "unit"),
        document_unit_price=float_value_or_none(document_row, "unit_price"),
        document_total=float_value_or_none(document_row, "total"),
        notes=notes,
        payload={},
    )


def value_or_none(row: object | None, field_name: str) -> str | None:
    if row is None:
        return None
    value = getattr(row, field_name, None)
    return None if value is None or str(value).strip() == "" else str(value)


def float_value_or_none(row: object | None, field_name: str) -> float | None:
    if row is None:
        return None
    try:
        return float(getattr(row, field_name))
    except (TypeError, ValueError):
        return None
