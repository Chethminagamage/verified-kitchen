"""Runtime settings, loaded from environment variables or a local `.env` file."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field, HttpUrl, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    supabase_url: HttpUrl
    # Server-only key (sb_secret_... or legacy service_role). Never ship it to a browser or app.
    supabase_secret_key: SecretStr

    kitchen_code: str = "kitchen-001"
    env_device_id: str = "vk-env-01"
    camera_device_id: str = "vk-cam-01"

    # Identifies the evidence source in ai_detections.model_version.
    model_version: str = "simulator-v1"

    # Scoring window: the score at time T uses the evidence from (T - window, T].
    score_window_s: float = Field(default=60.0, gt=0)

    # Storage cadences (see README "Data volume"). Scoring and violation checks
    # still run on every evidence message; only what is stored is thinned.
    sensor_interval_s: int = Field(default=30, ge=1)  # ESP32 message period
    ai_interval_s: int = Field(default=15, ge=1)  # one aggregated detection per indicator
    score_persist_s: float = Field(default=60.0, ge=0)  # store at most one score per period

    log_level: str = "INFO"

    @field_validator("supabase_url")
    @classmethod
    def _not_placeholder(cls, value: HttpUrl) -> HttpUrl:
        if "YOUR_PROJECT_REF" in str(value):
            raise ValueError("still the placeholder from .env.example")
        return value

    @field_validator("supabase_secret_key")
    @classmethod
    def _key_present(cls, value: SecretStr) -> SecretStr:
        key = value.get_secret_value().strip()
        if not key:
            raise ValueError("is empty")
        if key.startswith("sb_publishable_"):
            raise ValueError("is the publishable key; the edge service needs the secret key (sb_secret_...)")
        return SecretStr(key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # values come from the environment / .env
