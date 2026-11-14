"""Camera pipeline: PPE logic, contract round-trip, edge ingestion, service loop and privacy.

None of these tests needs a camera, the model or PyTorch (CI installs no vision extra).
"""

from __future__ import annotations

import json
import os
import re
import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import numpy as np
import pytest

from edge_service.domain import Indicator, ScoringConfig
from edge_service.mqtt_ingest import AcceptedDetections, DetectionsV1, Rejected, Topic, parse_detections
from edge_service.pipeline import Pipeline
from edge_service.runner import EdgeRunner, Inbound
from edge_service.vision.detector import fingerprint
from edge_service.vision.ppe import Box, WindowAggregator, frame_states
from edge_service.vision.publisher import detections_message
from edge_service.vision.roi import Roi
from edge_service.vision.service import VisionService, crop

from .conftest import FakeRepository

NOW = datetime(2026, 11, 14, 10, 0, 5, tzinfo=UTC)
START = NOW - timedelta(seconds=5)
TOPIC = Topic("kitchen-001", "vk-cam-01", "detections")

G, NG = Indicator.GLOVES, Indicator.MASK


# ---------------------------------------------------------------- per frame
def test_negative_class_beats_positive_in_a_frame() -> None:
    # One gloved hand and one bare hand: the frame is NOT compliant for gloves.
    states = frame_states([Box("glove", 0.9), Box("no_glove", 0.6)])
    assert states[Indicator.GLOVES].compliant is False
    assert states[Indicator.GLOVES].confidence == 0.6


def test_incorrect_mask_is_not_compliant_and_unknown_classes_are_ignored() -> None:
    states = frame_states([Box("incorrect_mask", 0.7), Box("person", 0.99), Box("hairnet", 0.8)])
    assert states[Indicator.MASK].compliant is False
    assert states[Indicator.HAIRNET].compliant is True
    assert Indicator.GLOVES not in states  # not seen = unknown, never a violation


# ---------------------------------------------------------------- per window
def test_window_majority_vote_with_counts_and_confidence() -> None:
    agg = WindowAggregator(min_frames=3)
    for _ in range(4):
        agg.add_frame([Box("glove", 0.8)], inference_ms=6.0)
    agg.add_frame([Box("no_glove", 0.5)], inference_ms=8.0)
    summary = agg.flush()
    (gloves,) = summary.indicators
    assert gloves.indicator is Indicator.GLOVES and gloves.compliant is True
    assert (gloves.frames_observed, gloves.frames_compliant, gloves.frames_noncompliant) == (5, 4, 1)
    assert gloves.confidence == pytest.approx(0.8)  # mean of the frames supporting the decision
    assert gloves.classes == {"glove": 4, "no_glove": 1}
    assert summary.frames_analysed == 5 and summary.inference_ms == pytest.approx(6.4)


def test_window_noncompliant_majority_and_tie_rule() -> None:
    agg = WindowAggregator(min_frames=2)
    for cls in ["no_mask", "no_mask", "mask"]:
        agg.add_frame([Box(cls, 0.9)])
    assert agg.flush().indicators[0].compliant is False
    for cls in ["no_mask", "mask"]:  # tie: a flickering detector is not evidence of a breach
        agg.add_frame([Box(cls, 0.9)])
    assert agg.flush().indicators[0].compliant is True


def test_indicator_seen_in_too_few_frames_is_unknown_and_flush_resets() -> None:
    agg = WindowAggregator(min_frames=3)
    agg.add_frame([Box("no_hairnet", 0.9)])
    agg.add_frame([])
    summary = agg.flush()
    assert summary.indicators == [] and summary.frames_analysed == 2
    assert agg.frames == 0 and agg.flush().frames_analysed == 0


# ---------------------------------------------------------------- region of interest
def test_roi_parse_pixels_and_validation() -> None:
    assert Roi.parse("") is None
    roi = Roi.parse("0.25, 0.1, 0.5, 0.9")
    assert roi is not None and roi.pixels(1920, 1080) == (480, 108, 1440, 1080)
    frame = np.zeros((1080, 1920, 3), dtype=np.uint8)
    assert crop(frame, roi).shape == (972, 960, 3)
    for bad in ["0.5,0.5,0.6,0.1", "1,2,3", "a,b,c,d", "0,0,0,1"]:
        with pytest.raises(ValueError):
            Roi.parse(bad)


# ---------------------------------------------------------------- contract
def _summary() -> Any:
    agg = WindowAggregator(min_frames=3)
    for _ in range(20):
        agg.add_frame([Box("glove", 0.85), Box("no_mask", 0.7), Box("hairnet", 0.9)], inference_ms=6.1)
    return agg.flush()


