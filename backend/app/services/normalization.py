import re
import unicodedata


def normalize_text(value: object) -> str:
    raw = "" if value is None else str(value)
    raw = unicodedata.normalize("NFKD", raw)
    raw = "".join(char for char in raw if not unicodedata.combining(char))
    raw = raw.upper().replace("-", " ")
    raw = re.sub(r"[^A-Z0-9 ]+", " ", raw)
    return re.sub(r"\s+", " ", raw).strip()


def normalize_code(value: object) -> str:
    return normalize_text(value).replace(" ", "")
