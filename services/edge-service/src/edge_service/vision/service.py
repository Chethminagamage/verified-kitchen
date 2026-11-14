"""The camera process loop: sample -> crop -> detect -> aggregate -> publish.

* Samples the newest camera frame at `fps` (default 5), never a stale buffered one.
* Crops the worker region (if configured) before inference.
* Every `window_s` (default 5 s, aligned to the wall clock) publishes one result per
  observed PPE indicator. Windows where the worker is out of view are published
  with no indicators: that keeps the camera "online" without creating evidence.
* Publishes a retained health status every `status_interval_s`.
* If the camera stops delivering frames, no detections are published (no evidence
  is invented) and the status reports `camera: error` until it recovers.

Privacy: frames are only ever held in memory. The optional preview window (for
setting up the camera and the region) displays frames on screen and stores nothing.
"""

from __future__ import annotations

import logging
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from statistics import fmean
from typing import Any, Protocol

from .detector import Detector
from .ppe import PPE_INDICATORS, WindowAggregator, frame_states
from .publisher import detections_message
from .roi import Roi

log = logging.getLogger(__name__)

STALE_FRAME_S = 5.0  # no new frame for this long = camera problem
PRIVACY_NOTE = "frames in memory only; nothing stored"


class Camera(Protocol):
    description: str

    def latest(self) -> tuple[int, Any]: ...
    def seconds_since_frame(self) -> float | None: ...
    def stop(self) -> None: ...


class Publisher(Protocol):
    def detections(self, message: Any) -> None: ...
    def status(self, fields: dict[str, Any]) -> None: ...


@dataclass(slots=True)
class RunStats:
    frames: int = 0
    windows: int = 0
    started: float = field(default_factory=time.monotonic)


def crop(frame: Any, roi: Roi | None) -> Any:
    """Worker region of a frame (a NumPy view, no copy)."""
    if roi is None:
        return frame
    h, w = frame.shape[:2]
    x0, y0, x1, y1 = roi.pixels(w, h)
    return frame[y0:y1, x0:x1]


class VisionService:
    def __init__(
        self,
        *,
        camera: Camera,
        detector: Detector,
        publisher: Publisher,
        device_id: str,
        fps: float = 5.0,
        window_s: float = 5.0,
        min_frames: int = 3,
        roi: Roi | None = None,
        status_interval_s: float = 30.0,
        preview: Callable[[Any, Roi | None, dict[str, str]], bool] | None = None,
    ) -> None:
        self.camera = camera
        self.detector = detector
        self.publisher = publisher
        self.device_id = device_id
        self.period = 1.0 / fps
        self.window = timedelta(seconds=window_s)
        self.aggregator = WindowAggregator(min_frames=min_frames)
        self.roi = roi
        self.status_interval_s = status_interval_s
        self.preview = preview
        self.seq = 0
        self.stats = RunStats()
        self._interval_frames = 0
        self._interval_ms: list[float] = []
        self._camera_ok = False

    # -- status -------------------------------------------------------------------
    def _status(self, *, interval_s: float) -> dict[str, Any]:
        fps = self._interval_frames / interval_s if interval_s > 0 else 0.0
        status = {
            "state": "online",
            "camera": "ok" if self._camera_ok else "error",
            "source": self.camera.description,
            "model_version": self.detector.model_version,
            "fps": round(fps, 2),
            "inference_ms": round(fmean(self._interval_ms), 2) if self._interval_ms else None,
            "uptime_s": int(time.monotonic() - self.stats.started),
            "roi": str(self.roi) if self.roi else "full frame",
            "privacy": PRIVACY_NOTE,
        }
        self._interval_frames, self._interval_ms = 0, []
        return status

    # -- one window ---------------------------------------------------------------
    def _publish_window(self, start: datetime, end: datetime) -> None:
        summary = self.aggregator.flush()
        if summary.frames_analysed == 0:
            return  # camera delivered nothing: no evidence either way
        message = detections_message(self.device_id, self.seq, start, end, self.detector.model_version, summary)
        self.publisher.detections(message)
        self.seq += 1
        self.stats.windows += 1
        seen = ", ".join(
            f"{w.indicator.value} {'OK' if w.compliant else 'MISSING'} ({w.frames_compliant}/{w.frames_observed})"
            for w in summary.indicators
        )
        log.info(
            "window %s–%s: %d frames, %s ms/frame | %s",
            start.strftime("%H:%M:%S"),
            end.strftime("%H:%M:%S"),
            summary.frames_analysed,
            summary.inference_ms,
            seen or "no PPE in view",
        )

    # -- main loop --------------------------------------------------------------------
    def run(self, stop: threading.Event, *, max_windows: int | None = None) -> RunStats:
        last_frame_id = 0
        warmed = False
        now = datetime.now(UTC)
        window_start = now
        next_window = now + self.window
        status_started = time.monotonic()
        status_due = status_started + 10.0  # or earlier, as soon as the camera state is known

        while not stop.is_set():
            tick = time.monotonic()
            frame_id, frame = self.camera.latest()
            age = self.camera.seconds_since_frame()
            camera_ok = frame is not None and age is not None and age < STALE_FRAME_S
            if camera_ok != self._camera_ok:
                log.log(
                    logging.INFO if camera_ok else logging.WARNING,
                    "camera %s: %s",
                    self.camera.description,
                    "ok" if camera_ok else "no frames",
                )
                self._camera_ok = camera_ok
                status_due = time.monotonic()  # report a camera state change straight away

            if camera_ok and frame_id != last_frame_id:
                last_frame_id = frame_id
                region = crop(frame, self.roi)
                if not warmed:
                    warm = getattr(self.detector, "warm_up", None)
                    if callable(warm):
                        warm(region)
                    warmed = True
                    tick = time.monotonic()
                boxes, ms = self.detector.detect(region)
                self.aggregator.add_frame(boxes, ms)
                self.stats.frames += 1
                self._interval_frames += 1
                self._interval_ms.append(ms)
                if self.preview is not None:
                    states = {i.value: ("OK" if s.compliant else "MISSING") for i, s in frame_states(boxes).items()}
                    for i in PPE_INDICATORS:
                        states.setdefault(i.value, "unknown")
                    if not self.preview(frame, self.roi, states):
                        # Closing the preview only closes the window; detection keeps running
                        # (stop the process with Ctrl+C).
                        self.preview = None
                        log.info("preview closed; camera keeps running (Ctrl+C stops it)")

            now = datetime.now(UTC)
            if now >= next_window:
                self._publish_window(window_start, next_window)
                if max_windows is not None and self.stats.windows >= max_windows:
                    break
                window_start = next_window
                next_window += self.window
                if now - next_window > self.window:  # fell behind (e.g. laptop slept): realign
                    window_start, next_window = now, now + self.window

            if time.monotonic() >= status_due:
                self.publisher.status(self._status(interval_s=time.monotonic() - status_started))
                status_started = time.monotonic()
                status_due = status_started + self.status_interval_s

            stop.wait(max(0.0, self.period - (time.monotonic() - tick)))
        return self.stats