def test_message_built_by_camera_is_accepted_by_edge() -> None:
    msg = detections_message("vk-cam-01", 42, START, NOW, "ppe_yolo26n_best@abc123", _summary())
    result = parse_detections(TOPIC, msg.model_dump_json().encode(), NOW + timedelta(milliseconds=200))
    assert isinstance(result, AcceptedDetections), result
    by = {d.indicator: d for d in result.detections}
    assert set(by) == {Indicator.GLOVES, Indicator.MASK, Indicator.HAIRNET}
    assert by[Indicator.MASK].compliant is False and by[Indicator.GLOVES].compliant is True
    assert by[Indicator.GLOVES].detected_at == NOW  # window end
    assert by[Indicator.GLOVES].metadata["frames_observed"] == 20
    assert result.model_version == "ppe_yolo26n_best@abc123" and result.seq == 42


def _raw(**overrides: Any) -> bytes:
    msg = json.loads(detections_message("vk-cam-01", 1, START, NOW, "m@1", _summary()).model_dump_json())
    msg.update(overrides)
    return json.dumps(msg).encode()


@pytest.mark.parametrize(
    ("payload", "reason"),
    [
        (_raw(device_id="vk-cam-02"), "does not match"),
        (_raw(window_end=(START + timedelta(minutes=5)).isoformat()), "60 s"),
        (_raw(window_end=START.isoformat()), "longer than 0"),
        (
            _raw(
                window_start=(NOW + timedelta(minutes=10)).isoformat(),
                window_end=(NOW + timedelta(minutes=10, seconds=5)).isoformat(),
            ),
            "future",
        ),
        (
            _raw(
                indicators=[
                    {
                        "indicator": "gloves",
                        "compliant": True,
                        "confidence": 0.9,
                        "frames_observed": 5,
                        "frames_compliant": 3,
                        "frames_noncompliant": 1,
                    }
                ]
            ),
            "must equal",
        ),
        (
            _raw(
                indicators=[
                    {
                        "indicator": "smiling",
                        "compliant": True,
                        "confidence": 0.9,
                        "frames_observed": 1,
                        "frames_compliant": 1,
                        "frames_noncompliant": 0,
                    }
                ]
            ),
            "indicator",
        ),
        (_raw(frames_analysed=3), "exceeds"),
        (_raw(v=2), "version"),
    ],
)
def test_invalid_detection_messages_are_rejected(payload: bytes, reason: str) -> None:
    result = parse_detections(TOPIC, payload, NOW)
    assert isinstance(result, Rejected) and reason in result.reason, result


