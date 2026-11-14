"""Settings of the camera process (from the environment or `.env`).

Deliberately separate from the edge service's `Settings`: the camera process
never talks to Supabase, so it does not need (and never reads) the secret key.
It only needs its own MQTT account, which may publish nothing but its own topics.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import AliasChoices, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from .roi import Roi


class VisionSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    kitchen_code: str = "kitchen-001"
    camera_device_id: str = "vk-cam-01"

    # Model: CoreML package (Neural Engine) or .pt weights. Not in git; see models/.gitignore.
    vision_model: Path = Path("models/ppe_yolo26n_best.mlpackage")
    # "0" = built-in webcam (any integer = camera index), "rtsp" = $VK_RTSP_URL, or a video file path.
    vision_source: str = "0"
    # rtsp://user:pass@ip:554/stream1 - a secret (contains the camera password); never logged or published.
    vk_rtsp_url: SecretStr | None = Field(default=None, validation_alias=AliasChoices("VK_RTSP_URL", "vk_rtsp_url"))

    vision_fps: float = Field(default=5.0, gt=0, le=30)  # frames analysed per second
    vision_window_s: float = Field(default=5.0, ge=1, le=60)  # one result per indicator per window
    vision_imgsz: int = Field(default=640, ge=320, le=1280)
    vision_conf: float = Field(default=0.4, ge=0.05, le=0.95)  # minimum box confidence
    vision_min_frames: int = Field(default=3, ge=1)  # frames an indicator must be seen in per window
    vision_roi: str = ""  # worker region "x,y,w,h" as fractions; empty = full frame
    vision_status_interval_s: float = Field(default=30.0, ge=5)

    mqtt_host: str = "127.0.0.1"
    mqtt_port: int = Field(default=1883, ge=1, le=65535)
    vision_mqtt_password: SecretStr | None = None  # the camera's own broker account (= camera_device_id)

    log_level: str = "INFO"

    @field_validator("vision_roi")
    @classmethod
    def _valid_roi(cls, value: str) -> str:
        Roi.parse(value)  # raises a clear error for a malformed region
        return value

    @property
    def roi(self) -> Roi | None:
        return Roi.parse(self.vision_roi)

    @property
    def model_path(self) -> Path:
        return self.vision_model.expanduser()
