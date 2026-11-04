from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest

from edge_service.domain import (
    Detection,
    Indicator,
    Pillar,
    ScoringConfig,
    SensorReading,
    Thresholds,
)
from edge_service.repository import ScoreRow, ViolationRow

T0 = datetime(2026, 11, 4, 8, 0, tzinfo=UTC)


@pytest.fixture
def config() -> ScoringConfig:
    return ScoringConfig(
        id=1,
        version="test",
        weights={Pillar.PERSONAL: 0.4, Pillar.FOOD_PREP: 0.35, Pillar.ENVIRONMENTAL: 0.25},
        thresholds=Thresholds(),
    )


def det(indicator: Indicator, compliant: bool, conf: float = 0.9, at: datetime = T0) -> Detection:
    return Detection(detected_at=at, indicator=indicator, compliant=compliant, confidence=conf)


def reading(
    at: datetime = T0, *, fridge: float | None = 3.5, ambient: float | None = 27.0, humidity: float | None = 58.0
) -> SensorReading:
    return SensorReading(device_ts=at, ambient_temp_c=ambient, humidity_pct=humidity, fridge_temp_c=fridge)


def all_compliant(at: datetime = T0) -> list[Detection]:
    return [det(i, True, at=at) for i in Indicator]


class FakeRepository:
    """In-memory Repository used to test the pipeline without a network."""

    def __init__(self, config: ScoringConfig) -> None:
        self.config = config
        self.readings: list[SensorReading] = []
        self.detections: list[Detection] = []
        self.scores: list[ScoreRow] = []
        self.violations: list[ViolationRow] = []
        self.devices: dict[str, dict[str, Any]] = {}
        self.device_statuses: dict[str, dict[str, Any]] = {}
        self._next = 1

    def get_kitchen_id(self, code: str) -> str:
        return "k1"

    def get_active_config(self) -> ScoringConfig:
        return self.config

    def insert_sensor_readings(self, kitchen_id: str, device_id: str, readings: Any) -> dict[datetime, int]:
        out = {}
        for r in readings:
            out[r.device_ts.astimezone(UTC)] = self._next
            self._next += 1
            self.readings.append(r)
        return out

    def insert_detections(self, kitchen_id: str, device_id: str, mv: str, detections: Any) -> dict[Any, int]:
        out = {}
        for d in detections:
            out[(d.indicator, d.detected_at.astimezone(UTC))] = self._next
            self._next += 1
            self.detections.append(d)
        return out

    def insert_hygiene_scores(self, kitchen_id: str, config_id: int, rows: Any) -> None:
        self.scores.extend(rows)

    def open_violation_keys(self, kitchen_id: str) -> set[str]:
        return {v.candidate.key for v in self.violations if v.resolved_at is None}

    def insert_violations(self, kitchen_id: str, rows: Any) -> None:
        self.violations.extend(rows)

    def touch_device(self, device_id: str, seen_at: datetime, status: dict[str, Any]) -> None:
        self.devices[device_id] = {"seen_at": seen_at, **status}

    def set_device_status(self, device_id: str, status: dict[str, Any]) -> None:
        self.device_statuses[device_id] = status

    def list_devices(self, kitchen_id: str) -> dict[str, str]:
        return {"vk-env-01": "env_node", "vk-cam-01": "camera"}

    def count_scores_between(self, kitchen_id: str, start: datetime, end: datetime) -> int:
        return sum(1 for s in self.scores if start <= s.computed_at <= end)


def ticks(n: int, step_s: float = 10) -> list[datetime]:
    return [T0 + timedelta(seconds=step_s * (i + 1)) for i in range(n)]
