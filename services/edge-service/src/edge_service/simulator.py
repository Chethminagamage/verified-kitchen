"""Evidence simulator — a stand-in for the ESP32 node and the YOLO camera service.

It produces exactly the evidence types the real inputs will produce, so the rest
of the pipeline is identical in simulation and in production.

The five scenarios correspond to the controlled evaluation scenarios (RQ1).
Each runs: compliant baseline -> incident -> recovery, so a run shows a violation
being raised and the score recovering.
"""

from __future__ import annotations

import math
import random
from collections.abc import Iterator
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta

from .domain import (
    FOOD_PREP_INDICATORS,
    PERSONAL_INDICATORS,
    Detection,
    Indicator,
    SensorReading,
)


@dataclass(frozen=True, slots=True)
class Phase:
    duration_s: float
    label: str
    failing: frozenset[Indicator] = frozenset()
    fridge_c: float = 3.5
    ambient_c: float = 27.0
    humidity_pct: float = 58.0
    worker_present: bool = True
    camera_on: bool = True


@dataclass(frozen=True, slots=True)
class Scenario:
    name: str
    title: str
    description: str
    phases: tuple[Phase, ...]

    @property
    def duration_s(self) -> float:
        return sum(p.duration_s for p in self.phases)

    def phase_at(self, elapsed_s: float) -> Phase:
        t = 0.0
        for phase in self.phases:
            t += phase.duration_s
            if elapsed_s < t:
                return phase
        return self.phases[-1]


_OK = Phase(60, "compliant baseline")


def _incident(label: str, seconds: float = 240, **kw: object) -> Phase:
    return replace(_OK, duration_s=seconds, label=label, **kw)  # type: ignore[arg-type]


def _recovery(seconds: float = 120) -> Phase:
    return replace(_OK, duration_s=seconds, label="recovery (compliant)")


SCENARIOS: dict[str, Scenario] = {
    s.name: s
    for s in (
        Scenario(
            "baseline",
            "S1 — Fully compliant workstation",
            "Worker wears all PPE, surface clean, environment in range. Expected: high score, no violations.",
            (replace(_OK, duration_s=420),),
        ),
        Scenario(
            "ppe",
            "S2 — Personal hygiene breach",
            "Worker removes gloves and hairnet for 4 minutes. Expected: personal pillar drops, "
            "gloves (high) and hairnet (medium) violations.",
            (
                _OK,
                _incident("gloves and hairnet removed", failing=frozenset({Indicator.GLOVES, Indicator.HAIRNET})),
                _recovery(),
            ),
        ),
        Scenario(
            "food_prep",
            "S3 — Food preparation breach",
            "Food spilled and left on a dirty surface for 4 minutes. Expected: food-prep pillar drops, "
            "spill / dirty-surface violations.",
            (
                _OK,
                _incident(
                    "spill on dirty surface",
                    failing=frozenset({Indicator.FOOD_SPILL, Indicator.DIRTY_SURFACE, Indicator.CLEAN_SURFACE}),
                ),
                _recovery(),
            ),
        ),
        Scenario(
            "fridge",
            "S4 — Refrigerator temperature failure",
            "Refrigerator warms towards 10 °C for 5 minutes, then cools down. Expected: environmental "
            "pillar drops, refrigerator violation (high; critical if already above 8 °C when raised).",
            (_OK, _incident("refrigerator failing", 300, fridge_c=10.0), _recovery(240)),
        ),
        Scenario(
            "multiple",
            "S5 — Multiple simultaneous breaches",
            "No gloves, a food spill, a warm refrigerator and high humidity at the same time. "
            "Expected: all three pillars drop, several violations.",
            (
                _OK,
                _incident(
                    "multiple breaches",
                    300,
                    failing=frozenset({Indicator.GLOVES, Indicator.FOOD_SPILL}),
                    fridge_c=9.0,
                    humidity_pct=80.0,
                ),
                _recovery(240),
            ),
        ),
    )
}


@dataclass(slots=True)
class _EnvState:
    fridge_c: float
    ambient_c: float
    humidity_pct: float


