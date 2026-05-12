from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Sage Audit Suite"
    app_env: str = "development"
    api_v1_prefix: str = "/api"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 480
    database_url: str = "sqlite:///./sage_audit.db"
    upload_dir: Path = Path("./uploads")
    report_dir: Path = Path("./reports")
    default_admin_email: str = "admin@sage.local"
    default_admin_password: str = "Admin123!"
    default_user_email: str = "user@sage.local"
    default_user_password: str = "User123!"
    tesseract_cmd: str | None = None
    poppler_path: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.report_dir.mkdir(parents=True, exist_ok=True)
