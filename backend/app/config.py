from pathlib import Path
from functools import lru_cache
import secrets

from typing import Literal
from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(ROOT / ".env", ROOT / "backend" / ".env"),
        env_file_encoding="utf-8",
        populate_by_name=True,
        extra="ignore",
    )
    database_url: str = "sqlite:///./signal.db"
    jwt_secret: str = secrets.token_urlsafe(48)
    jwt_ttl_hours: int = 12
    # Ключ подписи журнала. В промышленной среде задаётся через AUDIT_KEY и хранится
    # отдельно от базы данных; значение по умолчанию годится только для демо.
    audit_key: str = "signal-demo-audit-key"
    business_timezone: str = "Europe/Moscow"
    sla_interval_seconds: int = 60
    storage_directory: Path = Path("storage")
    seed_path: Path = ROOT / "data" / "seed.json"
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    model_directory: Path = Path("models")
    similar_threshold: float = 0.5
    cluster_threshold: float = 0.55
    llm_provider: Literal["gemini", "none"] = "gemini"
    llm_model: str = Field(default="gemini-flash-lite-latest", pattern=r"^[\w.-]+$")
    gemini_api_key: SecretStr = Field(
        default=SecretStr(""),
        validation_alias=AliasChoices("GEMINI_API_KEY", "GEMINI_API"),
        repr=False,
    )
    llm_daily_limit: int = Field(default=200, ge=0, le=10000)
    holidays_path: Path = Path(__file__).with_name("holidays.json")
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache
def settings() -> Settings:
    return Settings()
