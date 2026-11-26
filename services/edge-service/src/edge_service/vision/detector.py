"""YOLO detector wrapper (Ultralytics; CoreML on Apple Silicon -> Neural Engine).

Returns only class names and confidences; the image itself never leaves this call.
The model version recorded with every result is the file name plus the first 12
hex digits of its SHA-256, so each stored detection is traceable to the exact
weights that produced it.
"""

from __future__ import annotations

import hashlib
import importlib
import logging
from pathlib import Path
from typing import Any, Protocol

from .ppe import Box

log = logging.getLogger(__name__)


class Detector(Protocol):
    model_version: str

    def detect(self, image: Any) -> tuple[list[Box], float]:
        """Boxes and inference time in milliseconds."""
        ...


def fingerprint(path: Path) -> str:
    """`<name>@<sha256[:12]>` over the file, or over every file of a .mlpackage directory."""
    digest = hashlib.sha256()
    files = sorted(p for p in path.rglob("*") if p.is_file()) if path.is_dir() else [path]
    for f in files:
        digest.update(f.relative_to(path).as_posix().encode() if path.is_dir() else b"")
        with f.open("rb") as fh:
            for block in iter(lambda: fh.read(1 << 20), b""):
                digest.update(block)
    return f"{path.stem}@{digest.hexdigest()[:12]}"


class YoloDetector:
    def __init__(self, model_path: Path, *, imgsz: int = 640, conf: float = 0.4) -> None:
        if not model_path.exists():
            raise FileNotFoundError(
                f"model not found: {model_path}. Put the trained model there (see README 'Vision') "
                "or set VISION_MODEL in .env"
            )
        # Optional extra (uv sync --extra vision); loaded dynamically so the sensor
        # service and CI do not need PyTorch.
        yolo: Any = importlib.import_module("ultralytics").YOLO

        self._coreml = model_path.suffix == ".mlpackage"
        self._model: Any = yolo(str(model_path), task="detect")
        self._imgsz = imgsz
        self._conf = conf
        self._device: str | None = None
        if not self._coreml:
            torch: Any = importlib.import_module("torch")
            self._device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.model_version = fingerprint(model_path)
        self.class_names: dict[int, str] = dict(self._model.names or {})

    def detect(self, image: Any) -> tuple[list[Box], float]:
        r = self._model.predict(image, imgsz=self._imgsz, conf=self._conf, device=self._device, verbose=False)[0]
        names: dict[int, str] = r.names
        self.class_names = names
        boxes = [
            Box(cls=names[int(c)], confidence=float(p))
            for c, p in zip(r.boxes.cls.tolist(), r.boxes.conf.tolist(), strict=True)
        ]
        return boxes, float(r.speed.get("inference", 0.0))

    def warm_up(self, image: Any) -> None:
        """First CoreML call compiles the model (~1 s); keep it out of the measurements."""
        self.detect(image)
        log.info("model %s ready (%s)", self.model_version, "CoreML / Neural Engine" if self._coreml else self._device)
