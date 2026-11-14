"""Live-score engine: item weights, sensor aggregation, confidence rules, caps, grades.

Each test is a real-world situation the score must handle correctly.
"""

from __future__ import annotations

from datetime import timedelta

import pytest

from edge_service.domain import (
    Detection,
    EnvMetric,
    Indicator,
    Pillar,
    ScoringConfig,
    SensorReading,
    Severity,
    Thresholds,
)
from edge_service.scoring import ActiveCondition, ScoreResult, apply_caps, compute_score
from edge_service.violations import ViolationEngine

from .conftest import T0, all_compliant, det, reading


def ov(r: ScoreResult) -> float:
    """Overall score of a result that must have one."""
    assert r.overall is not None
    return r.overall


def _cfg(config: ScoringConfig, **overrides: object) -> ScoringConfig:
    return config.model_copy(update={"thresholds": Thresholds.from_json(overrides)})


def _personal(gloves: bool, hairnet: bool = True, mask: bool = True, n: int = 4) -> list[Detection]:
    return [det(Indicator.GLOVES, gloves), det(Indicator.HAIRNET, hairnet), det(Indicator.MASK, mask)] * n


# ------------------------------------------------------------------ item weights
def test_missing_gloves_costs_more_than_missing_hairnet(config: ScoringConfig) -> None:
    no_gloves = compute_score(_personal(gloves=False), [], config)
    no_hairnet = compute_score(_personal(gloves=True, hairnet=False), [], config)
    assert no_gloves.pillars[Pillar.PERSONAL] == pytest.approx(100 * (1 - 0.611))
    assert no_hairnet.pillars[Pillar.PERSONAL] == pytest.approx(100 * (1 - 0.1945))
    assert ov(no_gloves) < ov(no_hairnet)


def test_items_without_evidence_are_reweighted_not_scored(config: ScoringConfig) -> None:
    # Only the hairnet is visible (hands out of view): the pillar is the hairnet's score.
    r = compute_score([det(Indicator.HAIRNET, True)] * 4, [], config)
    assert r.pillars[Pillar.PERSONAL] == pytest.approx(100)
    assert r.items["gloves"].score is None and r.items["gloves"].impact is None


def test_clean_and_dirty_surface_are_one_item(config: ScoringConfig) -> None:
    # One dirty board seen by both classifiers must not be penalised twice.
    ds = [det(Indicator.CLEAN_SURFACE, False), det(Indicator.DIRTY_SURFACE, False)] * 3
    ds += [det(Indicator.FOOD_SPILL, True), det(Indicator.FOOD_WASTE, True)] * 3
    r = compute_score(ds, [], config)
    assert r.items["surface"].score == pytest.approx(0)
    assert r.pillars[Pillar.FOOD_PREP] == pytest.approx(100 * (1 - 0.611))


def test_impacts_rank_what_to_fix_first(config: ScoringConfig) -> None:
    ds = _personal(gloves=False, hairnet=False)
    r = compute_score(ds, [reading(fridge=6.5)], config)
    order = [i["item"] for i in r.details()["impacts"]]
    assert order[0] == "gloves"
    assert set(order) == {"gloves", "hairnet", "fridge_temp_c"}
    assert sum(i.impact or 0 for i in r.items.values()) == pytest.approx(100 - ov(r))


# --------------------------------------------------------- confidence asymmetry
def test_uncertain_breach_does_not_penalise(config: ScoringConfig) -> None:
    # 0.55-confidence "no gloves" windows are below the breach threshold (0.6): ignored.
    ds = [det(Indicator.GLOVES, True, 0.9)] * 3 + [det(Indicator.GLOVES, False, 0.55)] * 3
    r = compute_score(ds, [], config)
    assert r.indicators[Indicator.GLOVES].score == pytest.approx(100)
    assert r.indicators[Indicator.GLOVES].confident_samples == 3


# ------------------------------------------------------------- sensor handling
def _fridge_series(values: list[float]) -> list[SensorReading]:
    return [reading(T0 + timedelta(seconds=30 * i), fridge=v) for i, v in enumerate(values)]


