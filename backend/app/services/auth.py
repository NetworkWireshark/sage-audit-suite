from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.security import HASH_PREFIX, create_access_token, hash_password, verify_password
from ..models.entities import User


def ensure_default_users(db: Session) -> None:
    defaults = [
        (settings.default_admin_email, settings.default_admin_password, "admin"),
        (settings.default_user_email, settings.default_user_password, "user"),
    ]
    for email, password, role in defaults:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            db.add(User(email=email, hashed_password=hash_password(password), role=role))
        else:
            if not user.hashed_password.startswith(HASH_PREFIX) and verify_password(password, user.hashed_password):
                user.hashed_password = hash_password(password)
            user.role = role
            user.is_active = True
    db.commit()


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email, User.is_active.is_(True)).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def issue_token(user: User) -> str:
    return create_access_token(user.email, user.role)
