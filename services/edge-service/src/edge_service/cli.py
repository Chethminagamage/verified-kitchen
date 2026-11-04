"""Command-line entry point: `uv run edge-service <command>`.

check       verify settings and the Supabase connection
scenarios   list the simulation scenarios
simulate    run a scenario live (writes evidence, scores and violations in real time)
backfill    write a realistic history (default 7 days) for charts and reports
"""

from __future__ import annotations

import argparse
import contextlib
import logging
import signal
import sys
import time
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from types import FrameType
from typing import Any

from pydantic import ValidationError

from .config import Settings, get_settings
from .domain import Detection, ScoringConfig, SensorReading
from .repository import (
    DetectionIds,
    ReadingIds,
    Repository,
    RepositoryError,
    ScoreRow,
    SupabaseRepository,
    ViolationRow,
    utc,
)
from .scoring import ScoreResult

log = logging.getLogger("edge_service")


class _DryRunRepository:
    """Accepts every write and discards it — for trying the simulator offline."""

    def __init__(self, config: ScoringConfig) -> None:
        self._config = config
        self._next = 1
        self._open: set[str] = set()
        self.device_statuses: dict[str, dict[str, Any]] = {}

    def get_kitchen_id(self, code: str) -> str:
        return "00000000-0000-0000-0000-000000000000"

    def get_active_config(self) -> ScoringConfig:
        return self._config

    def _ids(self, n: int) -> range:
        start, self._next = self._next, self._next + n
        return range(start, start + n)

    def insert_sensor_readings(self, kitchen_id: str, device_id: str, readings: Sequence[SensorReading]) -> ReadingIds:
        return {utc(r.device_ts): i for r, i in zip(readings, self._ids(len(readings)), strict=True)}

    def insert_detections(
        self, kitchen_id: str, device_id: str, model_version: str, detections: Sequence[Detection]
    ) -> DetectionIds:
        return {
            (d.indicator, utc(d.detected_at)): i for d, i in zip(detections, self._ids(len(detections)), strict=True)
        }

    def insert_hygiene_scores(self, kitchen_id: str, config_id: int, rows: Sequence[ScoreRow]) -> None:
        return None

    def open_violation_keys(self, kitchen_id: str) -> set[str]:
        return set(self._open)

    def insert_violations(self, kitchen_id: str, rows: Sequence[ViolationRow]) -> None:
        self._open.update(r.candidate.key for r in rows if r.resolved_at is None)

    def touch_device(self, device_id: str, seen_at: datetime, status: dict[str, Any]) -> None:
        return None

    def set_device_status(self, device_id: str, status: dict[str, Any]) -> None:
        self.device_statuses[device_id] = status

    def list_devices(self, kitchen_id: str) -> dict[str, str]:
        return {"vk-env-01": "env_node", "vk-cam-01": "camera"}

    def count_scores_between(self, kitchen_id: str, start: datetime, end: datetime) -> int:
        return 0


def _provisional_config() -> ScoringConfig:
    from .domain import Pillar, Thresholds

    return ScoringConfig(
        id=0,
        version="v0-provisional (offline)",
        weights={Pillar.PERSONAL: 0.40, Pillar.FOOD_PREP: 0.35, Pillar.ENVIRONMENTAL: 0.25},
        thresholds=Thresholds(),
    )


def _connect(dry_run: bool) -> tuple[Repository, Settings | None]:
    if dry_run:
        return _DryRunRepository(_provisional_config()), None
    try:
        settings = get_settings()
    except ValidationError as exc:
        problems = "; ".join(
            f"{str(e['loc'][0]).upper()} {e['msg'].removeprefix('Value error, ')}" for e in exc.errors()
        )
        sys.exit(f"Configuration error in .env: {problems}.")
    return SupabaseRepository(settings), settings


def _defaults(settings: Settings | None) -> Settings:
    if settings is not None:
        return settings
    return Settings.model_construct(  # offline: no secrets needed
        kitchen_code="kitchen-001",
        env_device_id="vk-env-01",
        camera_device_id="vk-cam-01",
        model_version="simulator-v1",
        score_window_s=60.0,
        sensor_interval_s=30,
        ai_interval_s=15,
        score_persist_s=60.0,
    )


def _fmt(result: ScoreResult) -> str:
    def f(v: float | None) -> str:
        return "  — " if v is None else f"{v:5.1f}"

    p = result.pillars
    from .domain import Pillar

    return (
        f"overall {f(result.overall)} | personal {f(p[Pillar.PERSONAL])} | "
        f"food prep {f(p[Pillar.FOOD_PREP])} | environment {f(p[Pillar.ENVIRONMENTAL])}"
    )