def test_fridge_door_opening_is_a_small_dent(config: ScoringConfig) -> None:
    # 10 readings over 5 min; one door-opening reading at 9 °C.
    r = compute_score([], _fridge_series([3.5] * 9 + [9.0]), config)
    assert r.metrics[EnvMetric.FRIDGE_TEMP_C].score == pytest.approx(90)


def test_fridge_sustained_warming_is_the_full_penalty(config: ScoringConfig) -> None:
    r = compute_score([], _fridge_series([9.0] * 10), config)
    assert r.metrics[EnvMetric.FRIDGE_TEMP_C].score == pytest.approx(0)


def test_corrupted_air_reading_is_ignored_by_the_median(config: ScoringConfig) -> None:
    # A corrupted BME280 read (as seen on the real board): one impossible spike among 28.4 °C.
    rs = [reading(T0 + timedelta(seconds=30 * i), ambient=v) for i, v in enumerate([28.4] * 9 + [45.0])]
    m = compute_score([], rs, config).metrics[EnvMetric.AMBIENT_TEMP_C]
    assert m.value == pytest.approx(28.4) and m.score == pytest.approx(100)


# -------------------------------------------------------------------- caps
def _fridge_hot_for(config: ScoringConfig, seconds: int, *, step: int = 60) -> list[ScoreResult]:
    """Run the engine with a 9 °C refrigerator for `seconds`; returns the capped results."""
    engine = ViolationEngine(config.thresholds, 300)
    out = []
    for s in range(0, seconds + 1, step):
        now = T0 + timedelta(seconds=s)
        raw = compute_score(all_compliant(now) * 3, [reading(now, fridge=9.0)], config)
        ev = engine.evaluate(now, raw, set())
        out.append(apply_caps(raw, ev.active, now, config.thresholds))
    return out


def test_sustained_critical_fridge_caps_the_score_below_grade_a(config: ScoringConfig) -> None:
    results = _fridge_hot_for(config, 15 * 60)
    before, after = results[-2], results[-1]  # 14 min, 15 min
    assert before.caps_applied == () and before.grade == "A"
    assert after.overall == pytest.approx(74) and after.grade == "B"
    assert after.uncapped_overall is not None and after.uncapped_overall > 74
    assert after.details()["caps_applied"][0]["key"] == "fridge_temp_c"


def test_cap_clock_restarts_when_the_fridge_recovers(config: ScoringConfig) -> None:
    engine = ViolationEngine(config.thresholds, 300)
    t = config.thresholds
    for s in range(0, 14 * 60, 60):  # 14 min hot
        now = T0 + timedelta(seconds=s)
        engine.evaluate(now, compute_score([], [reading(now, fridge=9.0)], config), set())
    ok = T0 + timedelta(minutes=14)
    engine.evaluate(ok, compute_score([], [reading(ok, fridge=3.0)], config), set())  # recovered
    later = T0 + timedelta(minutes=16)
    raw = compute_score([], [reading(later, fridge=9.0)], config)
    ev = engine.evaluate(later, raw, set())
    assert apply_caps(raw, ev.active, later, t).caps_applied == ()


def test_warm_but_not_critical_fridge_does_not_cap(config: ScoringConfig) -> None:
    engine = ViolationEngine(config.thresholds, 300)
    result = None
    for s in range(0, 30 * 60 + 1, 60):  # 6.5 °C for 30 min: HIGH, not CRITICAL
        now = T0 + timedelta(seconds=s)
        raw = compute_score(all_compliant(now) * 3, [reading(now, fridge=6.5)], config)
        result = apply_caps(raw, engine.evaluate(now, raw, set()).active, now, config.thresholds)
    assert result is not None and result.caps_applied == ()


def test_gloves_cap_only_after_the_model_is_validated(config: ScoringConfig) -> None:
    since = {Severity.LOW: T0, Severity.MEDIUM: T0, Severity.HIGH: T0}
    active = {"gloves": ActiveCondition(Severity.HIGH, since)}
    now = T0 + timedelta(minutes=5)
    raw = compute_score(_personal(gloves=False) + all_compliant() * 3, [reading()], config)
    assert apply_caps(raw, active, now, config.thresholds).caps_applied == ()  # not validated yet
    validated = _cfg(config, ai_validated={"gloves": True})
    capped = apply_caps(raw, active, now, validated.thresholds)
    assert [c.key for c in capped.caps_applied] == ["gloves"]
    assert ov(capped) <= 74


