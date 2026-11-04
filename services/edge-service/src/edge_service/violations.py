"""Violation rules (pure, stateful only in memory).

A condition must persist for a configured time before it becomes a violation, so
a single misdetection or a fridge door opened for a few seconds does not raise an
incident. While a violation for the same key is still open (active or
acknowledged) in the database, no duplicate is raised.
"""

from __future__ import annotations

from collections.abc import Collection
from dataclasses import dataclass, field
from datetime import datetime

from .domain import EnvMetric, EvidenceSource, Indicator, Pillar, Severity, Thresholds
from .scoring import ScoreResult

AI_TITLES: dict[Indicator, str] = {
    Indicator.HAIRNET: "Hairnet not detected",
    Indicator.MASK: "Mask not detected",
    Indicator.GLOVES: "Gloves not detected",
    Indicator.CLEAN_SURFACE: "Preparation surface not clean",
    Indicator.DIRTY_SURFACE: "Dirty surface detected",
    Indicator.FOOD_SPILL: "Food spill detected",
    Indicator.FOOD_WASTE: "Food waste left on preparation area",
}


@dataclass(frozen=True, slots=True)
class ViolationCandidate:
    key: str  # stored in violations.indicator; an Indicator or EnvMetric value
    occurred_at: datetime  # when the condition started
    pillar: Pillar
    source: EvidenceSource
    title: str
    description: str
    severity: Severity
    score_impact: float | None
    ai_confidence: float | None = None
    sensor_value: float | None = None
    sensor_unit: str | None = None


@dataclass(slots=True)
class Evaluation:
    new: list[ViolationCandidate] = field(default_factory=list)
    failing: set[str] = field(default_factory=set)


@dataclass(frozen=True, slots=True)
class _Condition:
    pillar: Pillar
    source: EvidenceSource
    title: str
    description: str
    severity: Severity
    score_impact: float | None
    ai_confidence: float | None = None
    sensor_value: float | None = None
    sensor_unit: str | None = None


class ViolationEngine:
    def __init__(self, thresholds: Thresholds, window_s: float) -> None:
        self._t = thresholds
        self._window_s = window_s
        self._first_failing: dict[str, datetime] = {}
        # Keys already raised during the current failing episode. Guards against
        # duplicates even if the database read of open violations is stale.
        self._raised: set[str] = set()

    def evaluate(self, now: datetime, result: ScoreResult, open_keys: Collection[str]) -> Evaluation:
        conditions = self._conditions(result)
        for key in list(self._first_failing):
            if key not in conditions:
                del self._first_failing[key]
                self._raised.discard(key)

        out = Evaluation(failing=set(conditions))
        for key, c in conditions.items():
            started = self._first_failing.setdefault(key, now)
            persistence = self._t.ai_persistence_s if c.source is EvidenceSource.AI else self._t.sensor_persistence_s
            if key in self._raised or key in open_keys:
                continue
            if (now - started).total_seconds() >= persistence:
                self._raised.add(key)
                out.new.append(
                    ViolationCandidate(
                        key=key,
                        occurred_at=started,
                        pillar=c.pillar,
                        source=c.source,
                        title=c.title,
                        description=c.description,
                        severity=c.severity,
                        score_impact=c.score_impact,
                        ai_confidence=c.ai_confidence,
                        sensor_value=c.sensor_value,
                        sensor_unit=c.sensor_unit,
                    )
                )
        return out

    # ------------------------------------------------------------------
    def _conditions(self, result: ScoreResult) -> dict[str, _Condition]:
        conditions: dict[str, _Condition] = {}
        window = _fmt_window(self._window_s)

        for indicator, r in result.indicators.items():
            if r.score is None or r.score >= 100.0 * self._t.indicator_fail_below:
                continue
            pillar = indicator.pillar
            conditions[indicator.value] = _Condition(
                pillar=pillar,
                source=EvidenceSource.AI,
                title=AI_TITLES[indicator],
                description=(
                    f"{indicator.value.replace('_', ' ').capitalize()} compliance was "
                    f"{r.score:.0f}% over the last {window} "
                    f"({r.confident_samples} confident observations)."
                ),
                severity=self._t.ai_severity[indicator],
                score_impact=_impact(result, pillar, r.score, _peers(result, pillar)),
                ai_confidence=None if r.mean_confidence is None else round(r.mean_confidence, 3),
            )

        for metric, m in result.metrics.items():
            if m.mean is None or m.score is None:
                continue
            band = self._t.environment[metric]
            deviation = band.deviation(m.mean)
            if deviation == 0:
                continue
            above = deviation > 0
            limit = band.max if above else band.min
            conditions[metric.value] = _Condition(
                pillar=Pillar.ENVIRONMENTAL,
                source=EvidenceSource.SENSOR,
                title=f"{metric.label} {'above' if above else 'below'} safe limit",
                description=(
                    f"Mean {metric.label.lower()} was {m.mean:.1f}{metric.unit} over the last "
                    f"{window} (limit {limit:.1f}{metric.unit})."
                ),
                severity=_sensor_severity(metric, abs(deviation), band.tolerance, above),
                score_impact=_impact(result, Pillar.ENVIRONMENTAL, m.score, _peers(result, Pillar.ENVIRONMENTAL)),
                sensor_value=round(m.mean, 2),
                sensor_unit=metric.unit,
            )
        return conditions


def _peers(result: ScoreResult, pillar: Pillar) -> int:
    if pillar is Pillar.ENVIRONMENTAL:
        return sum(1 for m in result.metrics.values() if m.score is not None)
    return sum(1 for i, r in result.indicators.items() if i.pillar is pillar and r.score is not None)


def _impact(result: ScoreResult, pillar: Pillar, score: float, peers: int) -> float | None:
    """Overall-score points lost because of this one indicator in the window."""
    weight = result.weights_used.get(pillar)
    if weight is None or peers == 0:
        return None
    return round(weight * (100.0 - score) / peers, 2)


def _sensor_severity(metric: EnvMetric, deviation: float, tolerance: float, above: bool) -> Severity:
    if metric is EnvMetric.FRIDGE_TEMP_C:
        if above and deviation >= tolerance:
            return Severity.CRITICAL
        return Severity.HIGH
    if metric is EnvMetric.AMBIENT_TEMP_C:
        return Severity.HIGH if deviation >= tolerance else Severity.MEDIUM
    return Severity.MEDIUM if deviation >= tolerance else Severity.LOW


def _fmt_window(seconds: float) -> str:
    if seconds >= 120 and seconds % 60 == 0:
        return f"{int(seconds // 60)} min"
    return f"{seconds:.0f} s"