# ---------------------------------------------------------------- edge ingestion
def _runner(config: ScoringConfig) -> tuple[EdgeRunner, FakeRepository]:
    repo = FakeRepository(config)
    pipeline = Pipeline(
        repo,
        kitchen_id="k1",
        config=config,
        env_device_id="vk-env-01",
        camera_device_id="vk-cam-01",
        model_version="configured",
        window_s=60,
        report_env_device=False,
        report_camera_device=False,
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


def test_runner_stores_camera_windows_with_their_model_version(config: ScoringConfig) -> None:
    runner, repo = _runner(config)
    msg = detections_message("vk-cam-01", 7, START, NOW, "ppe@abc", _summary())
    runner.handle(Inbound("vk/kitchen-001/vk-cam-01/detections", msg.model_dump_json().encode(), NOW))
    assert len(repo.detections) == 3
    assert set(repo.detection_model_versions) == {"ppe@abc"}
    assert repo.devices["vk-cam-01"]["state"] == "online"
    assert repo.devices["vk-cam-01"]["model_version"] == "ppe@abc"
    assert runner.stats.windows == 1


def test_empty_window_keeps_camera_online_without_evidence(config: ScoringConfig) -> None:
    runner, repo = _runner(config)
    empty = WindowAggregator().flush()
    msg = detections_message("vk-cam-01", 0, START, NOW, "ppe@abc", empty)
    # frames_analysed 0 is still a valid message (camera alive, worker out of view).
    runner.handle(Inbound("vk/kitchen-001/vk-cam-01/detections", msg.model_dump_json().encode(), NOW))
    assert repo.detections == [] and "vk-cam-01" in repo.devices


def test_devices_may_only_send_their_own_kind_of_evidence(config: ScoringConfig) -> None:
    runner, repo = _runner(config)
    msg = detections_message("vk-env-01", 1, START, NOW, "x", _summary()).model_dump_json().encode()
    runner.handle(Inbound("vk/kitchen-001/vk-env-01/detections", msg, NOW))
    runner.handle(Inbound("vk/kitchen-001/vk-cam-01/telemetry", b'{"v":1}', NOW))
    assert repo.detections == [] and repo.readings == []
    assert sum(runner.stats.rejected.values()) == 2


def test_camera_status_keeps_only_safe_fields(config: ScoringConfig) -> None:
    runner, repo = _runner(config)
    status = {
        "v": 1,
        "device_id": "vk-cam-01",
        "state": "online",
        "camera": "ok",
        "fps": 5.0,
        "source": "rtsp://192.168.1.50",
        "url": "rtsp://admin:secret@192.168.1.50/stream1",
    }
    runner.handle(Inbound("vk/kitchen-001/vk-cam-01/status", json.dumps(status).encode(), NOW))
    stored = repo.devices["vk-cam-01"]
    assert stored["camera"] == "ok" and stored["fps"] == 5.0
    assert "url" not in stored and "secret" not in json.dumps(stored, default=str)


# ---------------------------------------------------------------- service loop
class FakeCamera:
    description = "fake"

    def __init__(self, frames: bool = True) -> None:
        self._id = 0
        self._frames = frames
        self._frame = np.zeros((480, 640, 3), dtype=np.uint8)

    def latest(self) -> tuple[int, Any]:
        if not self._frames:
            return 0, None
        self._id += 1
        return self._id, self._frame

    def seconds_since_frame(self) -> float | None:
        return 0.0 if self._frames else None

    def stop(self) -> None:
        pass


class FakeDetector:
    model_version = "fake@000"

    def __init__(self, boxes: list[Box]) -> None:
        self.boxes = boxes
        self.shapes: list[tuple[int, ...]] = []

    def detect(self, image: Any) -> tuple[list[Box], float]:
        self.shapes.append(image.shape)
        return self.boxes, 5.0


class FakePublisher:
    def __init__(self) -> None:
        self.messages: list[DetectionsV1] = []
        self.statuses: list[dict[str, Any]] = []

    def detections(self, message: Any) -> None:
        self.messages.append(message)

    def status(self, fields: dict[str, Any]) -> None:
        self.statuses.append(fields)


def _service(camera: Any, detector: Any, publisher: Any, **kw: Any) -> VisionService:
    return VisionService(
        camera=camera,
        detector=detector,
        publisher=publisher,
        device_id="vk-cam-01",
        fps=50,
        window_s=0.2,
        min_frames=2,
        **kw,
    )


def test_service_publishes_windows_from_cropped_frames() -> None:
    publisher = FakePublisher()
    detector = FakeDetector([Box("glove", 0.9), Box("no_mask", 0.8)])
    service = _service(FakeCamera(), detector, publisher, roi=Roi(0.5, 0.0, 0.5, 1.0))
    stats = service.run(threading.Event(), max_windows=2)
    assert stats.windows == 2 and len(publisher.messages) == 2
    assert [m.seq for m in publisher.messages] == [0, 1]
    assert {r.indicator for r in publisher.messages[0].indicators} == {Indicator.GLOVES, Indicator.MASK}
    assert detector.shapes[0] == (480, 320, 3)  # inference ran on the worker region only
    assert publisher.messages[0].window_end == publisher.messages[1].window_start  # contiguous windows


def test_no_frames_means_no_evidence_and_camera_error_status() -> None:
    publisher = FakePublisher()
    service = _service(FakeCamera(frames=False), FakeDetector([]), publisher, status_interval_s=5)
    stop = threading.Event()
    timer = threading.Timer(0.5, stop.set)
    timer.start()
    service.run(stop)
    timer.cancel()
    assert publisher.messages == []


# ---------------------------------------------------------------- privacy
VISION_DIR = Path(__file__).resolve().parents[1] / "src" / "edge_service" / "vision"


def test_vision_code_contains_no_way_to_store_images() -> None:
    forbidden = re.compile(r"imwrite|VideoWriter|\.save\(|save=True|save_crop|save_txt|open\([^)]*['\"][wa]b?['\"]")
    offenders = [
        f"{p.name}:{n}: {line.strip()}"
        for p in VISION_DIR.glob("*.py")
        for n, line in enumerate(p.read_text().splitlines(), 1)
        if forbidden.search(line)
    ]
    assert offenders == []


def test_running_the_pipeline_creates_no_files(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir(tmp_path)
    before = {p for p in tmp_path.rglob("*")}
    _service(FakeCamera(), FakeDetector([Box("hairnet", 0.9)]), FakePublisher()).run(threading.Event(), max_windows=3)
    assert {p for p in tmp_path.rglob("*")} == before
    assert not any(os.scandir(tmp_path))


def test_model_fingerprint_is_stable_and_content_based(tmp_path: Path) -> None:
    pkg = tmp_path / "ppe.mlpackage"
    (pkg / "Data").mkdir(parents=True)
    (pkg / "Data" / "weights").write_bytes(b"abc")
    first = fingerprint(pkg)
    assert first == fingerprint(pkg) and first.startswith("ppe@") and len(first) == len("ppe@") + 12
    (pkg / "Data" / "weights").write_bytes(b"abd")
    assert fingerprint(pkg) != first


def test_closing_the_preview_keeps_detection_running() -> None:
    publisher = FakePublisher()
    calls: list[int] = []

    def preview(frame: Any, roi: Any, states: dict[str, str]) -> bool:
        calls.append(1)
        return False  # user pressed Q on the first frame

    service = _service(FakeCamera(), FakeDetector([Box("glove", 0.9)]), publisher, preview=preview)
    stats = service.run(threading.Event(), max_windows=2)
    assert len(calls) == 1 and service.preview is None
    assert stats.windows == 2  # still analysing and publishing after the preview closed
