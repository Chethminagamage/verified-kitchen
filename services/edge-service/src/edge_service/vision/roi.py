"""Worker-region crop (pure).

Shrinking a full 1080p frame to the model's 640 px input makes hands only ~15 px
wide, too small to tell gloved from bare. Cropping the region where the worker
stands before inference keeps them large. The region is given as fractions of the
frame (`x,y,w,h`, each 0-1), so it survives a change of camera resolution.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Roi:
    x: float
    y: float
    w: float
    h: float

    def __post_init__(self) -> None:
        for name, v in (("x", self.x), ("y", self.y), ("w", self.w), ("h", self.h)):
            if not 0.0 <= v <= 1.0:
                raise ValueError(f"ROI {name}={v} must be between 0 and 1")
        if self.w <= 0 or self.h <= 0:
            raise ValueError("ROI width and height must be greater than 0")
        if self.x + self.w > 1.0 + 1e-9 or self.y + self.h > 1.0 + 1e-9:
            raise ValueError("ROI must lie inside the frame")

    @classmethod
    def parse(cls, text: str) -> Roi | None:
        """`"x,y,w,h"` as fractions, or empty for the full frame."""
        text = text.strip()
        if not text:
            return None
        parts = [p.strip() for p in text.split(",")]
        if len(parts) != 4:
            raise ValueError(f"ROI must be 'x,y,w,h' (fractions 0-1), got {text!r}")
        try:
            x, y, w, h = (float(p) for p in parts)
        except ValueError as exc:
            raise ValueError(f"ROI values must be numbers, got {text!r}") from exc
        return cls(x, y, w, h)

    def pixels(self, width: int, height: int) -> tuple[int, int, int, int]:
        """(x0, y0, x1, y1) in pixels for a frame of this size; never empty."""
        x0 = min(int(self.x * width), width - 1)
        y0 = min(int(self.y * height), height - 1)
        x1 = max(x0 + 1, min(width, round((self.x + self.w) * width)))
        y1 = max(y0 + 1, min(height, round((self.y + self.h) * height)))
        return x0, y0, x1, y1

    def __str__(self) -> str:
        return f"{self.x:g},{self.y:g},{self.w:g},{self.h:g}"
