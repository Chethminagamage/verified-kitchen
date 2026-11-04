"""Weighted hygiene scoring (pure functions, no I/O).

Model (provisional, version-tracked through scoring_configs):

* Indicator score = 100 x share of confident detections in the window that were compliant
  (only when there are at least `min_samples` of them; otherwise the indicator has no evidence).
* Personal / food-prep pillar = mean of the indicator scores that had evidence.
* Environmental metric score = Range.score(mean reading in the window).
* Environmental pillar = mean of the metric scores that had evidence.
* Overall = weighted mean of the pillars that had evidence; weights are re-normalised
  over the available pillars, so missing evidence (camera off, sensor fault) neither
  rewards nor punishes the kitchen. Which pillars were missing is recorded in `details`.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from statistics import fmean
from typing import Any

from .domain import (
    FOOD_PREP_INDICATORS,
    PERSONAL_INDICATORS,
    Detection,
    EnvMetric,
    Indicator,
    Pillar,
    ScoringConfig,
    SensorReading,
)


@dataclass(frozen=True, slots=True)
class IndicatorResult:
    score: float | None
    samples: int
    confident_samples: int
    mean_confidence: float | None


@dataclass(frozen=True, slots=True)
class MetricResult:
    mean: float | None
    score: float | None
    samples: int


@dataclass(frozen=True, slots=True)
class ScoreResult:
    overall: float | None
    pillars: dict[Pillar, float | None]
    indicators: dict[Indicator, IndicatorResult]
    metrics: dict[EnvMetric, MetricResult]
    weights_used: dict[Pillar, float]
    config_version: str

    def details(self) -> dict[str, Any]:
        """JSON breakdown stored in hygiene_scores.details (explainability)."""
        return {
            "config_version": self.config_version,
            "weights_used": {p.value: round(w, 4) for p, w in self.weights_used.items()},
            "missing_pillars": [p.value for p, s in self.pillars.items() if s is None],
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
                m.value: {"mean": _r(r.mean), "score": _r(r.score), "samples": r.samples}
                for m, r in self.metrics.items()
            },
        }


def _r(value: float | None, digits: int = 2) -> float | None:
    return None if value is None else round(value, digits)


def score_indicator(detections: Iterable[Detection], min_confidence: float, min_samples: int = 1) -> IndicatorResult:
    all_ = list(detections)
    confident = [d for d in all_ if d.confidence >= min_confidence]
    if len(confident) < min_samples:
        return IndicatorResult(None, len(all_), len(confident), None)
    compliant = sum(1 for d in confident if d.compliant)
    return IndicatorResult(
        score=100.0 * compliant / len(confident),
        samples=len(all_),
        confident_samples=len(confident),
        mean_confidence=fmean(d.confidence for d in confident),
    )


def score_metric(readings: Sequence[SensorReading], metric: EnvMetric, config: ScoringConfig) -> MetricResult:
    values = [v for r in readings if (v := r.value(metric)) is not None]
    if not values:
        return MetricResult(None, None, 0)
    mean = fmean(values)
    return MetricResult(mean, config.thresholds.environment[metric].score(mean), len(values))


def _mean_or_none(values: Iterable[float | None]) -> float | None:
    present = [v for v in values if v is not None]
    return fmean(present) if present else None


def compute_score(
    detections: Sequence[Detection],
    readings: Sequence[SensorReading],
    config: ScoringConfig,
) -> ScoreResult:
    by_indicator: dict[Indicator, list[Detection]] = {i: [] for i in Indicator}
    for d in detections:
        by_indicator[d.indicator].append(d)

    t = config.thresholds
    indicators = {i: score_indicator(ds, t.min_confidence, t.min_samples) for i, ds in by_indicator.items()}
    metrics = {m: score_metric(readings, m, config) for m in config.thresholds.environment}

    pillars: dict[Pillar, float | None] = {
        Pillar.PERSONAL: _mean_or_none(indicators[i].score for i in PERSONAL_INDICATORS),
        Pillar.FOOD_PREP: _mean_or_none(indicators[i].score for i in FOOD_PREP_INDICATORS),
        Pillar.ENVIRONMENTAL: _mean_or_none(r.score for r in metrics.values()),
    }

    available = {p: s for p, s in pillars.items() if s is not None}
    total_weight = sum(config.weights[p] for p in available)
    if not available or total_weight <= 0:
        return ScoreResult(None, pillars, indicators, metrics, {}, config.version)

    weights_used = {p: config.weights[p] / total_weight for p in available}
    overall = sum(weights_used[p] * s for p, s in available.items())
    return ScoreResult(overall, pillars, indicators, metrics, weights_used, config.version)
