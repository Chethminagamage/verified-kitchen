from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest

from edge_service.domain import ScoringConfig
from edge_service.mqtt_ingest import AcceptedReading, Rejected, Topic, parse_status, parse_telemetry, parse_topic
from edge_service.pipeline import Pipeline
from edge_service.runner import EdgeRunner, Inbound

from .conftest import FakeRepository

NOW = datetime(2026, 11, 4, 8, 35, 30, tzinfo=UTC)
TOPIC = Topic("kitchen-001", "vk-env-01", "telemetry")


def telemetry(**overrides: Any) -> bytes:
    msg: dict[str, Any] = {
        "v": 1,
        "device_id": "vk-env-01",
        "seq": 1842,
        "ts": "2026-11-04T08:35:00Z",
        "time_source": "rtc",
        "readings": {"ambient_temp_c": 27.41, "humidity_pct": 61.3, "pressure_hpa": 951.8, "fridge_temp_c": 3.625},
        "sensors": {"bme280": "ok", "ds18b20": "ok"},
        "rssi": -61,
        "buffered": False,
    }
    msg.update(overrides)
    return json.dumps(msg).encode()


def accepted(payload: bytes) -> AcceptedReading:
    result = parse_telemetry(TOPIC, payload, NOW)
    assert isinstance(result, AcceptedReading), result
    return result


def rejected(payload: bytes, topic: Topic = TOPIC) -> str:
    result = parse_telemetry(topic, payload, NOW)
    assert isinstance(result, Rejected), result
    return result.reason


# -- topics -----------------------------------------------------------------
@pytest.mark.parametrize(
    ("topic", "ok"),
    [
        ("vk/kitchen-001/vk-env-01/telemetry", True),
        ("vk/kitchen-001/vk-env-01/status", True),
        ("vk/kitchen-001/vk-env-01/telemetry/extra", False),
        ("vk/Kitchen 001/vk-env-01/telemetry", False),
        ("other/kitchen-001/vk-env-01/telemetry", False),
        ("vk/kitchen-001/vk-env-01/commands", False),
    ],
)
def test_parse_topic(topic: str, ok: bool) -> None:
    assert isinstance(parse_topic(topic), Topic) is ok


# -- telemetry ----------------------------------------------------------------
def test_valid_message_becomes_a_reading() -> None:
    r = accepted(telemetry())
    assert r.clock_trusted and not r.buffered
    assert r.reading.device_ts == datetime(2026, 11, 4, 8, 35, tzinfo=UTC)
    assert r.reading.fridge_temp_c == 3.625
    assert r.reading.seq == 1842
    assert r.reading.sensor_status == {"bme280": "ok", "ds18b20": "ok", "time_source": "rtc"}


def test_failed_sensor_is_null_not_zero() -> None:
    r = accepted(telemetry(readings={"ambient_temp_c": 27.0, "fridge_temp_c": None}, sensors={"ds18b20": "error"}))
    assert r.reading.fridge_temp_c is None
    assert r.reading.sensor_status["ds18b20"] == "error"


@pytest.mark.parametrize("value", [-127.0, 150.0])
def test_sentinel_or_impossible_values_are_rejected(value: float) -> None:
    assert "invalid reading" in rejected(telemetry(readings={"fridge_temp_c": value}))


def test_untrusted_clock_uses_arrival_time() -> None:
    r = accepted(telemetry(time_source="none", ts="2000-01-01T00:00:00Z"))
    assert not r.clock_trusted
    assert r.reading.device_ts == NOW
    assert r.reading.sensor_status["time_source"] == "edge"


