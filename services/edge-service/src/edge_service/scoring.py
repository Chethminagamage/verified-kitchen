"""Hygiene scoring engine (pure functions, no I/O). All rules come from the versioned
scoring config (`Thresholds`), so every stored score is traceable to its rules.

Live score at time T, over the evidence in (T - window, T]:

1. **Indicator** (AI) = 100 x share of confident windows in which the hygienic state
   was observed. Breach evidence needs more confidence than compliance evidence
   (`min_confidence_noncompliant`). Fewer than `min_samples` confident windows =
   no evidence (unknown), never 0 or 100.
2. **Item.** AI items pool indicators that describe the same thing ("surface" =
   clean + dirty surface classifications). Sensor items score the window's readings
   against the safe band: the refrigerator by **time at temperature** (mean of the
   per-reading scores, so a door opening is a short dent and sustained warming the
   full penalty), kitchen air by the **median** (robust to corrupted reads).
3. **Pillar** = item-weighted mean of the items that have evidence.
4. **Overall** = pillar-weighted mean of the pillars that have evidence. Weights are
   re-normalised over what is available; the missing pillars are recorded.
5. **Caps** (`apply_caps`): a critical condition that has persisted limits the
   overall score however good the rest is (non-compensatory). Applied after the
   violation engine has established how long each condition has lasted.
6. **Grade** A-D from the configured bands.

`details()` stores the full breakdown with every score (explainability), including
how many points each item cost ("impacts"), which drives "what to fix first".
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field, replace
from datetime import datetime
from statistics import fmean, median
from typing import Any

from .domain import (
    AI_ITEM_INDICATORS,
    PILLAR_ITEMS,
    Detection,
    EnvMetric,
    Indicator,
    Pillar,
    ScoringConfig,
    SensorReading,
    Severity,
    Thresholds,
)

SEVERITY_ORDER: dict[Severity, int] = {Severity.LOW: 0, Severity.MEDIUM: 1, Severity.HIGH: 2, Severity.CRITICAL: 3}


@dataclass(frozen=True, slots=True)
class IndicatorResult:
    score: float | None
    samples: int
    confident_samples: int
    mean_confidence: float | None


@dataclass(frozen=True, slots=True)
class MetricResult:
    value: float | None  # the window's representative value (median or mean), for display and rules
    score: float | None
    samples: int
    aggregation: str = "mean"


@dataclass(frozen=True, slots=True)
class ItemResult:
    pillar: Pillar
    score: float | None
    weight: float  # configured relative weight within the pillar
    impact: float | None = None  # overall-score points lost because of this item


@dataclass(frozen=True, slots=True)
class CapApplied:
    key: str
    cap: float
    reason: str
    since: datetime


@dataclass(frozen=True, slots=True)
class ScoreResult:
    overall: float | None
    pillars: dict[Pillar, float | None]
    indicators: dict[Indicator, IndicatorResult]
    metrics: dict[EnvMetric, MetricResult]
    weights_used: dict[Pillar, float]
    config_version: str
    items: dict[str, ItemResult] = field(default_factory=dict)
    grade: str | None = None
    uncapped_overall: float | None = None
    caps_applied: tuple[CapApplied, ...] = ()

    def details(self) -> dict[str, Any]:
        """JSON breakdown stored in hygiene_scores.details (explainability)."""
        impacts = sorted(
            ((k, i.impact) for k, i in self.items.items() if i.impact is not None and i.impact > 0.05),
            key=lambda kv: kv[1],
            reverse=True,
        )
        return {
            "config_version": self.config_version,
            "grade": self.grade,
            "uncapped_overall": _r(self.uncapped_overall),
            "caps_applied": [
                {"key": c.key, "cap": c.cap, "reason": c.reason, "since": c.since.isoformat()}
                for c in self.caps_applied
            ],
            "weights_used": {p.value: round(w, 4) for p, w in self.weights_used.items()},
            "missing_pillars": [p.value for p, s in self.pillars.items() if s is None],
            "items": {
                k: {
                    "pillar": i.pillar.value,
                    "score": _r(i.score),
                    "weight": round(i.weight, 4),
                    "impact": _r(i.impact),
                }
                for k, i in self.items.items()
            },
            "impacts": [{"item": k, "points": _r(v)} for k, v in impacts],
            "indicators": {
                i.value: {
                    "score": _r(r.score),
                    "samples": r.samples,
                    "confident_samples": r.confident_samples,
                    "mean_confidence": _r(r.mean_confidence, 3),
                }
                for i, r in self.indicators.items()
            },
            "environment": {
                m.value: {
                    "value": _r(r.value),
                    "score": _r(r.score),
                    "samples": r.samples,
                    "aggregation": r.aggregation,
                }
                for m, r in self.metrics.items()
            },
        }


def _r(value: float | None, digits: int = 2) -> float | None:
    return None if value is None else round(value, digits)


# ---------------------------------------------------------------------------- AI
def _confident(d: Detection, t: Thresholds) -> bool:
    return d.confidence >= (t.min_confidence if d.compliant else t.min_confidence_noncompliant)


def score_indicator(detections: Iterable[Detection], t: Thresholds) -> IndicatorResult:
    all_ = list(detections)
    confident = [d for d in all_ if _confident(d, t)]
    if len(confident) < t.min_samples:
        return IndicatorResult(None, len(all_), len(confident), None)
    compliant = sum(1 for d in confident if d.compliant)
    return IndicatorResult(
        score=100.0 * compliant / len(confident),
        samples=len(all_),
        confident_samples=len(confident),
        mean_confidence=fmean(d.confidence for d in confident),
    )


# ------------------------------------------------------------------------ sensors
def score_metric(readings: Sequence[SensorReading], metric: EnvMetric, t: Thresholds) -> MetricResult:
    values = [v for r in readings if (v := r.value(metric)) is not None]
    aggregation = t.sensor_aggregation.get(metric, "median")
    if not values:
        return MetricResult(None, None, 0, aggregation)
    band = t.environment[metric]
    if aggregation == "time_weighted":
        # Readings arrive at a fixed cadence, so each represents equal time: the
        # score is the time-weighted share of the window spent in the safe band.
        return MetricResult(fmean(values), fmean(band.score(v) for v in values), len(values), aggregation)
    value = median(values) if aggregation == "median" else fmean(values)
    return MetricResult(value, band.score(value), len(values), aggregation)


# ----------------------------------------------------------------------- weighting
def weighted_mean(
    scores: Mapping[str, float | None], weights: Mapping[str, float]
) -> tuple[float | None, dict[str, float]]:
    """Weighted mean over the entries that have a score; weights re-normalised over those."""
    present = {k: s for k, s in scores.items() if s is not None}
    total = sum(weights[k] for k in present)
    if not present or total <= 0:
        return None, {}
    used = {k: weights[k] / total for k in present}
    return sum(used[k] * s for k, s in present.items()), used


def compute_score(
    detections: Sequence[Detection],
    readings: Sequence[SensorReading],
    config: ScoringConfig,
) -> ScoreResult:
    t = config.thresholds
    by_indicator: dict[Indicator, list[Detection]] = {i: [] for i in Indicator}
    for d in detections:
        by_indicator[d.indicator].append(d)

    indicators = {i: score_indicator(ds, t) for i, ds in by_indicator.items()}
    metrics = {m: score_metric(readings, m, t) for m in EnvMetric}

    item_scores: dict[str, float | None] = {
        item: score_indicator([d for i in inds for d in by_indicator[i]], t).score
        for item, inds in AI_ITEM_INDICATORS.items()
    }
    item_scores.update({m.value: r.score for m, r in metrics.items()})

    pillars: dict[Pillar, float | None] = {}
    within: dict[Pillar, dict[str, float]] = {}
    for pillar, keys in PILLAR_ITEMS.items():
        pillars[pillar], within[pillar] = weighted_mean(
            {k: item_scores[k] for k in keys}, {k: t.item_weight(k) for k in keys}
        )

    overall, used = weighted_mean(
        {p.value: s for p, s in pillars.items()}, {p.value: config.weights[p] for p in Pillar}
    )
    weights_used = {Pillar(p): w for p, w in used.items()}

    items = {
        k: ItemResult(
            pillar=pillar,
            score=item_scores[k],
            weight=t.item_weight(k),
            impact=(
                weights_used[pillar] * within[pillar][k] * (100.0 - s)
                if (s := item_scores[k]) is not None and pillar in weights_used
                else None
            ),
        )
        for pillar, keys in PILLAR_ITEMS.items()
        for k in keys
    }
    return ScoreResult(
        overall=overall,
        pillars=pillars,
        indicators=indicators,
        metrics=metrics,
        weights_used=weights_used,
        config_version=config.version,
        items=items,
        grade=None if overall is None else t.grade(overall),
        uncapped_overall=overall,
    )


# ---------------------------------------------------------------------------- caps
@dataclass(frozen=True, slots=True)
class ActiveCondition:
    """A failing condition as tracked by the violation engine."""

    severity: Severity
    # When the condition first reached each severity level (and has stayed at or above it).
    since: dict[Severity, datetime]

    def at_least_since(self, level: Severity) -> datetime | None:
        return self.since.get(level) if SEVERITY_ORDER[self.severity] >= SEVERITY_ORDER[level] else None


def apply_caps(result: ScoreResult, active: Mapping[str, ActiveCondition], now: datetime, t: Thresholds) -> ScoreResult:
    """Limit the overall score while a critical condition has persisted (non-compensatory)."""
    if result.overall is None:
        return result
    applied: list[CapApplied] = []
    for rule in t.caps:
        condition = active.get(rule.key)
        if condition is None or not t.cap_active(rule):
            continue
        since = condition.at_least_since(rule.min_severity)
        if since is not None and (now - since).total_seconds() >= rule.after_s:
            applied.append(CapApplied(rule.key, rule.cap, rule.reason, since))
    if not applied:
        return result
    capped = min(result.overall, min(c.cap for c in applied))
    return replace(result, overall=capped, grade=t.grade(capped), caps_applied=tuple(applied))
