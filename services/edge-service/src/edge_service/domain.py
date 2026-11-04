"""Domain types shared by the scoring engine, the simulator and the Supabase repository.

Value ranges mirror the CHECK constraints in the database migration, so invalid
evidence is rejected here before it reaches the network.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator


class Pillar(StrEnum):
    PERSONAL = "personal"
    FOOD_PREP = "food_prep"
    ENVIRONMENTAL = "environmental"


class Indicator(StrEnum):
    """AI indicators. `compliant=True` always means "the hygienic state was observed"."""

    HAIRNET = "hairnet"
    MASK = "mask"
    GLOVES = "gloves"
    CLEAN_SURFACE = "clean_surface"
    DIRTY_SURFACE = "dirty_surface"
    FOOD_SPILL = "food_spill"
    FOOD_WASTE = "food_waste"

    @property
    def pillar(self) -> Pillar:
        return INDICATOR_PILLAR[self]


INDICATOR_PILLAR: dict[Indicator, Pillar] = {
    Indicator.HAIRNET: Pillar.PERSONAL,
    Indicator.MASK: Pillar.PERSONAL,
    Indicator.GLOVES: Pillar.PERSONAL,
    Indicator.CLEAN_SURFACE: Pillar.FOOD_PREP,
    Indicator.DIRTY_SURFACE: Pillar.FOOD_PREP,
    Indicator.FOOD_SPILL: Pillar.FOOD_PREP,
    Indicator.FOOD_WASTE: Pillar.FOOD_PREP,
}

PERSONAL_INDICATORS = tuple(i for i in Indicator if i.pillar is Pillar.PERSONAL)
FOOD_PREP_INDICATORS = tuple(i for i in Indicator if i.pillar is Pillar.FOOD_PREP)


class EnvMetric(StrEnum):
    """Environmental metrics that contribute to the environmental pillar score."""

    AMBIENT_TEMP_C = "ambient_temp_c"
    HUMIDITY_PCT = "humidity_pct"
    FRIDGE_TEMP_C = "fridge_temp_c"

    @property
    def unit(self) -> str:
        return {"ambient_temp_c": "°C", "humidity_pct": "%", "fridge_temp_c": "°C"}[self.value]

    @property
    def label(self) -> str:
        return {
            "ambient_temp_c": "Kitchen temperature",
            "humidity_pct": "Humidity",
            "fridge_temp_c": "Refrigerator temperature",
        }[self.value]


class Severity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EvidenceSource(StrEnum):
    AI = "ai"
    SENSOR = "sensor"
    SYSTEM = "system"


_FROZEN = ConfigDict(frozen=True, extra="forbid")


class SensorReading(BaseModel):
    """One ESP32 message. A sensor that failed to read is `None`, never a sentinel like -127."""

    model_config = _FROZEN

    device_ts: AwareDatetime
    seq: int | None = None
    ambient_temp_c: float | None = Field(default=None, ge=-40, le=85)
    humidity_pct: float | None = Field(default=None, ge=0, le=100)
    pressure_hpa: float | None = Field(default=None, ge=300, le=1100)
    fridge_temp_c: float | None = Field(default=None, ge=-55, le=125)
    rssi: int | None = Field(default=None, ge=-127, le=0)
    sensor_status: dict[str, Any] = Field(default_factory=dict)

    def value(self, metric: EnvMetric) -> float | None:
        value: float | None = getattr(self, metric.value)
        return value


class Detection(BaseModel):
    """Aggregated AI result for one indicator over a short window (not one per frame)."""

    model_config = _FROZEN

    detected_at: AwareDatetime
    indicator: Indicator
    compliant: bool
    confidence: float = Field(ge=0, le=1)
    inference_ms: float | None = Field(default=None, ge=0)
    metadata: dict[str, Any] = Field(default_factory=dict)


class Range(BaseModel):
    """Acceptable band for a metric. The score falls linearly from 100 at the limit
    to 0 at `tolerance` beyond it."""

    model_config = _FROZEN

    min: float | None = None
    max: float | None = None
    tolerance: float = Field(gt=0)

    @model_validator(mode="after")
    def _check_bounds(self) -> Range:
        if self.min is None and self.max is None:
            raise ValueError("a range needs at least one of min/max")
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError("min must not exceed max")
        return self

    def deviation(self, value: float) -> float:
        """Distance outside the band (0 when inside). Positive above max, negative below min."""
        if self.max is not None and value > self.max:
            return value - self.max
        if self.min is not None and value < self.min:
            return value - self.min
        return 0.0

    def score(self, value: float) -> float:
        return max(0.0, 100.0 * (1.0 - abs(self.deviation(value)) / self.tolerance))


def _default_environment() -> dict[EnvMetric, Range]:
    # PROVISIONAL thresholds — to be justified in the scoring chapter.
    #  * Refrigerator: keep at or below 5 °C (common food-safety guidance); the
    #    score reaches 0 at 8 °C, the UK legal maximum for chilled food.
    #  * Kitchen ambient: Sri Lankan kitchens run warm; above 32 °C is treated as unsafe.
    #  * Humidity: above 70 % encourages mould and bacterial growth.
    return {
        EnvMetric.FRIDGE_TEMP_C: Range(min=0.0, max=5.0, tolerance=3.0),
        EnvMetric.AMBIENT_TEMP_C: Range(min=16.0, max=32.0, tolerance=6.0),
        EnvMetric.HUMIDITY_PCT: Range(min=30.0, max=70.0, tolerance=15.0),
    }


def _default_ai_severity() -> dict[Indicator, Severity]:
    return {
        Indicator.GLOVES: Severity.HIGH,
        Indicator.HAIRNET: Severity.MEDIUM,
        Indicator.MASK: Severity.MEDIUM,
        Indicator.CLEAN_SURFACE: Severity.MEDIUM,
        Indicator.DIRTY_SURFACE: Severity.MEDIUM,
        Indicator.FOOD_SPILL: Severity.MEDIUM,
        Indicator.FOOD_WASTE: Severity.LOW,
    }


class Thresholds(BaseModel):
    """Scoring and violation rules. Stored as JSON in scoring_configs.thresholds;
    any key left out falls back to the defaults below."""

    model_config = _FROZEN

    # Detections below this confidence are ignored when scoring.
    min_confidence: float = Field(default=0.5, ge=0, le=1)
    # An indicator needs at least this many confident detections in the window to be
    # scored; with fewer, a single misdetection would swing the score (e.g. at start-up).
    min_samples: int = Field(default=3, ge=1)
    # An indicator is "failing" in a window when its compliance rate is below this.
    indicator_fail_below: float = Field(default=0.5, ge=0, le=1)
    # How long a condition must persist before a violation is raised.
    ai_persistence_s: float = Field(default=30.0, ge=0)
    sensor_persistence_s: float = Field(default=120.0, ge=0)

    environment: dict[EnvMetric, Range] = Field(default_factory=_default_environment)
    ai_severity: dict[Indicator, Severity] = Field(default_factory=_default_ai_severity)

    @classmethod
    def from_json(cls, raw: dict[str, Any] | None) -> Thresholds:
        """Merge stored overrides onto the defaults (nested maps are merged per key)."""
        base = cls().model_dump(mode="json")
        for key, value in (raw or {}).items():
            if isinstance(value, dict) and isinstance(base.get(key), dict):
                base[key] = {**base[key], **value}
            else:
                base[key] = value
        return cls.model_validate(base)


class ScoringConfig(BaseModel):
    model_config = _FROZEN

    id: int
    version: str
    weights: dict[Pillar, float]
    thresholds: Thresholds

    @model_validator(mode="after")
    def _check_weights(self) -> ScoringConfig:
        if set(self.weights) != set(Pillar):
            raise ValueError("weights must cover every pillar")
        if abs(sum(self.weights.values()) - 1.0) > 1e-6:
            raise ValueError("weights must sum to 1")
        return self

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> ScoringConfig:
        return cls(
            id=int(row["id"]),
            version=str(row["version"]),
            weights={
                Pillar.PERSONAL: float(row["w_personal"]),
                Pillar.FOOD_PREP: float(row["w_food_prep"]),
                Pillar.ENVIRONMENTAL: float(row["w_environmental"]),
            },
            thresholds=Thresholds.from_json(row.get("thresholds")),
        )
