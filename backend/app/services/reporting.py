from __future__ import annotations

from pathlib import Path

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..core.config import settings
from ..models.entities import ComparisonRun


def export_excel(comparison: ComparisonRun) -> Path:
    output = settings.report_dir / f"comparison-{comparison.id}.xlsx"
    issues = [
        {
            "Severity": issue.severity,
            "Category": issue.category,
            "Article Code": issue.article_code,
            "Description": issue.description,
            "Sage Value": issue.sage_value,
            "Document Value": issue.document_value,
            "Message": issue.message,
        }
        for issue in comparison.issues
    ]
    summary = pd.DataFrame(
        [
            ["Matched lines", comparison.matched_count],
            ["Complete audit lines", len(comparison.audit_lines)],
            ["Matched with differences", count_audit_status(comparison, "matched_with_differences")],
            ["Extra document lines", count_audit_status(comparison, "extra_in_document")],
            ["Errors", comparison.error_count],
            ["Missing products", comparison.missing_products],
            ["Invoice total", comparison.invoice_total],
            ["Sage total", comparison.sage_total],
            ["Difference", comparison.difference_total],
        ],
        columns=["Metric", "Value"],
    )
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        summary.to_excel(writer, index=False, sheet_name="Summary")
        pd.DataFrame(issues).to_excel(writer, index=False, sheet_name="Issues")
        audit = pd.DataFrame([audit_line_to_dict(line) for line in comparison.audit_lines])
        audit.to_excel(writer, index=False, sheet_name="Complete Audit")
        if not audit.empty:
            audit[audit["Status"].eq("matched")].to_excel(writer, index=False, sheet_name="Matched")
            audit[audit["Status"].eq("matched_with_differences")].to_excel(writer, index=False, sheet_name="Differences")
            audit[audit["Status"].eq("missing_in_document")].to_excel(writer, index=False, sheet_name="Missing in Document")
            audit[audit["Status"].eq("extra_in_document")].to_excel(writer, index=False, sheet_name="Extra in Document")
    return output


def export_pdf(comparison: ComparisonRun) -> Path:
    output = settings.report_dir / f"comparison-{comparison.id}.pdf"
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(str(output), pagesize=A4, title=f"Comparison {comparison.id}")
    story = [
        Paragraph("Sage Audit Comparison Report", styles["Title"]),
        Spacer(1, 12),
    ]
    summary_rows = [
        ["Metric", "Value"],
        ["Matched lines", str(comparison.matched_count)],
        ["Complete audit lines", str(len(comparison.audit_lines))],
        ["Matched with differences", str(count_audit_status(comparison, "matched_with_differences"))],
        ["Extra document lines", str(count_audit_status(comparison, "extra_in_document"))],
        ["Errors", str(comparison.error_count)],
        ["Missing products", str(comparison.missing_products)],
        ["Invoice total", f"{comparison.invoice_total:.2f}"],
        ["Sage total", f"{comparison.sage_total:.2f}"],
        ["Difference", f"{comparison.difference_total:.2f}"],
    ]
    story.append(styled_table(summary_rows, [220, 180]))
    story.append(Spacer(1, 18))
    issue_rows = [["Severity", "Category", "Article", "Message"]]
    for issue in comparison.issues[:40]:
        issue_rows.append([issue.severity, issue.category, issue.article_code or "-", issue.message])
    story.append(Paragraph("Issues", styles["Heading2"]))
    story.append(styled_table(issue_rows, [60, 100, 80, 280]))
    story.append(Spacer(1, 18))
    story.append(Paragraph("Complete Audit Preview", styles["Heading2"]))
    audit_rows = [["Status", "Sage item", "Document item", "Sage qty", "Doc qty"]]
    for line in comparison.audit_lines[:35]:
        audit_rows.append(
            [
                line.status,
                line.sage_description or line.sage_article_code or "-",
                line.document_description or line.document_article_code or "-",
                number_text(line.sage_quantity),
                number_text(line.document_quantity),
            ]
        )
    story.append(styled_table(audit_rows, [85, 150, 150, 55, 55]))
    doc.build(story)
    return output


def audit_line_to_dict(line: object) -> dict[str, object]:
    return {
        "Status": line.status,
        "Match Method": line.match_method,
        "Confidence": line.confidence,
        "Sage Article": line.sage_article_code,
        "Sage Description": line.sage_description,
        "Sage Quantity": line.sage_quantity,
        "Sage Unit": line.sage_unit,
        "Sage Unit Price": line.sage_unit_price,
        "Sage Total": line.sage_total,
        "Document Article": line.document_article_code,
        "Document Description": line.document_description,
        "Document Quantity": line.document_quantity,
        "Document Unit": line.document_unit,
        "Document Unit Price": line.document_unit_price,
        "Document Total": line.document_total,
        "Notes": line.notes,
    }


def count_audit_status(comparison: ComparisonRun, status: str) -> int:
    return sum(1 for line in comparison.audit_lines if line.status == status)


def number_text(value: float | None) -> str:
    return "-" if value is None else f"{value:.2f}"


def styled_table(rows: list[list[str]], widths: list[int]) -> Table:
    table = Table(rows, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table