# ---------------------------------------------------------------------------
def cmd_check(_: argparse.Namespace) -> int:
    repo, settings = _connect(False)
    assert settings is not None
    kitchen_id = repo.get_kitchen_id(settings.kitchen_code)
    config = repo.get_active_config()
    open_keys = repo.open_violation_keys(kitchen_id)
    print(f"Supabase          {settings.supabase_url}")
    print(f"Kitchen           {settings.kitchen_code} ({kitchen_id})")
    print(f"Scoring config    {config.version} weights={ {p.value: w for p, w in config.weights.items()} }")
    print(f"Open violations   {sorted(open_keys) or 'none'}")
    print("OK — connection and seed data look good.")
    return 0


def cmd_scenarios(_: argparse.Namespace) -> int:
    from .simulator import SCENARIOS

    for s in SCENARIOS.values():
        print(f"{s.name:10} {s.title}  ({s.duration_s / 60:.0f} min)\n{'':10} {s.description}\n")
    return 0


def cmd_simulate(args: argparse.Namespace) -> int:
    from .pipeline import Pipeline
    from .simulator import SCENARIOS, Simulator, live_feed

    scenario = SCENARIOS[args.scenario]
    repo, settings = _connect(args.dry_run)
    s = _defaults(settings)
    sensor_s = args.sensor_interval or s.sensor_interval_s
    ai_s = args.ai_interval or s.ai_interval_s
    kitchen_id = repo.get_kitchen_id(s.kitchen_code)
    config = repo.get_active_config()
    pipeline = Pipeline(
        repo,
        kitchen_id=kitchen_id,
        config=config,
        env_device_id=s.env_device_id,
        camera_device_id=s.camera_device_id,
        model_version=s.model_version,
        window_s=s.score_window_s,
        score_persist_s=s.score_persist_s,
    )

    stopping = False

    def _stop(signum: int, frame: FrameType | None) -> None:
        nonlocal stopping
        stopping = True
        log.info("stopping after the current tick…")

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    log.info(
        "scenario %s — %s (%s; sensor every %ds, AI every %ds, score stored every %.0fs; config %s%s)",
        scenario.name,
        scenario.title,
        "looping until Ctrl+C" if args.loop else f"{scenario.duration_s / 60:.0f} min",
        sensor_s,
        ai_s,
        s.score_persist_s,
        config.version,
        ", DRY RUN" if args.dry_run else "",
    )
    started = time.monotonic()
    feed = live_feed(
        Simulator(seed=args.seed),
        scenario,
        datetime.now(UTC),
        sensor_interval_s=sensor_s,
        ai_interval_s=ai_s,
        loop=args.loop,
    )
    last_phase = ""
    for tick in feed:
        if not args.fast:
            delay = started + tick.elapsed_s - time.monotonic()
            if delay > 0:
                time.sleep(delay)
        if stopping:
            break
        if tick.phase.label != last_phase:
            log.info("── phase: %s", tick.phase.label)
            last_phase = tick.phase.label
        try:
            outcome = pipeline.process(tick.now, tick.readings, tick.detections)
        except RepositoryError as exc:
            log.error("evidence at t+%ds not stored: %s", tick.elapsed_s, exc)
            continue
        log.info("t+%4ds  %s", tick.elapsed_s, _fmt(outcome.result))
    log.info("done.")
    return 0


