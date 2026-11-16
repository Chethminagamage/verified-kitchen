"""The live processing loop shared by the simulator and (later) the real MQTT/YOLO inputs.

Each `process()` call is one tick:
  1. store the new evidence,
  2. score the trailing window held in memory,
  3. evaluate conditions (how long each has lasted, at which severity),
  4. apply the non-compensatory caps and store the score,
  5. raise violations whose conditions have persisted, linked to their evidence.
"""

from __future__ import annotations

import logging
from collections import deque
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta

from .domain import Detection, EnvMetric, Indicator, ScoringConfig, SensorReading
from .repository import Repository, ScoreRow, ViolationRow, utc
from .scoring import ScoreResult, apply_caps, compute_score
from .violations import ViolationCandidate, ViolationEngine

log = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class TickOutcome:
    result: ScoreResult
    new_violations: list[ViolationCandidate]
    stored_readings: int
    stored_detections: int


class EvidenceWindow:
    """Recent evidence (with database ids) kept in memory for scoring and linking."""

    def __init__(self, length: timedelta) -> None:
        self.length = length
        self.readings: deque[tuple[SensorReading, int | None]] = deque()
        self.detections: deque[tuple[Detection, int | None]] = deque()

    def add(
        self, readings: Sequence[tuple[SensorReading, int | None]], detections: Sequence[tuple[Detection, int | None]]
    ) -> None:
        self.readings.extend(readings)
        self.detections.extend(detections)

    def prune(self, now: datetime) -> None:
        cutoff = now - self.length
        # Evidence can arrive out of order (offline buffers), so filter rather than pop-left only.
        self.readings = deque(x for x in self.readings if cutoff < x[0].device_ts <= now)
        self.detections = deque(x for x in self.detections if cutoff < x[0].detected_at <= now)

    def latest_failing_detection(self, indicator: Indicator) -> int | None:
        for d, id_ in reversed(self.detections):
            if d.indicator is indicator and not d.compliant and id_ is not None:
                return id_
        return None

    def latest_reading_with(self, metric: EnvMetric) -> int | None:
        for r, id_ in reversed(self.readings):
            if r.value(metric) is not None and id_ is not None:
                return id_
        return None


def link_evidence(candidate: ViolationCandidate, window: EvidenceWindow) -> ViolationRow:
    if candidate.key in Indicator._value2member_map_:
        return ViolationRow(candidate, detection_id=window.latest_failing_detection(Indicator(candidate.key)))
    if candidate.key in EnvMetric._value2member_map_:
        return ViolationRow(candidate, reading_id=window.latest_reading_with(EnvMetric(candidate.key)))
    return ViolationRow(candidate)


class Pipeline:
    def __init__(
        self,
        repo: Repository,
        *,
        kitchen_id: str,
        config: ScoringConfig,
        env_device_id: str,
        camera_device_id: str,
        model_version: str,
        window_s: float | None = None,
        score_persist_s: float = 0.0,
        report_env_device: bool = True,
        report_camera_device: bool = True,
    ) -> None:
        self._repo = repo
        self._kitchen_id = kitchen_id
        self._config = config
        self._env_device = env_device_id
        self._camera_device = camera_device_id
        self._model_version = model_version
        # The window is part of the versioned scoring rules; an explicit value overrides it (tests, tools).
        window_s = window_s if window_s is not None else config.thresholds.window_s
        self._window_s = window_s
        self._score_persist_s = score_persist_s
        self._last_persisted: datetime | None = None
        # False when a real ESP32 reports its own health over MQTT (EdgeRunner does it).
        self._report_env_device = report_env_device
        self._report_camera_device = report_camera_device
        self.window = EvidenceWindow(timedelta(seconds=window_s))
        self.engine = ViolationEngine(config.thresholds, window_s)

    @property
    def config(self) -> ScoringConfig:
        return self._config

    def _due_to_persist(self, now: datetime) -> bool:
        if self._last_persisted is None:
            return True
        # Small tolerance so a 60 s period is not skipped by timer jitter.
        return (now - self._last_persisted).total_seconds() >= self._score_persist_s - 0.5

    def process(
        self,
        now: datetime,
        readings: Sequence[SensorReading],
        detections: Sequence[Detection],
        *,
        model_version: str | None = None,
    ) -> TickOutcome:
        """`model_version` overrides the configured one for these detections (the real
        camera reports the exact model that produced each window)."""
        now = utc(now)
        model_version = model_version or self._model_version

        reading_ids = (
            self._repo.insert_sensor_readings(self._kitchen_id, self._env_device, readings) if readings else {}
        )
        detection_ids = (
            self._repo.insert_detections(self._kitchen_id, self._camera_device, model_version, detections)
            if detections
            else {}
        )
        self.window.add(
            [(r, reading_ids.get(utc(r.device_ts))) for r in readings],
            [(d, detection_ids.get((d.indicator, utc(d.detected_at)))) for d in detections],
        )
        self.window.prune(now)

        raw = compute_score(
            [d for d, _ in self.window.detections],
            [r for r, _ in self.window.readings],
            self._config,
        )
        open_keys = self._repo.open_violation_keys(self._kitchen_id)
        evaluation = self.engine.evaluate(now, raw, open_keys)
        result = apply_caps(raw, evaluation.active, now, self._config.thresholds)
        for cap in result.caps_applied:
            log.warning("score capped at %.0f: %s", cap.cap, cap.reason)

        if result.overall is not None and self._due_to_persist(now):
            self._repo.insert_hygiene_scores(
                self._kitchen_id,
                self._config.id,
                [ScoreRow(now, now - self.window.length, now, result)],
            )
            self._last_persisted = now

        if evaluation.new:
            self._repo.insert_violations(self._kitchen_id, [link_evidence(c, self.window) for c in evaluation.new])
            for c in evaluation.new:
                log.warning("VIOLATION [%s] %s — %s", c.severity.value, c.title, c.description)

        if readings and self._report_env_device:
            latest = max(readings, key=lambda r: r.device_ts)
            self._repo.touch_device(
                self._env_device, now, {"rssi": latest.rssi, "sensors": latest.sensor_status, "seq": latest.seq}
            )
        if detections and self._report_camera_device:
            ms = [d.inference_ms for d in detections if d.inference_ms is not None]
            self._repo.touch_device(
                self._camera_device,
                now,
                {"model_version": model_version, "inference_ms": round(sum(ms) / len(ms), 1) if ms else None},
            )

        return TickOutcome(result, evaluation.new, len(reading_ids), len(detection_ids))
