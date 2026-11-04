"""Data access. `Repository` is the interface the pipeline depends on;
`SupabaseRepository` implements it over the Supabase REST API with the secret key
(which bypasses RLS — this process is the only trusted writer of evidence)."""

from __future__ import annotations

import logging
import time
from collections.abc import Callable, Iterator, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Protocol, TypeVar, cast

import httpx
from postgrest.exceptions import APIError
from postgrest.types import CountMethod, ReturnMethod
from supabase import Client, create_client

from .config import Settings
from .domain import Detection, Indicator, ScoringConfig, SensorReading
from .domain import Pillar as _P
from .scoring import ScoreResult
from .violations import ViolationCandidate

log = logging.getLogger(__name__)

T = TypeVar("T")
CHUNK = 500
_MINIMAL = ReturnMethod.minimal
_EXACT = CountMethod.exact


@dataclass(frozen=True, slots=True)
class ScoreRow:
    computed_at: datetime
    window_start: datetime
    window_end: datetime
    result: ScoreResult


@dataclass(frozen=True, slots=True)
class ViolationRow:
    candidate: ViolationCandidate
    detection_id: int | None = None
    reading_id: int | None = None
    resolved_at: datetime | None = None  # set only for historical (backfilled) incidents


ReadingIds = dict[datetime, int]
DetectionIds = dict[tuple[Indicator, datetime], int]


class Repository(Protocol):
    def get_kitchen_id(self, code: str) -> str: ...
    def get_active_config(self) -> ScoringConfig: ...
    def insert_sensor_readings(
        self, kitchen_id: str, device_id: str, readings: Sequence[SensorReading]
    ) -> ReadingIds: ...
    def insert_detections(
        self, kitchen_id: str, device_id: str, model_version: str, detections: Sequence[Detection]
    ) -> DetectionIds: ...
    def insert_hygiene_scores(self, kitchen_id: str, config_id: int, rows: Sequence[ScoreRow]) -> None: ...
    def open_violation_keys(self, kitchen_id: str) -> set[str]: ...
    def insert_violations(self, kitchen_id: str, rows: Sequence[ViolationRow]) -> None: ...
    def touch_device(self, device_id: str, seen_at: datetime, status: dict[str, Any]) -> None: ...
    def set_device_status(self, device_id: str, status: dict[str, Any]) -> None: ...
    def list_devices(self, kitchen_id: str) -> dict[str, str]: ...
    def count_scores_between(self, kitchen_id: str, start: datetime, end: datetime) -> int: ...


class RepositoryError(RuntimeError):
    pass


def utc(ts: datetime) -> datetime:
    return ts.astimezone(UTC)


def iso(ts: datetime) -> str:
    return utc(ts).isoformat()