def cmd_backfill(args: argparse.Namespace) -> int:
    from .backfill import generate_history, write_history

    repo, settings = _connect(args.dry_run)
    s = _defaults(settings)
    kitchen_id = repo.get_kitchen_id(s.kitchen_code)
    config = repo.get_active_config()
    history = generate_history(config, days=args.days, step_s=args.step, seed=args.seed)
    log.info("generated %s", history.summary())
    if args.dry_run:
        log.info("dry run — nothing written.")
        return 0
    existing = repo.count_scores_between(kitchen_id, history.start, history.end)
    if existing and not args.force:
        log.error("%d scores already exist in this period; re-run with --force to add anyway.", existing)
        return 1
    write_history(
        repo,
        history,
        kitchen_id=kitchen_id,
        config=config,
        env_device_id=s.env_device_id,
        camera_device_id=s.camera_device_id,
        model_version=s.model_version,
    )
    log.info("backfill complete.")
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    """Real ESP32 telemetry over MQTT (+ simulated AI until the camera service exists)."""
    import threading

    from .pipeline import Pipeline
    from .runner import EdgeRunner
    from .simulator import SCENARIOS, Simulator

    repo, settings = _connect(False)
    assert settings is not None
    kitchen_id = repo.get_kitchen_id(settings.kitchen_code)
    config = repo.get_active_config()
    devices = repo.list_devices(kitchen_id)
    pipeline = Pipeline(
        repo,
        kitchen_id=kitchen_id,
        config=config,
        env_device_id=settings.env_device_id,
        camera_device_id=settings.camera_device_id,
        model_version=settings.model_version,
        window_s=settings.score_window_s,
        score_persist_s=settings.score_persist_s,
        report_env_device=False,
    )
    ai = None if args.ai == "none" else (Simulator(seed=args.seed), SCENARIOS[args.ai_scenario])
    runner = EdgeRunner(
        repo,
        pipeline,
        kitchen_id=kitchen_id,
        kitchen_code=settings.kitchen_code,
        devices=devices,
        ai=ai,
        ai_interval_s=settings.ai_interval_s,
    )
    stop = threading.Event()

    def _stop(signum: int, frame: FrameType | None) -> None:
        log.info("stopping…")
        stop.set()

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)
    log.info(
        "edge service for %s (config %s); devices %s; AI evidence: %s",
        settings.kitchen_code,
        config.version,
        ", ".join(f"{d} ({t})" for d, t in sorted(devices.items())),
        "none" if ai is None else f"SIMULATED ({args.ai_scenario})",
    )
    runner.run(settings, stop)
    return 0


def _firmware_secret(name: str) -> str | None:
    from pathlib import Path

    path = Path(__file__).resolve().parents[4] / "iot" / "esp32" / "include" / "secrets.h"
    if not path.exists():
        return None
    for line in path.read_text().splitlines():
        parts = line.split(None, 2)
        if len(parts) == 3 and parts[0] == "#define" and parts[1] == name:
            return parts[2].strip().strip('"')
    return None


def cmd_fake_device(args: argparse.Namespace) -> int:
    """Publishes exactly like the ESP32 firmware, for end-to-end tests without hardware."""
    import json

    import paho.mqtt.client as mqtt
    from paho.mqtt.enums import CallbackAPIVersion

    from .simulator import SCENARIOS, Simulator

    s = _defaults(None) if args.dry_run else get_settings()
    device = args.device
    password = args.password or _firmware_secret("MQTT_PASSWORD")
    if not password:
        sys.exit("No device password: run infrastructure/mosquitto/setup.sh or pass --password")
    base = f"vk/{s.kitchen_code}/{device}"
    client = mqtt.Client(callback_api_version=CallbackAPIVersion.VERSION2, client_id=f"fake-{device}")
    client.username_pw_set(device, password)
    client.will_set(f"{base}/status", json.dumps({"v": 1, "device_id": device, "state": "offline"}), 1, True)
    client.connect(args.host or s.mqtt_host, s.mqtt_port, keepalive=30)
    client.loop_start()
    client.publish(
        f"{base}/status",
        json.dumps(
            {
                "v": 1,
                "device_id": device,
                "state": "online",
                "fw": "fake-1.0.0",
                "uptime_s": 0,
                "rssi": -60,
                "buffer": 0,
                "time_source": "ntp",
                "sensors": {"bme280": "ok", "ds18b20": "ok"},
                "reset_reason": "fake",
            }
        ),
        qos=1,
        retain=True,
    ).wait_for_publish(5)

    sim = Simulator(seed=args.seed)
    scenario = SCENARIOS[args.scenario]
    start = datetime.now(UTC)

    def payload(i: int, ts: datetime, buffered: bool) -> str:
        r = sim.reading(ts, scenario.phase_at(i * args.interval))
        readings = {
            "ambient_temp_c": r.ambient_temp_c,
            "humidity_pct": r.humidity_pct,
            "pressure_hpa": r.pressure_hpa,
            "fridge_temp_c": r.fridge_temp_c,
        }
        sensors = {"bme280": "ok", "ds18b20": "ok"}
        if args.fault == "ds18b20":
            readings["fridge_temp_c"], sensors["ds18b20"] = None, "error"
        if args.fault == "sentinel":
            readings["fridge_temp_c"] = -127.0  # firmware bug simulation: must be rejected
        return json.dumps(
            {
                "v": 1,
                "device_id": device,
                "seq": 1000 + i,
                "ts": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "time_source": "ntp",
                "readings": readings,
                "sensors": sensors,
                "rssi": r.rssi,
                "buffered": buffered,
            }
        )

    sent = 0
    if args.buffered:
        # Readings "taken while offline" in the last N intervals, re-sent oldest first.
        for i in range(args.buffered):
            ts = start - timedelta(seconds=args.interval * (args.buffered - i))
            client.publish(f"{base}/telemetry", payload(i, ts, True), qos=1).wait_for_publish(5)
            sent += 1
        log.info("re-sent %d buffered readings", args.buffered)
    try:
        for i in range(args.count):
            ts = datetime.now(UTC)
            client.publish(f"{base}/telemetry", payload(args.buffered + i, ts, False), qos=1).wait_for_publish(5)
            sent += 1
            log.info("published telemetry %d/%d", i + 1, args.count)
            if i + 1 < args.count:
                time.sleep(args.interval)
    except KeyboardInterrupt:
        pass
    client.loop_stop()
    client.disconnect()  # clean disconnect: no last will
    log.info("fake device sent %d messages", sent)
    return 0


