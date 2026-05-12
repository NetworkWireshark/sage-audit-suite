from __future__ import annotations

import re
from pathlib import Path

import pandas as pd
import pytesseract
from pdf2image import convert_from_path

from ..core.config import settings
from .normalization import normalize_text


COLUMN_ALIASES = {
    "article_code": {"CODE", "ARTICLE", "REFERENCE", "REFERENCEARTICLE", "REF", "SKU", "ITEMCODE"},
    "description": {"DESCRIPTION", "DESIGNATION", "LIBELLE", "LABEL", "ARTICLELABEL"},
    "unit": {"UNIT", "UNITE", "CONDITIONNEMENT", "UOM"},
    "quantity": {"QTY", "QUANTITY", "QUANTITE", "QTE"},
    "unit_price": {"UNITPRICE", "PRICE", "PRIXUNITAIRE", "PU", "PUHT", "PUNET", "UNITCOST"},
    "total": {"TOTAL", "AMOUNT", "MONTANT", "MONTANTHT", "LINETOTAL"},
}


def parse_document(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        frame = pd.read_csv(path, sep=None, engine="python")
    elif suffix in {".xlsx", ".xls"}:
        frame = read_excel_with_header_detection(path)
    elif suffix == ".pdf":
        frame = parse_pdf(path)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")
    return canonicalize(frame)


def read_excel_with_header_detection(path: Path) -> pd.DataFrame:
    raw = pd.read_excel(path, header=None)
    header_index = detect_header_row(raw)
    if header_index is None:
        return pd.read_excel(path)
    frame = raw.iloc[header_index + 1 :].copy()
    frame.columns = [str(value).strip() if pd.notna(value) else f"unnamed_{index}" for index, value in enumerate(raw.iloc[header_index])]
    frame = frame.dropna(axis=1, how="all").dropna(axis=0, how="all")
    return frame


def detect_header_row(raw: pd.DataFrame) -> int | None:
    alias_values = set().union(*COLUMN_ALIASES.values())
    for index, row in raw.head(50).iterrows():
        normalized_cells = {normalize_text(value).replace(" ", "") for value in row if pd.notna(value)}
        if len(normalized_cells & alias_values) >= 2:
            return int(index)
    return None


def parse_pdf(path: Path) -> pd.DataFrame:
    if settings.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
    images = convert_from_path(path, poppler_path=settings.poppler_path or None)
    rows: list[dict[str, object]] = []
    for image in images:
        text = pytesseract.image_to_string(image)
        for line in text.splitlines():
            cleaned = line.strip()
            if not cleaned:
                continue
            numbers = re.findall(r"-?\d+(?:[.,]\d+)?", cleaned)
            if len(numbers) < 3:
                continue
            article_code = cleaned.split()[0]
            quantity, unit_price, total = numbers[-3:]
            description = cleaned.replace(article_code, "", 1)
            for token in numbers[-3:]:
                description = description.replace(token, "", 1)
            rows.append(
                {
                    "article_code": article_code,
                    "description": description.strip(),
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total": total,
                }
            )
    return pd.DataFrame(rows)


def canonicalize(frame: pd.DataFrame) -> pd.DataFrame:
    renamed: dict[str, str] = {}
    for column in frame.columns:
        normalized = normalize_text(column).replace(" ", "")
        for canonical_name, aliases in COLUMN_ALIASES.items():
            if normalized in aliases:
                renamed[column] = canonical_name
                break
    frame = frame.rename(columns=renamed)
    frame = collapse_duplicate_columns(frame)
    present_fields = {field for field in ["article_code", "description", "unit", "quantity", "unit_price", "total"] if field in frame.columns}
    for required in ["article_code", "description", "unit", "quantity", "unit_price", "total"]:
        if required not in frame.columns:
            frame[required] = None
    frame = frame[["article_code", "description", "unit", "quantity", "unit_price", "total"]].copy()
    for numeric in ["quantity", "unit_price", "total"]:
        frame[numeric] = (
            frame[numeric]
            .astype(str)
            .str.replace(" ", "", regex=False)
            .str.replace(",", ".", regex=False)
        )
        frame[numeric] = pd.to_numeric(frame[numeric], errors="coerce").fillna(0.0)
    frame["article_code"] = frame["article_code"].fillna("").astype(str)
    frame["article_code"] = frame["article_code"].str.replace(r'^="?(.+?)"?$', r"\1", regex=True)
    frame["description"] = frame["description"].fillna("").astype(str)
    frame["unit"] = frame["unit"].fillna("").astype(str)
    frame["computed_total"] = (frame["quantity"] * frame["unit_price"]).round(2)
    frame["has_unit_price"] = "unit_price" in present_fields
    frame["has_total"] = "total" in present_fields
    frame = frame[
        ~(
            frame["article_code"].str.strip().eq("")
            & (
                frame["description"].str.strip().eq("")
                | (frame["quantity"].eq(0) & frame["unit_price"].eq(0) & frame["total"].eq(0))
            )
        )
    ]
    return frame


def collapse_duplicate_columns(frame: pd.DataFrame) -> pd.DataFrame:
    for column in set(frame.columns):
        matching = [index for index, name in enumerate(frame.columns) if name == column]
        if len(matching) > 1:
            values = frame.iloc[:, matching].bfill(axis=1).iloc[:, 0]
            frame = frame.drop(columns=[column])
            frame[column] = values
    return frame