def _chunks[T](items: Sequence[T], size: int = CHUNK) -> Iterator[Sequence[T]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def _retryable(exc: Exception) -> bool:
    if isinstance(exc, httpx.TransportError):
        return True
    if isinstance(exc, APIError):
        # PostgREST connection / schema-cache errors and gateway errors are transient.
        code = str(exc.code or "")
        return code.startswith("PGRST00") or code in {"502", "503", "504"}
    return False


def with_retry[T](fn: Callable[[], T], what: str, attempts: int = 4, base_delay: float = 0.5) -> T:
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except Exception as exc:
            if not _retryable(exc) or attempt == attempts:
                raise RepositoryError(f"{what} failed: {exc}") from exc
            delay = base_delay * 2 ** (attempt - 1)
            log.warning("%s failed (%s); retry %d/%d in %.1fs", what, exc, attempt, attempts - 1, delay)
            time.sleep(delay)
    raise AssertionError("unreachable")


def _rows(response: Any) -> list[dict[str, Any]]:
    return cast(list[dict[str, Any]], response.data or [])


class SupabaseRepository:
    def __init__(self, settings: Settings, client: Client | None = None) -> None:
        self._db = client or create_client(
            str(settings.supabase_url).rstrip("/"),
            settings.supabase_secret_key.get_secret_value(),
        )

    def _write(
        self,
        table: str,
        rows: Sequence[dict[str, Any]],
        what: str,
        *,
        upsert_on: str | None = None,
        returning: bool = True,
    ) -> list[dict[str, Any]]:
        """Insert (or upsert-ignoring-duplicates) one batch, with retries."""
        payload = list(rows)
        ret = ReturnMethod.representation if returning else _MINIMAL

        def run() -> Any:
            query = self._db.table(table)
            if upsert_on:
                return query.upsert(payload, on_conflict=upsert_on, ignore_duplicates=True, returning=ret).execute()
            return query.insert(payload, returning=ret).execute()

        return _rows(with_retry(run, what))

    # -- reference data ---------------------------------------------------
    def get_kitchen_id(self, code: str) -> str:
        rows = _rows(
            with_retry(
                lambda: self._db.table("kitchens").select("id").eq("code", code).limit(1).execute(),
                "load kitchen",
            )
        )
        if not rows:
            raise RepositoryError(f"kitchen '{code}' not found — did you run seed.sql?")
        return str(rows[0]["id"])

    def get_active_config(self) -> ScoringConfig:
        rows = _rows(
            with_retry(
                lambda: self._db.table("scoring_configs").select("*").eq("is_active", True).limit(1).execute(),
                "load scoring config",
            )
        )
        if not rows:
            raise RepositoryError("no active scoring_configs row — did you run seed.sql?")
        return ScoringConfig.from_row(rows[0])

    # -- evidence ---------------------------------------------------------
    def insert_sensor_readings(self, kitchen_id: str, device_id: str, readings: Sequence[SensorReading]) -> ReadingIds:
        ids: ReadingIds = {}
        payload = [
            {
                "kitchen_id": kitchen_id,
                "device_id": device_id,
                **r.model_dump(mode="json"),
                "device_ts": iso(r.device_ts),
            }
            for r in readings
        ]
        for chunk in _chunks(payload):
            # ignore_duplicates: an ESP32 re-sending its offline buffer is not an error.
            for row in self._write("sensor_readings", chunk, "insert sensor readings", upsert_on="device_id,device_ts"):
                ids[utc(datetime.fromisoformat(row["device_ts"]))] = int(row["id"])
        return ids

    def insert_detections(
        self, kitchen_id: str, device_id: str, model_version: str, detections: Sequence[Detection]
    ) -> DetectionIds:
        ids: DetectionIds = {}
        payload = [
            {
                "kitchen_id": kitchen_id,
                "device_id": device_id,
                "pillar": d.indicator.pillar.value,
                "model_version": model_version,
                **d.model_dump(mode="json"),
                "detected_at": iso(d.detected_at),
            }
            for d in detections
        ]
        for chunk in _chunks(payload):
            for row in self._write("ai_detections", chunk, "insert AI detections"):
                key = (Indicator(row["indicator"]), utc(datetime.fromisoformat(row["detected_at"])))
                ids[key] = int(row["id"])
        return ids

    # -- scores & violations ----------------------------------------------
    def insert_hygiene_scores(self, kitchen_id: str, config_id: int, rows: Sequence[ScoreRow]) -> None:
        payload = []
        for s in rows:
            r = s.result
            if r.overall is None:
                continue
            payload.append(
                {
                    "kitchen_id": kitchen_id,
                    "computed_at": iso(s.computed_at),
                    "window_start": iso(s.window_start),
                    "window_end": iso(s.window_end),
                    "overall_score": round(r.overall, 2),
                    "personal_score": _round(r.pillars.get(_P.PERSONAL)),
                    "food_prep_score": _round(r.pillars.get(_P.FOOD_PREP)),
                    "environmental_score": _round(r.pillars.get(_P.ENVIRONMENTAL)),
                    "config_id": config_id,
                    "details": r.details(),
                }
            )
        for chunk in _chunks(payload):
            self._write("hygiene_scores", chunk, "insert hygiene scores", returning=False)

    def open_violation_keys(self, kitchen_id: str) -> set[str]:
        res = with_retry(
            lambda: (
                self._db.table("violations")
                .select("indicator")
                .eq("kitchen_id", kitchen_id)
                .in_("status", ["active", "acknowledged"])
                .execute()
            ),
            "load open violations",
        )
        return {str(r["indicator"]) for r in _rows(res)}

    def insert_violations(self, kitchen_id: str, rows: Sequence[ViolationRow]) -> None:
        payload = []
        for v in rows:
            c = v.candidate
            payload.append(
                {
                    "kitchen_id": kitchen_id,
                    "occurred_at": iso(c.occurred_at),
                    "pillar": c.pillar.value,
                    "source": c.source.value,
                    "indicator": c.key,
                    "title": c.title,
                    "description": c.description,
                    "severity": c.severity.value,
                    "status": "resolved" if v.resolved_at else "active",
                    "resolved_at": iso(v.resolved_at) if v.resolved_at else None,
                    "score_impact": c.score_impact,
                    "ai_confidence": c.ai_confidence,
                    "sensor_value": c.sensor_value,
                    "sensor_unit": c.sensor_unit,
                    "detection_id": v.detection_id,
                    "reading_id": v.reading_id,
                }
            )
        for chunk in _chunks(payload, 100):
            self._write("violations", chunk, "insert violations", returning=False)

    # -- devices / misc ---------------------------------------------------
    def touch_device(self, device_id: str, seen_at: datetime, status: dict[str, Any]) -> None:
        with_retry(
            lambda: (
                self._db.table("devices")
                .update({"last_seen_at": iso(seen_at), "last_status": status}, returning=_MINIMAL)
                .eq("id", device_id)
                .execute()
            ),
            "update device status",
        )

    def set_device_status(self, device_id: str, status: dict[str, Any]) -> None:
        """Updates last_status without touching last_seen_at (e.g. the broker's 'offline' will)."""
        with_retry(
            lambda: (
                self._db.table("devices")
                .update({"last_status": status}, returning=_MINIMAL)
                .eq("id", device_id)
                .execute()
            ),
            "update device status",
        )

    def list_devices(self, kitchen_id: str) -> dict[str, str]:
        """Registered devices of a kitchen: id -> type."""
        res = with_retry(
            lambda: self._db.table("devices").select("id, type").eq("kitchen_id", kitchen_id).execute(),
            "load devices",
        )
        return {str(r["id"]): str(r["type"]) for r in _rows(res)}

    def count_scores_between(self, kitchen_id: str, start: datetime, end: datetime) -> int:
        res = with_retry(
            lambda: (
                self._db.table("hygiene_scores")
                .select("id", count=_EXACT, head=True)
                .eq("kitchen_id", kitchen_id)
                .gte("computed_at", iso(start))
                .lte("computed_at", iso(end))
                .execute()
            ),
            "count hygiene scores",
        )
        return int(res.count or 0)


def _round(value: float | None) -> float | None:
    return None if value is None else round(value, 2)
