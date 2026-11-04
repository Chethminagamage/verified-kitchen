from __future__ import annotations

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest

from edge_service.backfill import generate_history
from edge_service.domain import Detection, Indicator, ScoringConfig, Severity
from edge_service.pipeline import Pipeline
from edge_service.scoring import compute_score
from edge_service.simulator import SCENARIOS, Scenario, Simulator, live_feed
from edge_service.violations import ViolationEngine

from .conftest import T0, FakeRepository, all_compliant, det, reading


def _no_gloves(at: datetime = T0) -> list[Detection]:
    ok = [d for d in all_compliant(at) if d.indicator is not Indicator.GLOVES]
    return ([*ok, det(Indicator.GLOVES, False, at=at)]) * 3


def test_violation_requires_persistence(config: ScoringConfig) -> None:
    engine = ViolationEngine(config.thresholds, 60)
    bad = compute_score(_no_gloves(), [reading()], config)
    assert engine.evaluate(T0, bad, set()).new == []
    assert engine.evaluate(T0 + timedelta(seconds=20), bad, set()).new == []
    new = engine.evaluate(T0 + timedelta(seconds=30), bad, set()).new
    assert [v.key for v in new] == ["gloves"]
    assert new[0].severity is Severity.HIGH
    assert new[0].occurred_at == T0
    assert new[0].score_impact == pytest.approx(0.4 * 100 / 3, abs=0.01)


def test_brief_glitch_does_not_raise(config: ScoringConfig) -> None:
    engine = ViolationEngine(config.thresholds, 60)
    bad = compute_score(_no_gloves(), [reading()], config)
    good = compute_score(all_compliant() * 3, [reading()], config)
    engine.evaluate(T0, bad, set())
    engine.evaluate(T0 + timedelta(seconds=20), good, set())  # resets the timer
    assert engine.evaluate(T0 + timedelta(seconds=40), bad, set()).new == []


def test_no_duplicates_while_failing_or_open(config: ScoringConfig) -> None:
    engine = ViolationEngine(config.thresholds, 60)
    bad = compute_score(_no_gloves(), [reading()], config)
    good = compute_score(all_compliant() * 3, [reading()], config)
    raised = [engine.evaluate(T0 + timedelta(seconds=s), bad, set()).new for s in range(0, 300, 10)]
    assert sum(len(r) for r in raised) == 1
    # Recovered, then fails again while the first is still open in the database: no new one.
    engine.evaluate(T0 + timedelta(seconds=300), good, set())
    for s in range(310, 500, 10):
        assert engine.evaluate(T0 + timedelta(seconds=s), bad, {"gloves"}).new == []
    # Once an operator resolves it, a persisting breach is raised again.
    assert [v.key for v in engine.evaluate(T0 + timedelta(seconds=510), bad, set()).new] == ["gloves"]


def test_fridge_severity(config: ScoringConfig) -> None:
    engine = ViolationEngine(config.thresholds, 60)
    warm = compute_score([], [reading(fridge=6.5)], config)
    hot = compute_score([], [reading(fridge=9.0)], config)
    engine.evaluate(T0, warm, set())
    assert engine.evaluate(T0 + timedelta(seconds=120), warm, set()).new[0].severity is Severity.HIGH
    engine2 = ViolationEngine(config.thresholds, 60)
    engine2.evaluate(T0, hot, set())
    v = engine2.evaluate(T0 + timedelta(seconds=120), hot, set()).new[0]
    assert v.severity is Severity.CRITICAL
    assert (v.sensor_value, v.sensor_unit) == (9.0, "°C")


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("baseline", set()),
        ("ppe", {"gloves", "hairnet"}),
        ("food_prep", {"food_spill", "dirty_surface", "clean_surface"}),
        ("fridge", {"fridge_temp_c"}),
        ("multiple", {"gloves", "food_spill", "fridge_temp_c", "humidity_pct"}),
    ],
)
def test_scenarios_raise_expected_violations(config: ScoringConfig, name: str, expected: set[str]) -> None:
    """The five controlled scenarios (RQ1) produce exactly the intended violations."""
    scenario = SCENARIOS[name]
    for seed in range(5):  # robust across random model errors
        repo = _run(config, scenario, seed)
        assert {v.candidate.key for v in repo.violations} == expected, f"seed {seed}"
        assert all(v.detection_id or v.reading_id for v in repo.violations), "violations link to evidence"
        assert repo.devices.keys() == {"env", "cam"}


def _run(config: ScoringConfig, scenario: Scenario, seed: int, persist_s: float = 60) -> FakeRepository:
    """Runs a scenario at the production cadences (sensor 30 s, AI 15 s)."""
    repo = FakeRepository(config)
    pipeline = Pipeline(
        repo,
        kitchen_id="k1",
        config=config,
        env_device_id="env",
        camera_device_id="cam",
        model_version="test",
        window_s=60,
        score_persist_s=persist_s,
    )
    for tick in live_feed(Simulator(seed=seed), scenario, T0, sensor_interval_s=30, ai_interval_s=15):
        pipeline.process(tick.now, tick.readings, tick.detections)
    return repo


def test_baseline_score_stays_high(config: ScoringConfig) -> None:
    repo = _run(config, SCENARIOS["baseline"], seed=1, persist_s=0)
    overall = [s.result.overall for s in repo.scores if s.result.overall is not None]
    assert min(overall) > 80


def test_storage_cadence(config: ScoringConfig) -> None:
    """Scores are stored once a minute; evidence at the device cadences."""
    scenario = SCENARIOS["ppe"]  # 7 minutes
    repo = _run(config, scenario, seed=2)
    minutes = scenario.duration_s / 60
    assert len(repo.scores) == pytest.approx(minutes, abs=1)
    assert len(repo.readings) == scenario.duration_s // 30
    assert len(repo.detections) == (scenario.duration_s // 15) * 7
    gaps = [(b.computed_at - a.computed_at).total_seconds() for a, b in zip(repo.scores, repo.scores[1:], strict=False)]
    assert all(g >= 59.5 for g in gaps)


def test_daily_row_budget() -> None:
    """Continuous running stays far below the old ~78k rows per day."""
    per_day = 86_400 // 30 + (86_400 // 15) * 7 + 86_400 // 60
    assert per_day < 45_000


def test_history_is_deterministic_and_consistent(config: ScoringConfig) -> None:
    a = generate_history(config, days=2, end=T0, seed=3)
    b = generate_history(config, days=2, end=T0, seed=3)
    assert a.summary() == b.summary()
    assert len(a.readings) == 2 * 24 * 30
    colombo = ZoneInfo("Asia/Colombo")
    assert a.detections, "camera evidence exists during opening hours"
    assert all(time(7) <= d.detected_at.astimezone(colombo).time() < time(22) for d in a.detections), (
        "no AI evidence while the kitchen is closed"
    )
    for v in a.violations:
        assert v.resolved_at is None or v.resolved_at >= v.candidate.occurred_at
        assert v.detection_ref or v.reading_ref
