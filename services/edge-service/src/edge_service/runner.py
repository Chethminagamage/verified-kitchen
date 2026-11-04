"""Long-running edge service: real ESP32 telemetry over MQTT -> pipeline -> Supabase.

Threading model: paho-mqtt's network thread only enqueues raw messages; all
validation, scoring and database writes happen on the single main thread.
"""

from __future__ import annotations

import contextlib
import logging
import queue
import threading
from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion

from .config import Settings
from .domain import Detection, SensorReading
from .mqtt_ingest import AcceptedReading, Rejected, Topic, parse_status, parse_telemetry, parse_topic
from .pipeline import Pipeline
from .repository import Repository, RepositoryError
from .simulator import Scenario, Simulator

log = logging.getLogger(__name__)

MAX_RETRY_BACKLOG = 2_000  # readings kept in memory while Supabase is unreachable
SUMMARY_EVERY = timedelta(minutes=5)


@dataclass(frozen=True, slots=True)
class Inbound:
    topic: str
    payload: bytes
    received_at: datetime


@dataclass(slots=True)
class Stats:
    accepted: int = 0
    buffered: int = 0
    rejected: Counter[str] = field(default_factory=Counter)
    missing_seq: int = 0
    stored_scores_since: int = 0

    def summary(self) -> str:
        rejected = sum(self.rejected.values())
        top = ", ".join(f"{r} ×{n}" for r, n in self.rejected.most_common(3))
        return (
            f"accepted {self.accepted} readings ({self.buffered} from device buffer), "
            f"rejected {rejected}{f' [{top}]' if top else ''}, missed messages {self.missing_seq}"
        )


