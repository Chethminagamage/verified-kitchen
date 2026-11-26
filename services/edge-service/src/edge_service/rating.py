"""Public hygiene rating (pure functions, no I/O) — what consumers see in the app.

The live score answers "what is wrong right now?" for the operator; the public
rating answers "how hygienic is this kitchen?" for a customer choosing where to
order. It must be stable, fair and impossible to game:

* **7-day window, recent days weighted more.** Each hourly average counts with
  weight 0.5 ** (age / half-life) times its number of scores, so an incident
  lowers the rating and then fades over the following days.
* **All hours count** for the rating (a refrigerator failing at night matters),
  but **coverage** is measured against the kitchen's opening hours: the share of
  opening time that was actually monitored since monitoring began (or 7 days).
* **Gaps never help.** Coverage >= 80 % -> "verified" with a grade; 50-80 % ->
  "incomplete" and the grade is capped at B; below 50 % -> no grade at all. So
  switching the camera or sensors off can only lower what customers see.
* **New kitchens** need a minimum of monitored opening time before any grade is
  published ("pending").
* Grades use the same bands as the live score (H-800: A >= 75, B >= 50, C >= 25).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from statistics import fmean
from typing import Any, Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field

GRADE_ORDER = ("A", "B", "C", "D")
Status = Literal["verified", "incomplete", "pending"]


class RatingRules(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    window_days: float = Field(default=7.0, gt=0, le=30)
    half_life_days: float = Field(default=2.0, gt=0)
    verified_min_coverage: float = Field(default=0.8, ge=0, le=1)
    grade_min_coverage: float = Field(default=0.5, ge=0, le=1)
    incomplete_best_grade: str = Field(default="B", pattern="^[ABCD]$")
    min_expected_hours: float = Field(default=12.0, ge=0)


@dataclass(frozen=True, slots=True)
class HourBucket:
    """One hour of stored live scores (from hygiene_score_series)."""

    start: datetime
    overall: float | None
    personal: float | None
    food_prep: float | None
    environmental: float | None
    samples: int  # stored scores in the hour (one per minute while monitored)


@dataclass(frozen=True, slots=True)
class OpeningHours:
    opens: time
    closes: time
    timezone: str

    def is_open(self, at: datetime) -> bool:
        """Same rule as public.is_open_at(): opens == closes = all day; closes < opens = overnight."""
        local = at.astimezone(ZoneInfo(self.timezone)).time()
        if self.opens == self.closes:
            return True
        if self.opens < self.closes:
            return self.opens <= local < self.closes
        return local >= self.opens or local < self.closes

    def open_minutes(self, start: datetime, end: datetime) -> int:
        """Opening minutes in [start, end), at minute resolution."""
        n, t = 0, start
        while t < end:
            n += self.is_open(t)
            t += timedelta(minutes=1)
        return n


@dataclass(frozen=True, slots=True)
class PublicRating:
    status: Status
    rating: float | None
    grade: str | None
    personal: float | None
    food_prep: float | None
    environmental: float | None
    coverage: float
    monitored_hours: float
    expected_hours: float
    details: dict[str, Any]


def worse_grade(a: str, b: str) -> str:
    return GRADE_ORDER[max(GRADE_ORDER.index(a), GRADE_ORDER.index(b))]


def _weighted(buckets: Sequence[tuple[HourBucket, float]], field: str) -> float | None:
    pairs = [(getattr(b, field), w) for b, w in buckets if getattr(b, field) is not None and w > 0]
    total = sum(w for _, w in pairs)
    return None if total <= 0 else sum(v * w for v, w in pairs) / total


def compute_public_rating(
    buckets: Sequence[HourBucket],
    hours: OpeningHours,
    now: datetime,
    rules: RatingRules,
    grade_of: Any,
) -> PublicRating:
    """`grade_of(score) -> 'A'..'D'` comes from the active scoring config (same bands as the live score)."""
    window_start = now - timedelta(days=rules.window_days)
    data = [b for b in buckets if b.samples > 0 and b.overall is not None and window_start <= b.start < now]

    # Coverage is judged from when monitoring began (at most 7 days back), so a
    # new kitchen is "pending" rather than penalised for days before it existed.
    first = min((b.start for b in data), default=None)
    since = max(window_start, first) if first else now
    expected_min = hours.open_minutes(since, now)
    monitored_min = sum(
        min(b.samples, hours.open_minutes(b.start, min(b.start + timedelta(hours=1), now))) for b in data
    )
    coverage = 0.0 if expected_min == 0 else min(1.0, monitored_min / expected_min)

    half_life_h = rules.half_life_days * 24
    weighted = [(b, b.samples * 0.5 ** ((now - b.start).total_seconds() / 3600 / half_life_h)) for b in data]
    rating = _weighted(weighted, "overall")
    pillars = {p: _weighted(weighted, p) for p in ("personal", "food_prep", "environmental")}

    details: dict[str, Any] = {
        "window_days": rules.window_days,
        "half_life_days": rules.half_life_days,
        "monitoring_since": since.isoformat() if first else None,
        "hours_with_scores": len(data),
        "rating_before_coverage_rules": None if rating is None else round(rating, 2),
        "recent_day_mean": _recent_mean(data, now),
    }

    grade: str | None = None
    status: Status
    if rating is None or expected_min / 60 < rules.min_expected_hours:
        status, rating_out = "pending", None
        details["reason"] = "not enough monitored opening time yet"
    elif coverage >= rules.verified_min_coverage:
        status, rating_out, grade = "verified", rating, grade_of(rating)
    elif coverage >= rules.grade_min_coverage:
        status, rating_out = "incomplete", rating
        grade = worse_grade(grade_of(rating), rules.incomplete_best_grade)
        details["reason"] = (
            f"only {coverage:.0%} of opening time monitored; grade limited to {rules.incomplete_best_grade}"
        )
    else:
        status, rating_out = "incomplete", None
        details["reason"] = f"only {coverage:.0%} of opening time monitored; no grade published"

    return PublicRating(
        status=status,
        rating=None if rating_out is None else round(rating_out, 2),
        grade=grade,
        personal=_r(pillars["personal"]) if rating_out is not None else None,
        food_prep=_r(pillars["food_prep"]) if rating_out is not None else None,
        environmental=_r(pillars["environmental"]) if rating_out is not None else None,
        coverage=round(coverage, 4),
        monitored_hours=round(monitored_min / 60, 2),
        expected_hours=round(expected_min / 60, 2),
        details=details,
    )


def _recent_mean(data: Sequence[HourBucket], now: datetime) -> float | None:
    day = [b.overall for b in data if b.overall is not None and now - b.start <= timedelta(days=1)]
    return None if not day else round(fmean(day), 2)


def _r(value: float | None) -> float | None:
    return None if value is None else round(value, 2)
