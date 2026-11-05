"""Parsing and validation of MQTT messages from the ESP32 node (docs/api/mqtt-contract.md v1).

Pure functions: no network, no database. Anything that does not match the
contract is rejected with a reason and never reaches the pipeline.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, ValidationError

from .domain import SensorReading

CONTRACT_VERSION = 1
_ID = re.compile(r"^[a-z0-9-]{1,32}$")

# Readings older than this are dropped: the retention job would delete them anyway.
MAX_AGE = timedelta(days=7)
# A device clock this far ahead of the edge computer is not trusted.
MAX_CLOCK_AHEAD = timedelta(minutes=2)
# A live reading is published within seconds; older means the device clock is wrong.
MAX_LIVE_DELAY = timedelta(minutes=2)


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


class StatusV1(BaseModel):
    model_config = ConfigDict(extra="allow")
    v: Literal[1]
    device_id: str
    state: Literal["online", "offline"]


@dataclass(frozen=True, slots=True)
class Topic:
    kitchen: str
    device: str
    kind: Literal["telemetry", "status"]


@dataclass(frozen=True, slots=True)
class Rejected:
    reason: str


@dataclass(frozen=True, slots=True)
class AcceptedReading:
    reading: SensorReading
    clock_trusted: bool
    buffered: bool


def parse_topic(topic: str) -> Topic | Rejected:
    parts = topic.split("/")
    if len(parts) != 4 or parts[0] != "vk" or parts[3] not in ("telemetry", "status"):
        return Rejected(f"unexpected topic {topic!r}")
    if not (_ID.match(parts[1]) and _ID.match(parts[2])):
        return Rejected(f"invalid kitchen or device id in {topic!r}")
    kind: Literal["telemetry", "status"] = "telemetry" if parts[3] == "telemetry" else "status"
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
    try:
        reading = SensorReading(
            device_ts=ts,
            seq=msg.seq,
            ambient_temp_c=msg.readings.ambient_temp_c,
            humidity_pct=msg.readings.humidity_pct,
            pressure_hpa=msg.readings.pressure_hpa,
            fridge_temp_c=msg.readings.fridge_temp_c,
            rssi=msg.rssi,
            sensor_status=status,
        )
    except ValidationError as exc:
        # Out-of-range values (e.g. a -127 °C sentinel the firmware failed to null).
        return Rejected(f"invalid reading: {_first_error(exc)}")
    return AcceptedReading(reading, clock_trusted, msg.buffered)


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
    allowed = {"state", "fw", "uptime_s", "rssi", "buffer", "time_source", "sensors", "reset_reason"}
    return {k: v for k, v in data.items() if k in allowed}