def build_parser() -> argparse.ArgumentParser:
    from .simulator import SCENARIOS

    parser = argparse.ArgumentParser(
        prog="edge-service", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("check", help="verify settings and the Supabase connection").set_defaults(fn=cmd_check)
    sub.add_parser("scenarios", help="list simulation scenarios").set_defaults(fn=cmd_scenarios)

    p = sub.add_parser("simulate", help="run a scenario live")
    p.add_argument("--scenario", choices=sorted(SCENARIOS), default="baseline")
    p.add_argument("--sensor-interval", type=int, help="seconds between ESP32 readings (default from .env: 30)")
    p.add_argument("--ai-interval", type=int, help="seconds between AI detections (default from .env: 15)")
    p.add_argument("--loop", action="store_true", help="repeat the scenario until stopped (Ctrl+C)")
    p.add_argument("--fast", action="store_true", help="do not wait in real time (testing)")
    p.add_argument("--seed", type=int, default=None)
    p.add_argument("--dry-run", action="store_true", help="do not connect or write anything")
    p.set_defaults(fn=cmd_simulate)

    p = sub.add_parser("run", help="process real ESP32 telemetry from MQTT (the production service)")
    p.add_argument(
        "--ai",
        choices=["simulate", "none"],
        default="simulate",
        help="AI evidence source until the camera service exists (default: simulate)",
    )
    p.add_argument("--ai-scenario", choices=sorted(SCENARIOS), default="baseline")
    p.add_argument("--seed", type=int, default=None)
    p.set_defaults(fn=cmd_run)

    p = sub.add_parser("fake-device", help="publish like the ESP32 (testing without hardware)")
    p.add_argument("--device", default="vk-env-01")
    p.add_argument("--password", help="device MQTT password (default: from iot/esp32/include/secrets.h)")
    p.add_argument("--host", help="broker host (default: MQTT_HOST)")
    p.add_argument("--scenario", choices=sorted(SCENARIOS), default="baseline")
    p.add_argument("--interval", type=float, default=30.0)
    p.add_argument("--count", type=int, default=10)
    p.add_argument("--buffered", type=int, default=0, help="first re-send N 'offline' readings")
    p.add_argument("--fault", choices=["ds18b20", "sentinel"], help="inject a sensor fault")
    p.add_argument("--seed", type=int, default=None)
    p.add_argument("--dry-run", action="store_true", help=argparse.SUPPRESS)
    p.set_defaults(fn=cmd_fake_device)

    p = sub.add_parser("backfill", help="write a realistic history for charts and reports")
    p.add_argument("--days", type=float, default=7.0)
    p.add_argument("--step", type=float, default=120.0, help="seconds between samples (default 120)")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--force", action="store_true", help="write even if scores already exist in the period")
    p.add_argument("--dry-run", action="store_true", help="generate and summarise only")
    p.set_defaults(fn=cmd_backfill)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    level = logging.DEBUG if args.verbose else logging.INFO
    if not args.verbose:
        with contextlib.suppress(ValidationError):
            level = getattr(logging, get_settings().log_level.upper(), logging.INFO)
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)-7s %(message)s", datefmt="%H:%M:%S")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    try:
        code: int = args.fn(args)
    except RepositoryError as exc:
        log.error("%s", exc)
        return 2
    return code


if __name__ == "__main__":
    raise SystemExit(main())