def test_device_clock_far_ahead_is_not_trusted() -> None:
    future = (NOW + timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%SZ")
    r = accepted(telemetry(ts=future))
    assert not r.clock_trusted and r.reading.device_ts == NOW


def test_buffered_reading_keeps_its_original_time() -> None:
    r = accepted(telemetry(ts="2026-11-04T02:00:00Z", buffered=True))
    assert r.buffered and r.reading.device_ts.hour == 2


def test_too_old_reading_is_dropped() -> None:
    assert "older than" in rejected(telemetry(ts="2026-10-20T00:00:00Z"))


@pytest.mark.parametrize(
    ("payload", "reason"),
    [
        (b"not json", "not JSON"),
        (b"[1,2]", "not a JSON object"),
        (telemetry(v=2), "unsupported contract version"),
        (telemetry(device_id="vk-env-02"), "does not match topic"),
        (telemetry(seq=-1), "seq"),
        (telemetry(time_source="gps"), "time_source"),
        (telemetry(sensors={"bme280": "broken"}), "sensors"),
    ],
)
def test_malformed_messages_are_rejected_with_a_reason(payload: bytes, reason: str) -> None:
    assert reason in rejected(payload)


def test_status_keeps_only_known_fields() -> None:
    topic = Topic("kitchen-001", "vk-env-01", "status")
    status = parse_status(
        topic,
        json.dumps({"v": 1, "device_id": "vk-env-01", "state": "online", "fw": "1.0.0", "evil": "x" * 10_000}).encode(),
    )
    assert status == {"state": "online", "fw": "1.0.0"}
    assert isinstance(parse_status(topic, b'{"v":1,"device_id":"vk-env-01","state":"rebooting"}'), Rejected)


# -- runner ---------------------------------------------------------------------
def _runner(config: ScoringConfig) -> tuple[EdgeRunner, FakeRepository]:
    repo = FakeRepository(config)
    pipeline = Pipeline(
        repo,
        kitchen_id="k1",
        config=config,
        env_device_id="vk-env-01",
        camera_device_id="vk-cam-01",
        model_version="t",
        window_s=60,
        report_env_device=False,
    )
    runner = EdgeRunner(
        repo,
        pipeline,
        kitchen_id="k1",
        kitchen_code="kitchen-001",
        devices={"vk-env-01": "env_node", "vk-cam-01": "camera"},
        ai=None,
        ai_interval_s=15,
    )
    return runner, repo


def _inbound(topic: str, payload: bytes, at: datetime = NOW) -> Inbound:
    return Inbound(topic, payload, at)


def test_runner_stores_valid_telemetry_and_device_state(config: ScoringConfig) -> None:
    runner, repo = _runner(config)
    runner.handle(_inbound("vk/kitchen-001/vk-env-01/telemetry", telemetry()))
    assert len(repo.readings) == 1
    assert repo.devices["vk-env-01"]["sensors"]["ds18b20"] == "ok"
    assert runner.stats.accepted == 1


def test_runner_refuses_unknown_devices_and_other_kitchens(config: ScoringConfig) -> None:
    runner, repo = _runner(config)
    runner.handle(_inbound("vk/kitchen-002/vk-env-01/telemetry", telemetry()))
    runner.handle(_inbound("vk/kitchen-001/vk-env-99/telemetry", telemetry(device_id="vk-env-99")))
    runner.handle(_inbound("vk/kitchen-001/vk-cam-01/telemetry", telemetry(device_id="vk-cam-01")))
    assert repo.readings == []
    assert sum(runner.stats.rejected.values()) == 3


def test_runner_counts_missing_messages(config: ScoringConfig) -> None:
    runner, _ = _runner(config)
    for seq, minute in [(10, 30), (11, 31), (15, 33)]:
        ts = NOW.replace(minute=minute, second=0)
        runner.handle(
            _inbound(
                "vk/kitchen-001/vk-env-01/telemetry",
                telemetry(seq=seq, ts=ts.strftime("%Y-%m-%dT%H:%M:%SZ")),
                ts + timedelta(seconds=1),
            )
        )
    assert runner.stats.missing_seq == 3


def test_runner_records_offline_will(config: ScoringConfig) -> None:
    runner, repo = _runner(config)
    runner.handle(_inbound("vk/kitchen-001/vk-env-01/status", b'{"v":1,"device_id":"vk-env-01","state":"offline"}'))
    assert repo.device_statuses["vk-env-01"]["state"] == "offline"
    assert "vk-env-01" not in repo.devices  # last_seen_at untouched


def test_runner_keeps_readings_when_supabase_is_down(config: ScoringConfig) -> None:
    from edge_service.repository import RepositoryError

    runner, repo = _runner(config)
    original = repo.insert_sensor_readings

    def down(*_a: Any, **_k: Any) -> Any:
        raise RepositoryError("network down")

    repo.insert_sensor_readings = down  # type: ignore[method-assign]
    runner.handle(_inbound("vk/kitchen-001/vk-env-01/telemetry", telemetry()))
    assert repo.readings == [] and len(runner._retry) == 1

    repo.insert_sensor_readings = original  # type: ignore[method-assign]
    later = telemetry(seq=1843, ts="2026-11-04T08:35:30Z")
    runner.handle(_inbound("vk/kitchen-001/vk-env-01/telemetry", later, NOW + timedelta(seconds=30)))
    assert len(repo.readings) == 2 and len(runner._retry) == 0
