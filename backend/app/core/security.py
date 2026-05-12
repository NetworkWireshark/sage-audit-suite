from datetime import datetime, timedelta, timezone
from hashlib import sha256

import bcrypt
from jose import jwt

from .config import settings


ALGORITHM = "HS256"
HASH_PREFIX = "sha256-bcrypt$"


def _password_bytes(password: str) -> bytes:
    # Bcrypt only accepts 72 bytes. Pre-hashing keeps behavior stable for long passwords.
    return sha256(password.encode("utf-8")).digest()


def hash_password(password: str) -> str:
    digest = bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode("utf-8")
    return f"{HASH_PREFIX}{digest}"


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        if hashed_password.startswith(HASH_PREFIX):
            return bcrypt.checkpw(_password_bytes(password), hashed_password.removeprefix(HASH_PREFIX).encode("utf-8"))
        # Legacy compatibility for standard bcrypt hashes created before the prehash format.
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "role": role, "exp": expires_at}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)
