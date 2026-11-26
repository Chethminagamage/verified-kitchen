from __future__ import annotations

import pytest
from pydantic import ValidationError

from edge_service.domain import EnvMetric, Indicator, Pillar, Range, ScoringConfig, SensorReading, Thresholds
from edge_service.scoring import compute_score

from .conftest import T0, all_compliant, det, reading


def test_fully_compliant_scores_100(config: ScoringConfig) -> None:
    r = compute_score(all_compliant() * 3, [reading()], config)
    assert r.overall == pytest.approx(100)
    assert all(v == pytest.approx(100) for v in r.pillars.values())
    assert r.details()["missing_pillars"] == []


def test_indicator_score_is_compliance_rate(config: ScoringConfig) -> None:
    ds = [det(Indicator.GLOVES, c) for c in (True, True, False, False)]
    r = compute_score(ds, [], config)
    assert r.indicators[Indicator.GLOVES].score == pytest.approx(50)


def test_low_confidence_detections_are_ignored(config: ScoringConfig) -> None:
    ds = [det(Indicator.MASK, True, 0.9)] * 3 + [det(Indicator.MASK, False, 0.2)]
    r = compute_score(ds, [], config)
    assert r.indicators[Indicator.MASK].score == pytest.approx(100)
    assert r.indicators[Indicator.MASK].samples == 4
    assert r.indicators[Indicator.MASK].confident_samples == 3


def test_too_few_samples_is_no_evidence(config: ScoringConfig) -> None:
    # A single misdetection at start-up must not drop the indicator to 0.
    r = compute_score([det(Indicator.GLOVES, False), det(Indicator.GLOVES, True)], [], config)
    assert r.indicators[Indicator.GLOVES].score is None
    assert r.overall is None


def test_missing_pillar_reweights_instead_of_penalising(config: ScoringConfig) -> None:
    # Camera off: only environmental evidence. The kitchen should not be scored 25.
    r = compute_score([], [reading()], config)
    assert r.pillars[Pillar.PERSONAL] is None
    assert r.pillars[Pillar.FOOD_PREP] is None
    assert r.overall == pytest.approx(100)
    assert r.weights_used == {Pillar.ENVIRONMENTAL: pytest.approx(1.0)}
    assert set(r.details()["missing_pillars"]) == {"personal", "food_prep"}


def test_weighted_overall(config: ScoringConfig) -> None:
    ds = [d for d in all_compliant() if d.indicator.pillar is not Pillar.PERSONAL] * 3
    ds += [det(i, False) for i in (Indicator.HAIRNET, Indicator.MASK, Indicator.GLOVES)] * 3
    r = compute_score(ds, [reading()], config)
    assert r.pillars[Pillar.PERSONAL] == pytest.approx(0)
    assert r.overall == pytest.approx(0.4 * 0 + 0.35 * 100 + 0.25 * 100)


def test_no_evidence_gives_no_score(config: ScoringConfig) -> None:
    assert compute_score([], [], config).overall is None


def test_failed_sensor_is_missing_not_zero(config: ScoringConfig) -> None:
    r = compute_score([], [reading(fridge=None)], config)
    assert r.metrics[EnvMetric.FRIDGE_TEMP_C].score is None
    assert r.pillars[Pillar.ENVIRONMENTAL] == pytest.approx(100)


@pytest.mark.parametrize(
    ("fridge", "expected"),
    [(3.0, 100), (5.0, 100), (6.5, 50), (8.0, 0), (12.0, 0), (-1.5, 50)],
)
def test_fridge_metric_score(config: ScoringConfig, fridge: float, expected: float) -> None:
    r = compute_score([], [reading(fridge=fridge)], config)
    assert r.metrics[EnvMetric.FRIDGE_TEMP_C].score == pytest.approx(expected)


def test_range_validation() -> None:
    with pytest.raises(ValidationError):
        Range(tolerance=1)
    with pytest.raises(ValidationError):
        Range(min=5, max=1, tolerance=1)


def test_invalid_reading_rejected_before_database() -> None:
    with pytest.raises(ValidationError):
        SensorReading(device_ts=T0, fridge_temp_c=-127)  # DS18B20 "disconnected" sentinel


def test_thresholds_partial_override_keeps_defaults() -> None:
    t = Thresholds.from_json({"min_confidence": 0.6, "environment": {"fridge_temp_c": {"max": 4, "tolerance": 4}}})
    assert t.min_confidence == 0.6
    assert t.environment[EnvMetric.FRIDGE_TEMP_C].max == 4
    assert t.environment[EnvMetric.HUMIDITY_PCT].max == 70  # untouched default
    assert Thresholds.from_json({}) == Thresholds()


def test_config_from_db_row() -> None:
    row = {
        "id": 3,
        "version": "v0",
        "w_personal": "0.400",
        "w_food_prep": "0.350",
        "w_environmental": "0.250",
        "thresholds": {},
    }
    c = ScoringConfig.from_row(row)
    assert c.weights[Pillar.FOOD_PREP] == pytest.approx(0.35)
    with pytest.raises(ValidationError):
        ScoringConfig.from_row({**row, "w_personal": "0.5"})