class EdgeRunner:
    def __init__(
        self,
        repo: Repository,
        pipeline: Pipeline,
        *,
        kitchen_id: str,
        kitchen_code: str,
        devices: dict[str, str],
        ai: tuple[Simulator, Scenario] | None,
        ai_interval_s: int,
    ) -> None:
        self._repo = repo
        self._pipeline = pipeline
        self._kitchen_id = kitchen_id
        self._kitchen_code = kitchen_code
        self._devices = devices
        self._ai = ai
        self._ai_interval = timedelta(seconds=ai_interval_s)
        self._ai_started: datetime | None = None
        self._next_ai: datetime | None = None
        self._last_seq: dict[str, int] = {}
        self._device_state: dict[str, dict[str, Any]] = {}
        self._retry: deque[SensorReading] = deque(maxlen=MAX_RETRY_BACKLOG)
        self.stats = Stats()
        self.inbox: queue.Queue[Inbound] = queue.Queue(maxsize=10_000)

    # -- message handling (main thread) ----------------------------------
    def handle(self, msg: Inbound) -> None:
        topic = parse_topic(msg.topic)
        if isinstance(topic, Rejected):
            self._reject(topic.reason)
            return
        if topic.kitchen != self._kitchen_code:
            self._reject(f"message for another kitchen ({topic.kitchen})")
            return
        if self._devices.get(topic.device) != "env_node":
            self._reject(f"unknown environmental device {topic.device!r}")
            return
        if topic.kind == "status":
            self._handle_status(topic, msg)
        else:
            self._handle_telemetry(topic, msg)

    def _handle_status(self, topic: Topic, msg: Inbound) -> None:
        status = parse_status(topic, msg.payload)
        if isinstance(status, Rejected):
            self._reject(status.reason)
            return
        state = {**self._device_state.get(topic.device, {}), **status}
        self._device_state[topic.device] = state
        try:
            if status.get("state") == "offline":
                log.warning("device %s went offline (broker last will)", topic.device)
                self._repo.set_device_status(topic.device, state)
            else:
                self._repo.touch_device(topic.device, msg.received_at, state)
        except RepositoryError as exc:
            log.error("device status not stored: %s", exc)

    def _handle_telemetry(self, topic: Topic, msg: Inbound) -> None:
        result = parse_telemetry(topic, msg.payload, msg.received_at)
        if isinstance(result, Rejected):
            self._reject(result.reason)
            return
        self._track_seq(topic.device, result)
        self.stats.accepted += 1
        self.stats.buffered += int(result.buffered)
        if not result.clock_trusted:
            log.info("device %s clock not trusted; using arrival time", topic.device)

        r = result.reading
        state = self._device_state.setdefault(topic.device, {})
        state.update({"state": "online", "rssi": r.rssi, "sensors": r.sensor_status, "seq": r.seq})
        self._process([r], [], msg.received_at)
        try:
            self._repo.touch_device(topic.device, msg.received_at, state)
        except RepositoryError as exc:
            log.error("device status not stored: %s", exc)

    def _track_seq(self, device: str, result: AcceptedReading) -> None:
        seq = result.reading.seq
        if seq is None or result.buffered:
            return
        last = self._last_seq.get(device)
        if last is not None and seq > last + 1:
            gap = seq - last - 1
            self.stats.missing_seq += gap
            log.warning("device %s: %d message(s) missing between seq %d and %d", device, gap, last, seq)
        if last is None or seq > last:
            self._last_seq[device] = seq

    def _reject(self, reason: str) -> None:
        # Group similar reasons in the summary; log the full one once per occurrence.
        self.stats.rejected[reason.split(":")[0][:60]] += 1
        log.warning("rejected message: %s", reason)

    # -- AI evidence (simulated until the camera service exists) -----------
    def ai_tick(self, now: datetime) -> None:
        if self._ai is None:
            return
        if self._next_ai is None:
            self._ai_started, self._next_ai = now, now + self._ai_interval
            return
        if now < self._next_ai:
            return
        sim, scenario = self._ai
        assert self._ai_started is not None
        elapsed = (now - self._ai_started).total_seconds()
        phase = scenario.phase_at(elapsed % scenario.duration_s)
        detections: list[Detection] = sim.detections(now, self._ai_interval.total_seconds(), phase)
        self._next_ai += self._ai_interval
        self._process([], detections, now)

    # -- pipeline with retry -------------------------------------------------
    def _process(self, readings: list[SensorReading], detections: list[Detection], now: datetime) -> None:
        backlog = list(self._retry)
        self._retry.clear()
        try:
            self._pipeline.process(now, backlog + readings, detections)
        except RepositoryError as exc:
            self._retry.extend(backlog + readings)
            log.error("Supabase write failed (%d readings kept for retry): %s", len(self._retry), exc)

    # -- MQTT ------------------------------------------------------------------
    def run(self, settings: Settings, stop: threading.Event) -> None:
        client = mqtt.Client(
            callback_api_version=CallbackAPIVersion.VERSION2,
            client_id=f"edge-service-{self._kitchen_code}",
            clean_session=False,  # broker keeps QoS 1 telemetry while we are down
        )
        if settings.mqtt_password is None:
            raise SystemExit("MQTT_PASSWORD is not set; run infrastructure/mosquitto/setup.sh")
        client.username_pw_set(settings.mqtt_username, settings.mqtt_password.get_secret_value())
        client.reconnect_delay_set(min_delay=1, max_delay=30)

        base = f"vk/{self._kitchen_code}/+"

        def on_connect(c: mqtt.Client, _u: Any, _f: Any, reason: Any, _p: Any) -> None:
            if reason.is_failure:
                log.error("MQTT connection refused: %s", reason)
                return
            log.info("connected to MQTT broker %s:%d", settings.mqtt_host, settings.mqtt_port)
            c.subscribe([(f"{base}/telemetry", 1), (f"{base}/status", 1)])

        def on_disconnect(_c: mqtt.Client, _u: Any, _f: Any, reason: Any, _p: Any) -> None:
            if not stop.is_set():
                log.warning("MQTT disconnected (%s); reconnecting…", reason)

        def on_message(_c: mqtt.Client, _u: Any, m: mqtt.MQTTMessage) -> None:
            try:
                self.inbox.put_nowait(Inbound(m.topic, m.payload, datetime.now(UTC)))
            except queue.Full:
                log.error("inbox full; dropping message on %s", m.topic)

        client.on_connect = on_connect
        client.on_disconnect = on_disconnect
        client.on_message = on_message
        client.connect_async(settings.mqtt_host, settings.mqtt_port, keepalive=30)
        client.loop_start()

        next_summary = datetime.now(UTC) + SUMMARY_EVERY
        try:
            while not stop.is_set():
                with contextlib.suppress(queue.Empty):
                    self.handle(self.inbox.get(timeout=0.5))
                now = datetime.now(UTC)
                self.ai_tick(now)
                if now >= next_summary:
                    log.info("last 5 min: %s", self.stats.summary())
                    self.stats = Stats()
                    next_summary = now + SUMMARY_EVERY
        finally:
            client.loop_stop()
            client.disconnect()
            log.info("stopped. %s", self.stats.summary())