@dataclass(slots=True)
class Simulator:
    """Stateful evidence generator. `step()` advances simulated time by `dt_s`."""

    seed: int | None = None
    model_error: float = 0.04  # chance the model reports the wrong state
    low_confidence_rate: float = 0.06  # occlusion / blur
    inference_fps: float = 5.0
    rng: random.Random = field(init=False)
    _env: _EnvState | None = field(init=False, default=None)
    _seq: int = field(init=False, default=0)
    _last_reading_at: datetime | None = field(init=False, default=None)

    def __post_init__(self) -> None:
        self.rng = random.Random(self.seed)

    def step(self, now: datetime, dt_s: float, phase: Phase) -> tuple[list[SensorReading], list[Detection]]:
        """One sensor reading and one aggregated detection per indicator for the last `dt_s`."""
        return [self.reading(now, phase)], self.detections(now, dt_s, phase)

    def reading(self, now: datetime, phase: Phase) -> SensorReading:
        dt_s = 30.0 if self._last_reading_at is None else (now - self._last_reading_at).total_seconds()
        self._last_reading_at = now
        return self._reading(now, max(dt_s, 0.0), phase)

    def detections(self, now: datetime, dt_s: float, phase: Phase) -> list[Detection]:
        return self._detections(now, dt_s, phase)

    # -- environmental node ------------------------------------------------
    def _reading(self, now: datetime, dt_s: float, phase: Phase) -> SensorReading:
        g = self.rng.gauss
        if self._env is None:
            self._env = _EnvState(phase.fridge_c, phase.ambient_c, phase.humidity_pct)
        e = self._env
        # First-order lag towards the target (thermal inertia), plus process noise.
        e.fridge_c += (phase.fridge_c - e.fridge_c) * (1 - math.exp(-dt_s / 150)) + g(0, 0.05)
        e.ambient_c += (phase.ambient_c - e.ambient_c) * (1 - math.exp(-dt_s / 400)) + g(0, 0.05)
        e.humidity_pct += (phase.humidity_pct - e.humidity_pct) * (1 - math.exp(-dt_s / 200)) + g(0, 0.3)
        e.humidity_pct = min(max(e.humidity_pct, 5.0), 99.0)

        self._seq += 1
        return SensorReading(
            device_ts=now,
            seq=self._seq,
            ambient_temp_c=round(e.ambient_c + g(0, 0.05), 2),
            humidity_pct=round(min(max(e.humidity_pct + g(0, 0.3), 0.0), 100.0), 1),
            pressure_hpa=round(952.0 + g(0, 0.4), 1),  # Kandy is ~500 m above sea level
            fridge_temp_c=round((e.fridge_c + g(0, 0.03)) / 0.0625) * 0.0625,  # DS18B20 12-bit steps
            rssi=int(min(max(round(g(-58, 4)), -95), -30)),
            sensor_status={"bme280": "ok", "ds18b20": "ok"},
        )

    # -- camera / YOLO -----------------------------------------------------
    def _detections(self, now: datetime, dt_s: float, phase: Phase) -> list[Detection]:
        if not phase.camera_on:
            return []
        indicators = (PERSONAL_INDICATORS if phase.worker_present else ()) + FOOD_PREP_INDICATORS
        frames = max(1, round(dt_s * self.inference_fps))
        out = []
        for indicator in indicators:
            truth = indicator not in phase.failing
            wrong = self.rng.random() < self.model_error
            observed = truth != wrong
            if wrong:
                confidence = self.rng.uniform(0.50, 0.72)
            elif self.rng.random() < self.low_confidence_rate:
                confidence = self.rng.uniform(0.25, 0.49)
            else:
                confidence = self.rng.uniform(0.74, 0.97)
            out.append(
                Detection(
                    detected_at=now,
                    indicator=indicator,
                    compliant=observed,
                    confidence=round(confidence, 3),
                    inference_ms=round(max(15.0, self.rng.gauss(38, 5)), 1),
                    metadata={
                        "frames": frames,
                        "compliant_frames": round(frames * (confidence if observed else 1 - confidence)),
                        "simulated": True,
                    },
                )
            )
        return out


@dataclass(frozen=True, slots=True)
class FeedTick:
    elapsed_s: int
    now: datetime
    phase: Phase
    readings: list[SensorReading]
    detections: list[Detection]


def live_feed(
    sim: Simulator,
    scenario: Scenario,
    start: datetime,
    *,
    sensor_interval_s: int,
    ai_interval_s: int,
    loop: bool = False,
) -> Iterator[FeedTick]:
    """Evidence as the real devices would send it: the ESP32 every `sensor_interval_s`,
    the camera service every `ai_interval_s`. Yields one tick per message time."""
    tick_s = math.gcd(sensor_interval_s, ai_interval_s)
    elapsed = 0
    while True:
        elapsed += tick_s
        if not loop and elapsed > scenario.duration_s:
            return
        phase = scenario.phase_at(elapsed % scenario.duration_s if loop else elapsed)
        now = start + timedelta(seconds=elapsed)
        readings = [sim.reading(now, phase)] if elapsed % sensor_interval_s == 0 else []
        detections = sim.detections(now, ai_interval_s, phase) if elapsed % ai_interval_s == 0 else []
        yield FeedTick(elapsed, now, phase, readings, detections)
