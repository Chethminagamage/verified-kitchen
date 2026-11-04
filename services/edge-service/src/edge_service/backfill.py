"""Generate a realistic history (default: last 7 days) for reports and charts.

Uses the same Simulator, scoring and violation rules as the live pipeline, then
writes the result in bulk. Incidents that recovered are stored as `resolved`;
an incident still ongoing at the end stays `active`.
"""

from __future__ import annotations

import logging
import math
import random
from collections import Counter
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from .domain import Detection, EnvMetric, Indicator, ScoringConfig, SensorReading
from .pipeline import EvidenceWindow
from .repository import Repository, ScoreRow, ViolationRow, utc
from .scoring import compute_score
from .simulator import Phase, Simulator
from .violations import ViolationCandidate, ViolationEngine

log = logging.getLogger(__name__)

OPEN_AT = time(7, 0)
CLOSE_AT = time(22, 0)

# Incident templates drawn at random: (name, failing AI indicators, fridge target,
# humidity target, duration range in minutes). None = keep the normal value.
_G, _H, _M = Indicator.GLOVES, Indicator.HAIRNET, Indicator.MASK
_TEMPLATES: tuple[tuple[str, frozenset[Indicator], float | None, float | None, tuple[int, int]], ...] = (
    ("gloves", frozenset({_G}), None, None, (6, 30)),
    ("ppe", frozenset({_G, _H}), None, None, (6, 25)),
    ("mask", frozenset({_M}), None, None, (6, 20)),
    ("spill", frozenset({Indicator.FOOD_SPILL, Indicator.DIRTY_SURFACE, Indicator.CLEAN_SURFACE}), None, None, (8, 35)),
    ("waste", frozenset({Indicator.FOOD_WASTE}), None, None, (10, 45)),
    ("fridge", frozenset(), 10.0, None, (12, 40)),
    ("humid", frozenset(), None, 79.0, (20, 60)),
)
_ALL_DAY = {"fridge", "humid"}  # equipment / weather incidents can happen while closed


@dataclass(frozen=True, slots=True)
class _Incident:
    name: str
    start: datetime
    end: datetime
    failing: frozenset[Indicator]
    fridge_c: float | None
    humidity_pct: float | None


@dataclass(slots=True)
class _OpenViolation:
    candidate: ViolationCandidate
    detection_ref: tuple[Indicator, datetime] | None
    reading_ref: datetime | None
    resolved_at: datetime | None = None


@dataclass(slots=True)
class History:
    start: datetime
    end: datetime
    readings: list[SensorReading] = field(default_factory=list)
    detections: list[Detection] = field(default_factory=list)
    scores: list[ScoreRow] = field(default_factory=list)
    violations: list[_OpenViolation] = field(default_factory=list)

    def summary(self) -> str:
        overall = [s.result.overall for s in self.scores if s.result.overall is not None]
        by_sev = Counter(v.candidate.severity.value for v in self.violations)
        active = sum(1 for v in self.violations if v.resolved_at is None)
        return (
            f"{self.start:%Y-%m-%d %H:%M} -> {self.end:%Y-%m-%d %H:%M} UTC: "
            f"{len(self.readings)} sensor readings, {len(self.detections)} AI detections, "
            f"{len(self.scores)} scores (mean {sum(overall) / max(len(overall), 1):.1f}), "
            f"{len(self.violations)} violations {dict(by_sev)} ({active} still active)"
        )


def _is_open(local: datetime) -> bool:
    return OPEN_AT <= local.time() < CLOSE_AT


def _plan_incidents(rng: random.Random, start: datetime, end: datetime, tz: ZoneInfo) -> list[_Incident]:
    incidents: list[_Incident] = []
    day = start.astimezone(tz).date()
    while datetime.combine(day, OPEN_AT, tz) < end:
        for _ in range(rng.randint(2, 4)):
            name, failing, fridge_c, humidity, (lo, hi) = rng.choice(_TEMPLATES)
            if name in _ALL_DAY:
                begin = datetime.combine(day, time(0), tz) + timedelta(minutes=rng.randint(0, 24 * 60 - hi))
            else:
                open_minutes = (CLOSE_AT.hour - OPEN_AT.hour) * 60
                begin = datetime.combine(day, OPEN_AT, tz) + timedelta(minutes=rng.randint(0, open_minutes - hi))
            length = timedelta(minutes=rng.randint(lo, hi))
            if start <= begin and begin + length <= end:
                incidents.append(_Incident(name, begin, begin + length, failing, fridge_c, humidity))
        day += timedelta(days=1)
    return incidents


