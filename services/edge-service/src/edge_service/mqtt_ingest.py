"""Parsing and validation of MQTT messages from the devices (docs/api/mqtt-contract.md v1):
the ESP32 environmental node (telemetry, status) and the camera process (detections, status).

Pure functions: no network, no database. Anything that does not match the
contract is rejected with a reason and never reaches the pipeline.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, ValidationError, model_validator

from .domain import Detection, Indicator, SensorReading

CONTRACT_VERSION = 1
_ID = re.compile(r"^[a-z0-9-]{1,32}$")

# Readings older than this are dropped: the retention job would delete them anyway.
MAX_AGE = timedelta(days=7)
# A device clock this far ahead of the edge computer is not trusted.
MAX_CLOCK_AHEAD = timedelta(minutes=2)
# A live reading is published within seconds; older means the device clock is wrong.
MAX_LIVE_DELAY = timedelta(minutes=2)
# Indoor relative humidity below this is a corrupted BME280 read, not weather.
MIN_PLAUSIBLE_HUMIDITY = 5.0
# A detection window longer than this is not a "short window" (contract: ~5 s).
MAX_DETECTION_WINDOW = timedelta(seconds=60)

TopicKind = Literal["telemetry", "status", "detections"]


class _Readings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ambient_temp_c: float | None = None
    humidity_pct: float | None = None
    pressure_hpa: float | None = None
    fridge_temp_c: float | None = None


class TelemetryV1(BaseModel):
    model_config = ConfigDict(extra="ignore")
    v: Literal[1]
    device_id: str
    seq: int = Field(ge=0)
    ts: AwareDatetime | None = None
    time_source: Literal["ntp", "rtc", "none"]
    readings: _Readings
    sensors: dict[str, Literal["ok", "error"]] = Field(default_factory=dict)
    rssi: int | None = Field(default=None, ge=-127, le=0)
    buffered: bool = False


class IndicatorResultV1(BaseModel):
    """One indicator over one detection window (camera -> edge)."""

    model_config = ConfigDict(extra="forbid")
    indicator: Indicator
    compliant: bool
    confidence: float = Field(ge=0, le=1)
    frames_observed: int = Field(ge=1)
    frames_compliant: int = Field(ge=0)
    frames_noncompliant: int = Field(ge=0)
    classes: dict[str, int] = Field(default_factory=dict, max_length=16)

    @model_validator(mode="after")
    def _frames_add_up(self) -> IndicatorResultV1:
        if self.frames_compliant + self.frames_noncompliant != self.frames_observed:
            raise ValueError("frames_compliant + frames_noncompliant must equal frames_observed")
        return self


class DetectionsV1(BaseModel):
    """Aggregated AI evidence for one window. Also used by the camera process to build messages."""

    model_config = ConfigDict(extra="ignore")
    v: Literal[1] = 1
    device_id: str
    seq: int = Field(ge=0)
    window_start: AwareDatetime
    window_end: AwareDatetime
    model_version: str = Field(min_length=1, max_length=100)
    frames_analysed: int = Field(ge=0)
    inference_ms: float | None = Field(default=None, ge=0)
    indicators: list[IndicatorResultV1] = Field(default_factory=list, max_length=len(Indicator))

    @model_validator(mode="after")
    def _check_window(self) -> DetectionsV1:
        length = self.window_end - self.window_start
        if length <= timedelta(0) or length > MAX_DETECTION_WINDOW:
            raise ValueError("window must be longer than 0 s and at most 60 s")
        names = [r.indicator for r in self.indicators]
        if len(names) != len(set(names)):
            raise ValueError("an indicator appears more than once")
        if any(r.frames_observed > self.frames_analysed for r in self.indicators):
            raise ValueError("frames_observed exceeds frames_analysed")
        return self


class StatusV1(BaseModel):
    model_config = ConfigDict(extra="allow")
    v: Literal[1]
    device_id: str
    state: Literal["online", "offline"]


@dataclass(frozen=True, slots=True)
class Topic:
    kitchen: str
    device: str
    kind: TopicKind


@dataclass(frozen=True, slots=True)
class Rejected:
    reason: str


@dataclass(frozen=True, slots=True)
class AcceptedDetections:
    detections: list[Detection]  # empty when nothing was observed in the window
    model_version: str
    seq: int
    frames_analysed: int
    inference_ms: float | None


@dataclass(frozen=True, slots=True)
class AcceptedReading:
    reading: SensorReading
    clock_trusted: bool
    buffered: bool


def parse_topic(topic: str) -> Topic | Rejected:
    parts = topic.split("/")
    if len(parts) != 4 or parts[0] != "vk" or parts[3] not in ("telemetry", "status", "detections"):
        return Rejected(f"unexpected topic {topic!r}")
    if not (_ID.match(parts[1]) and _ID.match(parts[2])):
        return Rejected(f"invalid kitchen or device id in {topic!r}")
    kind: TopicKind = "telemetry" if parts[3] == "telemetry" else "status" if parts[3] == "status" else "detections"
    return Topic(parts[1], parts[2], kind)


def _decode(payload: bytes) -> dict[str, Any] | Rejected:
    try:
        data = json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        return Rejected(f"payload is not JSON: {exc}")
    if not isinstance(data, dict):
        return Rejected("payload is not a JSON object")
    if data.get("v") != CONTRACT_VERSION:
        return Rejected(f"unsupported contract version {data.get('v')!r}")
    return data


def _first_error(exc: ValidationError) -> str:
    e = exc.errors()[0]
    where = ".".join(str(p) for p in e["loc"]) or "payload"
    return f"{where}: {e['msg']}"


def parse_telemetry(topic: Topic, payload: bytes, received_at: datetime) -> AcceptedReading | Rejected:
    data = _decode(payload)
    if isinstance(data, Rejected):
        return data
    try:
        msg = TelemetryV1.model_validate(data)
    except ValidationError as exc:
        return Rejected(_first_error(exc))
    if msg.device_id != topic.device:
        return Rejected(f"device_id {msg.device_id!r} does not match topic device {topic.device!r}")

    received_at = received_at.astimezone(UTC)
    clock_trusted = msg.time_source != "none" and msg.ts is not None
    ts = msg.ts.astimezone(UTC) if (clock_trusted and msg.ts) else received_at
    if ts > received_at + MAX_CLOCK_AHEAD:
        # Device clock is ahead (bad RTC): fall back to the arrival time.
        ts, clock_trusted = received_at, False
    elif not msg.buffered and received_at - ts > MAX_LIVE_DELAY:
        # A live (not re-sent) reading cannot be this old: the device clock is behind.
        ts, clock_trusted = received_at, False
    if received_at - ts > MAX_AGE:
        return Rejected(f"reading from {ts.isoformat()} is older than the {MAX_AGE.days}-day retention")

    status: dict[str, Any] = dict(msg.sensors)
    status["time_source"] = msg.time_source if clock_trusted else "edge"
    ambient, humidity, pressure = msg.readings.ambient_temp_c, msg.readings.humidity_pct, msg.readings.pressure_hpa
    if msg.sensors.get("bme280") == "error" or ambient is None:
        # One measurement: if the BME280 failed, none of its three values can be trusted.
        ambient = humidity = pressure = None
    elif humidity is not None and humidity < MIN_PLAUSIBLE_HUMIDITY:
        # A corrupted read (seen on the real board as exactly 0 %); impossible indoors.
        humidity = pressure = None
        status["humidity_check"] = f"rejected: {msg.readings.humidity_pct} % is implausible"
    try:
        reading = SensorReading(
            device_ts=ts,
            seq=msg.seq,
            ambient_temp_c=ambient,
            humidity_pct=humidity,
            pressure_hpa=pressure,
            fridge_temp_c=msg.readings.fridge_temp_c,
            rssi=msg.rssi,
            sensor_status=status,
        )
    except ValidationError as exc:
        # Out-of-range values (e.g. a -127 °C sentinel the firmware failed to null).
        return Rejected(f"invalid reading: {_first_error(exc)}")
    return AcceptedReading(reading, clock_trusted, msg.buffered)


def parse_detections(topic: Topic, payload: bytes, received_at: datetime) -> AcceptedDetections | Rejected:
    """One camera window -> one Detection per observed indicator (detected_at = window end)."""
    data = _decode(payload)
    if isinstance(data, Rejected):
        return data
    try:
        msg = DetectionsV1.model_validate(data)
    except ValidationError as exc:
        return Rejected(_first_error(exc))
    if msg.device_id != topic.device:
        return Rejected(f"device_id {msg.device_id!r} does not match topic device {topic.device!r}")

    received_at = received_at.astimezone(UTC)
    end = msg.window_end.astimezone(UTC)
    # The camera process runs on the edge computer itself (same NTP clock), so a
    # window from the future means a bug, not clock drift.
    if end > received_at + MAX_CLOCK_AHEAD:
        return Rejected(f"window_end {end.isoformat()} is in the future")
    if received_at - end > MAX_AGE:
        return Rejected(f"window from {end.isoformat()} is older than the {MAX_AGE.days}-day retention")

    detections = [
        Detection(
            detected_at=end,
            indicator=r.indicator,
            compliant=r.compliant,
            confidence=r.confidence,
            inference_ms=msg.inference_ms,
            metadata={
                "window_start": msg.window_start.astimezone(UTC).isoformat(),
                "seq": msg.seq,
                "frames_analysed": msg.frames_analysed,
                "frames_observed": r.frames_observed,
                "frames_compliant": r.frames_compliant,
                "frames_noncompliant": r.frames_noncompliant,
                "classes": r.classes,
            },
        )
        for r in msg.indicators
    ]
    return AcceptedDetections(detections, msg.model_version, msg.seq, msg.frames_analysed, msg.inference_ms)


def parse_status(topic: Topic, payload: bytes) -> dict[str, Any] | Rejected:
    data = _decode(payload)
    if isinstance(data, Rejected):
        return data
    try:
        msg = StatusV1.model_validate(data)
    except ValidationError as exc:
        return Rejected(_first_error(exc))
    if msg.device_id != topic.device:
        return Rejected(f"device_id {msg.device_id!r} does not match topic device {topic.device!r}")
    # Keep only small, known-safe fields for devices.last_status.
    allowed = {
        # ESP32 node
        "state",
        "fw",
        "uptime_s",
        "rssi",
        "buffer",
        "time_source",
        "sensors",
        "reset_reason",
        # camera process (never the RTSP URL: it contains the camera password)
        "camera",
        "source",
        "model_version",
        "fps",
        "inference_ms",
        "roi",
        "privacy",
    }
    return {k: v for k, v in data.items() if k in allowed}
