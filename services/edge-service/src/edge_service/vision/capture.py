"""Camera reader: a background thread keeps only the newest frame.

Industrial video pipelines decouple capture from inference: the camera delivers
frames at its own rate (15-30 FPS) while the detector samples ~5 FPS. Reading in a
separate thread and keeping only the latest frame means inference never works on
a stale, buffered frame and latency cannot build up. Lost streams reconnect with
back-off. Frames live only in memory.
"""

from __future__ import annotations

import importlib
import logging
import os
import threading
import time
from typing import Any

log = logging.getLogger(__name__)

# RTSP over TCP (UDP drops packets on Wi-Fi). Must be set before cv2 opens a stream.
# No "fflags;nobuffer": with HEVC cameras (e.g. Tapo 2K main stream) it drops
# reference frames and corrupts the picture ("Could not find ref with POC"),
# measured on 2026-11-17. Latency is already bounded by the newest-frame reader.
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp|flags;low_delay")


def describe_source(source: int | str) -> str:
    """Safe description for logs and status: never includes RTSP credentials."""
    if isinstance(source, int):
        return f"webcam {source}"
    if source.startswith("rtsp://"):
        host = source.split("@")[-1].split("/")[0]  # drop "user:pass@"
        return f"rtsp://{host}"
    return f"file {os.path.basename(source)}"


class LatestFrameCamera:
    def __init__(self, source: int | str, *, loop_file: bool = True) -> None:
        self._cv2: Any = importlib.import_module("cv2")  # optional extra (uv sync --extra vision)
        self.source = source
        self.description = describe_source(source)
        self._is_file = isinstance(source, str) and not source.startswith("rtsp://")
        self._file_period = 0.0
        self._loop_file = loop_file
        self._lock = threading.Lock()
        self._frame: Any = None
        self._frame_id = 0
        self._last_frame_at = 0.0
        self._running = True
        # First open on the calling (main) thread: on macOS the camera-permission
        # request needs the main run loop and fails when made from a worker thread.
        self._cap: Any = self._open()
        if self._cap is None:
            log.warning("camera %s not available yet; will keep retrying", self.description)
        else:
            log.info("camera %s opened", self.description)
            self._configure_file_playback()
        self._thread = threading.Thread(target=self._run, name="camera", daemon=True)
        self._thread.start()

    # -- capture thread -------------------------------------------------------
    def _open(self) -> Any:
        cv2 = self._cv2
        if isinstance(self.source, int):
            cap = cv2.VideoCapture(self.source)
        else:
            cap = cv2.VideoCapture(self.source, cv2.CAP_FFMPEG)
        if not cap.isOpened():
            cap.release()
            return None
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return cap

    def _run(self) -> None:
        delay = 1.0
        while self._running:
            if self._cap is None:
                self._cap = self._open()
                if self._cap is None:
                    log.warning("camera %s not available; retrying in %.0f s", self.description, delay)
                    time.sleep(delay)
                    delay = min(delay * 2, 30.0)
                    continue
                delay = 1.0
                self._configure_file_playback()
                log.info("camera %s opened", self.description)

            ok, frame = self._cap.read()
            if not ok:
                if self._is_file and self._loop_file:
                    self._cap.set(self._cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                log.warning("camera %s stream lost; reconnecting", self.description)
                self._cap.release()
                self._cap = None
                continue
            with self._lock:
                self._frame = frame
                self._frame_id += 1
                self._last_frame_at = time.monotonic()
            if self._file_period:
                time.sleep(self._file_period)
        if self._cap is not None:
            self._cap.release()

    def _configure_file_playback(self) -> None:
        self._file_period = 0.0
        if self._is_file and self._cap is not None:
            fps = self._cap.get(self._cv2.CAP_PROP_FPS) or 15.0
            self._file_period = 1.0 / max(1.0, fps)  # play a file in real time

    # -- consumer side ------------------------------------------------------------
    def latest(self) -> tuple[int, Any]:
        """(frame id, frame) of the newest frame; (0, None) before the first one.

        The array is replaced (never modified) by the capture thread, so the
        caller may read it without copying.
        """
        with self._lock:
            return self._frame_id, self._frame

    def seconds_since_frame(self) -> float | None:
        with self._lock:
            return None if self._last_frame_at == 0 else time.monotonic() - self._last_frame_at

    def stop(self) -> None:
        self._running = False
        self._thread.join(timeout=3)
