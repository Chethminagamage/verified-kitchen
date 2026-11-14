"""MQTT publisher of the camera process (contract: docs/api/mqtt-contract.md).

* `vk/{kitchen}/{camera}/detections` (QoS 1): one message per window.
* `vk/{kitchen}/{camera}/status` (QoS 1, retained): health every 30 s, plus a
  broker-published "offline" last will if the process or the Mac dies.

The camera has its own broker account; the ACL lets it publish only these topics.
While the broker is unreachable paho keeps QoS 1 messages in memory (bounded) and
sends them after reconnecting.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime
from typing import Any

import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion

from ..mqtt_ingest import DetectionsV1, IndicatorResultV1
from .ppe import WindowSummary

log = logging.getLogger(__name__)

MAX_QUEUED = 720  # one hour of 5-s windows while the broker is down


def detections_message(
    device_id: str, seq: int, start: datetime, end: datetime, model_version: str, summary: WindowSummary
) -> DetectionsV1:
    """Builds (and so validates) the contract message for one window."""
    return DetectionsV1(
        device_id=device_id,
        seq=seq,
        window_start=start,
        window_end=end,
        model_version=model_version,
        frames_analysed=summary.frames_analysed,
        inference_ms=summary.inference_ms,
        indicators=[
            IndicatorResultV1(
                indicator=w.indicator,
                compliant=w.compliant,
                confidence=w.confidence,
                frames_observed=w.frames_observed,
                frames_compliant=w.frames_compliant,
                frames_noncompliant=w.frames_noncompliant,
                classes=w.classes,
            )
            for w in summary.indicators
        ],
    )


class VisionPublisher:
    def __init__(self, *, host: str, port: int, kitchen: str, device_id: str, password: str) -> None:
        self.device_id = device_id
        self._detections_topic = f"vk/{kitchen}/{device_id}/detections"
        self._status_topic = f"vk/{kitchen}/{device_id}/status"
        self.connected = threading.Event()
        self._stopping = False

        c = mqtt.Client(callback_api_version=CallbackAPIVersion.VERSION2, client_id=device_id, clean_session=True)
        c.username_pw_set(device_id, password)
        c.will_set(
            self._status_topic,
            json.dumps({"v": 1, "device_id": device_id, "state": "offline"}),
            qos=1,
            retain=True,
        )
        c.reconnect_delay_set(min_delay=1, max_delay=30)
        c.max_queued_messages_set(MAX_QUEUED)
        c.on_connect = self._on_connect
        c.on_disconnect = self._on_disconnect
        self._client = c
        self._host, self._port = host, port
        self._last_status: dict[str, Any] | None = None

    def _on_connect(self, _c: mqtt.Client, _u: Any, _f: Any, reason: Any, _p: Any) -> None:
        if reason.is_failure:
            log.error("MQTT connection refused: %s (check VISION_MQTT_PASSWORD / broker account)", reason)
            return
        log.info("connected to MQTT broker %s:%d as %s", self._host, self._port, self.device_id)
        self.connected.set()
        if self._last_status is not None:
            self.status(self._last_status)  # re-assert "online" after a reconnect

    def _on_disconnect(self, _c: mqtt.Client, _u: Any, _f: Any, reason: Any, _p: Any) -> None:
        self.connected.clear()
        if not self._stopping:
            log.warning("MQTT disconnected (%s); reconnecting…", reason)

    def start(self) -> None:
        self._client.connect_async(self._host, self._port, keepalive=30)
        self._client.loop_start()

    def detections(self, message: DetectionsV1) -> None:
        payload = message.model_dump_json(exclude_none=False)
        self._client.publish(self._detections_topic, payload, qos=1)

    def status(self, fields: dict[str, Any]) -> None:
        self._last_status = fields
        payload = {"v": 1, "device_id": self.device_id, **fields}
        self._client.publish(self._status_topic, json.dumps(payload), qos=1, retain=True)

    def stop(self, final_status: dict[str, Any] | None = None) -> None:
        """Clean shutdown: publish 'offline' ourselves (the last will is only for crashes)."""
        self._stopping = True
        if final_status is not None and self.connected.is_set():
            info = self._client.publish(
                self._status_topic,
                json.dumps({"v": 1, "device_id": self.device_id, **final_status}),
                qos=1,
                retain=True,
            )
            info.wait_for_publish(timeout=3)
        self._client.disconnect()
        self._client.loop_stop()