def _phase_at(t: datetime, tz: ZoneInfo, incidents: list[_Incident]) -> Phase:
    local = t.astimezone(tz)
    hours = local.hour + local.minute / 60
    diurnal = math.sin(2 * math.pi * (hours - 9) / 24)  # warmest mid-afternoon
    open_ = _is_open(local)
    base = Phase(
        duration_s=0,
        label="open" if open_ else "closed",
        ambient_c=25.5 + 3.5 * diurnal + (1.0 if open_ else 0.0),  # cooking adds heat
        humidity_pct=60.0 - 6.0 * diurnal,  # peaks ~66 % before dawn
        worker_present=open_,
        camera_on=open_,
    )
    for inc in incidents:
        if inc.start <= t < inc.end:
            return replace(
                base,
                label=f"incident: {inc.name}",
                failing=inc.failing if open_ else frozenset(),
                fridge_c=base.fridge_c if inc.fridge_c is None else inc.fridge_c,
                humidity_pct=base.humidity_pct if inc.humidity_pct is None else inc.humidity_pct,
            )
    return base


def generate_history(
    config: ScoringConfig,
    *,
    days: float = 7,
    step_s: float = 120,
    end: datetime | None = None,
    seed: int = 42,
    tz: str = "Asia/Colombo",
) -> History:
    zone = ZoneInfo(tz)
    end = utc(end or datetime.now(UTC)).replace(second=0, microsecond=0)
    start = end - timedelta(days=days)
    rng = random.Random(seed)
    sim = Simulator(seed=seed + 1)
    incidents = _plan_incidents(rng, start, end, zone)

    window_s = 5 * step_s  # enough samples per indicator to satisfy min_samples
    window = EvidenceWindow(timedelta(seconds=window_s))
    engine = ViolationEngine(config.thresholds, window_s)
    open_: dict[str, _OpenViolation] = {}
    history = History(start, end)

    t = start + timedelta(seconds=step_s)
    while t <= end:
        readings, detections = sim.step(t, step_s, _phase_at(t, zone, incidents))
        history.readings += readings
        history.detections += detections
        window.add([(r, None) for r in readings], [(d, None) for d in detections])
        window.prune(t)

        result = compute_score([d for d, _ in window.detections], [r for r, _ in window.readings], config)
        if result.overall is not None:
            history.scores.append(ScoreRow(t, t - window.length, t, result))

        evaluation = engine.evaluate(t, result, open_.keys())
        for key in [k for k in open_ if k not in evaluation.failing]:
            # Condition cleared: an operator closes it a few minutes later.
            open_.pop(key).resolved_at = t + timedelta(minutes=rng.randint(2, 15))
        for c in evaluation.new:
            ov = _OpenViolation(c, _detection_ref(c, window), _reading_ref(c, window))
            open_[c.key] = ov
            history.violations.append(ov)
        t += timedelta(seconds=step_s)

    for ov in history.violations:
        if ov.resolved_at is not None and ov.resolved_at > end:
            ov.resolved_at = end
    return history


def _detection_ref(c: ViolationCandidate, window: EvidenceWindow) -> tuple[Indicator, datetime] | None:
    if c.key not in Indicator._value2member_map_:
        return None
    ind = Indicator(c.key)
    for d, _ in reversed(window.detections):
        if d.indicator is ind and not d.compliant:
            return ind, utc(d.detected_at)
    return None


def _reading_ref(c: ViolationCandidate, window: EvidenceWindow) -> datetime | None:
    if c.key not in EnvMetric._value2member_map_:
        return None
    return utc(window.readings[-1][0].device_ts) if window.readings else None


def write_history(
    repo: Repository,
    history: History,
    *,
    kitchen_id: str,
    config: ScoringConfig,
    env_device_id: str,
    camera_device_id: str,
    model_version: str,
) -> None:
    log.info("writing %d sensor readings…", len(history.readings))
    reading_ids = repo.insert_sensor_readings(kitchen_id, env_device_id, history.readings)
    log.info("writing %d AI detections…", len(history.detections))
    detection_ids = repo.insert_detections(kitchen_id, camera_device_id, model_version, history.detections)
    log.info("writing %d hygiene scores…", len(history.scores))
    repo.insert_hygiene_scores(kitchen_id, config.id, history.scores)
    log.info("writing %d violations (each also creates an audit record)…", len(history.violations))
    repo.insert_violations(
        kitchen_id,
        [
            ViolationRow(
                ov.candidate,
                detection_id=detection_ids.get(ov.detection_ref) if ov.detection_ref else None,
                reading_id=reading_ids.get(ov.reading_ref) if ov.reading_ref else None,
                resolved_at=ov.resolved_at,
            )
            for ov in sorted(history.violations, key=lambda v: v.candidate.occurred_at)
        ],
    )
