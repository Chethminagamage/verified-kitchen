"""Public 7-day rating (what customers see): stability, fading incidents, coverage rules, no loopholes."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest

from edge_service.domain import ScoringConfig, Thresholds
from edge_service.rating import (
    HourBucket,
    OpeningHours,
    PublicRating,
    RatingRules,
    compute_public_rating,
    worse_grade,
)

# Saturday 2026-11-14 22:00 Colombo time (16:30 UTC): end of a trading day.
NOW = datetime(2026, 11, 14, 16, 30, tzinfo=UTC)
COLOMBO = ZoneInfo("Asia/Colombo")
HOURS = OpeningHours(time(8), time(22), "Asia/Colombo")  # 14 opening hours a day
RULES = RatingRules()
GRADE = Thresholds().grade


def history(
    days: float,
    score: float = 92.0,
    *,
    skip: Callable[[datetime], bool] | None = None,
    override: Callable[[datetime], float | None] | None = None,
) -> list[HourBucket]:
    """One bucket per hour for `days`, 60 scores each (monitored every minute)."""
    out = []
    t = (NOW - timedelta(days=days)).replace(minute=30)
    while t < NOW:
        if skip is None or not skip(t):
            o = override(t) if override else None
            s = score if o is None else o
            out.append(HourBucket(t, s, s, None, s, 60))
        t += timedelta(hours=1)
    return out


def rate(buckets: list[HourBucket], hours: OpeningHours = HOURS) -> PublicRating:
    return compute_public_rating(buckets, hours, NOW, RULES, GRADE)


def local_hour(t: datetime) -> int:
    return t.astimezone(COLOMBO).hour


def test_fully_monitored_good_kitchen_is_verified_a() -> None:
    r = rate(history(7))
    assert r.status == "verified" and r.grade == "A"
    assert r.rating == pytest.approx(92.0)
    assert r.coverage == pytest.approx(1.0)
    assert r.expected_hours == pytest.approx(7 * 14, abs=1)


def test_an_incident_fades_over_the_week() -> None:
    def incident(days_ago: float) -> Callable[[datetime], float | None]:
        start = NOW - timedelta(days=days_ago)
        return lambda t: 30.0 if start <= t < start + timedelta(hours=3) else None

    yesterday = rate(history(7, override=incident(1)))
    last_week = rate(history(7, override=incident(6)))
    assert yesterday.rating is not None and last_week.rating is not None
    assert yesterday.rating < last_week.rating < 92.0  # recent problems weigh more, old ones fade


def test_one_bad_hour_does_not_change_the_public_grade() -> None:
    last = history(7)[-1].start
    blip = history(7, override=lambda t: 0.0 if t == last else None)  # the latest hour scored 0
    assert rate(blip).grade == "A"


def test_partial_coverage_limits_the_grade_to_b() -> None:
    # Monitoring only in the first 9 of 14 opening hours each day (~64 %).
    r = rate(history(7, score=97.0, skip=lambda t: local_hour(t) >= 17))
    assert r.status == "incomplete"
    assert 0.5 <= r.coverage < 0.8
    assert r.rating == pytest.approx(97.0) and r.grade == "B"


def test_low_coverage_publishes_no_grade() -> None:
    r = rate(history(7, score=97.0, skip=lambda t: local_hour(t) >= 12))
    assert r.status == "incomplete" and r.coverage < 0.5
    assert r.grade is None and r.rating is None


def test_switching_monitoring_off_never_improves_the_grade() -> None:
    # Bad hygiene every evening (score 40 from 18:00); the operator unplugs the camera then.
    honest = rate(history(7, override=lambda t: 40.0 if local_hour(t) >= 18 else None))
    hidden = rate(history(7, skip=lambda t: local_hour(t) >= 18))
    order = ["A", "B", "C", "D", None]
    assert order.index(hidden.grade) >= order.index(honest.grade)
    assert hidden.status == "incomplete"


def test_night_failures_lower_the_rating_without_counting_as_coverage() -> None:
    # Refrigerator failing every night (kitchen closed): still a hygiene risk.
    r = rate(history(7, override=lambda t: 20.0 if local_hour(t) < 6 else None))
    assert r.rating is not None and r.rating < 92.0
    assert r.coverage == pytest.approx(1.0)


def test_a_new_kitchen_is_pending_until_enough_opening_time_is_monitored() -> None:
    r = rate(history(0.25))  # 6 hours of data
    assert r.status == "pending" and r.grade is None and r.rating is None
    assert rate(history(2)).status == "verified"  # judged from when monitoring began


def test_no_data_is_pending() -> None:
    r = rate([])
    assert r.status == "pending" and r.coverage == 0


@pytest.mark.parametrize(
    ("opens", "closes", "local", "expected"),
    [
        (time(8), time(22), time(7, 59), False),
        (time(8), time(22), time(8), True),
        (time(8), time(22), time(22), False),
        (time(18), time(2), time(1, 30), True),  # overnight
        (time(18), time(2), time(12), False),
        (time(0), time(0), time(3), True),  # open all day
    ],
)
def test_opening_hours_match_the_database_rule(opens: time, closes: time, local: time, expected: bool) -> None:
    at = datetime(2026, 11, 14, local.hour, local.minute, tzinfo=COLOMBO)
    assert OpeningHours(opens, closes, "Asia/Colombo").is_open(at) is expected


def test_worse_grade() -> None:
    assert worse_grade("A", "B") == "B" and worse_grade("C", "B") == "C"


def test_runner_publishes_the_rating(config: ScoringConfig) -> None:
    from edge_service.pipeline import Pipeline
    from edge_service.runner import EdgeRunner

    from .conftest import FakeRepository

    repo = FakeRepository(config)
    repo.buckets = history(7)
    pipeline = Pipeline(
        repo, kitchen_id="k1", config=config, env_device_id="e", camera_device_id="c", model_version="t"
    )
    runner = EdgeRunner(
        repo, pipeline, kitchen_id="k1", kitchen_code="kitchen-001", devices={}, ai=None, ai_interval_s=15
    )
    runner.update_public_rating(NOW)
    (rating, _, version) = repo.published[0]
    assert rating.status == "verified" and rating.grade == "A" and version == config.version