def test_cap_never_raises_a_low_score(config: ScoringConfig) -> None:
    raw = compute_score(_personal(False, False, False), [reading(fridge=9.0)], config)
    since = dict.fromkeys(Severity, T0)
    active = {"fridge_temp_c": ActiveCondition(Severity.CRITICAL, since)}
    capped = apply_caps(raw, active, T0 + timedelta(hours=1), config.thresholds)
    assert ov(capped) == pytest.approx(ov(raw))
    assert ov(capped) < 74


# ---------------------------------------------------------------- grades & config
@pytest.mark.parametrize(("score", "grade"), [(100, "A"), (75, "A"), (74.9, "B"), (50, "B"), (25, "C"), (24.9, "D")])
def test_h800_grade_bands(score: float, grade: str) -> None:
    assert Thresholds().grade(score) == grade


def test_rules_are_config_driven_and_validated() -> None:
    t = Thresholds.from_json(
        {"window_s": 600, "item_weights": {"mask": 0.5}, "sensor_aggregation": {"humidity_pct": "mean"}}
    )
    assert t.window_s == 600 and t.item_weights["mask"] == 0.5 and t.item_weights["gloves"] == 0.611
    assert t.sensor_aggregation[EnvMetric.HUMIDITY_PCT] == "mean"
    with pytest.raises(ValueError):
        Thresholds.from_json({"item_weights": {"smile": 1.0}})
    with pytest.raises(ValueError):
        Thresholds.from_json({"grade_bands": {"A": 50, "B": 75, "C": 25}})


# ------------------------------------------------------- scenarios, production window
@pytest.mark.parametrize(
    ("name", "violations"),
    [
        ("baseline", set()),
        ("ppe", {"gloves", "hairnet"}),
        ("food_prep", {"food_spill", "dirty_surface", "clean_surface"}),
        ("fridge", {"fridge_temp_c"}),
        ("multiple", {"gloves", "food_spill", "fridge_temp_c", "humidity_pct"}),
    ],
)
def test_scenarios_with_the_configured_5_minute_window(config: ScoringConfig, name: str, violations: set[str]) -> None:
    from edge_service.pipeline import Pipeline
    from edge_service.simulator import SCENARIOS, Simulator, live_feed

    from .conftest import FakeRepository

    repo = FakeRepository(config)
    pipeline = Pipeline(repo, kitchen_id="k", config=config, env_device_id="e", camera_device_id="c", model_version="t")
    assert pipeline.window.length == timedelta(seconds=300)  # taken from the scoring config
    for tick in live_feed(Simulator(seed=1), SCENARIOS[name], T0, sensor_interval_s=30, ai_interval_s=15):
        pipeline.process(tick.now, tick.readings, tick.detections)
    scores = [s.result for s in repo.scores]
    assert {v.candidate.key for v in repo.violations} == violations
    if name == "baseline":
        assert all(r.grade == "A" for r in scores)
    else:
        assert min(ov(r) for r in scores) < ov(scores[0]) - 10  # the incident clearly shows in the score
    assert all(r.details()["grade"] in {"A", "B", "C", "D"} for r in scores)


def test_stored_v1_live_config_is_exactly_the_engine_rules() -> None:
    """The migration's JSON must parse to the engine's rules (no silent drift)."""
    import json
    import re
    from pathlib import Path

    sql = (
        Path(__file__).resolve().parents[3] / "infrastructure/supabase/migrations/20261115000000_scoring_v1_live.sql"
    ).read_text()
    body = re.search(r"\$json\$(.*)\$json\$", sql, re.S)
    assert body is not None
    stored = Thresholds.from_json(json.loads(body.group(1)))
    assert stored == Thresholds()
    assert "0.333, 0.333, 0.334" in sql
