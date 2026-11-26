"""PPE evidence from detector output (pure functions, no camera, model or network).

Three steps, each unit-tested:

1. **Class -> indicator.** The PPE model has explicit positive and negative classes
   (`glove` / `no_glove`, `mask` / `no_mask` / `incorrect_mask`, `hairnet` / `no_hairnet`).
   Only an explicit negative class counts as non-compliance: if neither is detected,
   the indicator is *unknown* for that frame, never a violation.
2. **Per frame.** Any negative box makes the frame non-compliant for that indicator
   (one bare hand is a breach even if the other is gloved). Otherwise any positive
   box makes it compliant.
3. **Per window (default 5 s).** Majority vote over the frames that observed the
   indicator. An indicator observed in fewer than `min_frames` frames is left out
   (unknown), so a single flicker cannot produce evidence. One result per indicator
   per window is what the scoring engine and `ai_detections` expect.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass, field
from statistics import fmean

from ..domain import Indicator

# model class name -> (indicator, compliant)
PPE_CLASSES: dict[str, tuple[Indicator, bool]] = {
    "glove": (Indicator.GLOVES, True),
    "no_glove": (Indicator.GLOVES, False),
    "mask": (Indicator.MASK, True),
    "no_mask": (Indicator.MASK, False),
    "incorrect_mask": (Indicator.MASK, False),  # worn below the nose / chin: not compliant
    "hairnet": (Indicator.HAIRNET, True),
    "no_hairnet": (Indicator.HAIRNET, False),
}

PPE_INDICATORS: tuple[Indicator, ...] = (Indicator.HAIRNET, Indicator.MASK, Indicator.GLOVES)


@dataclass(frozen=True, slots=True)
class Box:
    """One detection from the model (only the class and confidence are needed; no image data)."""

    cls: str
    confidence: float


@dataclass(frozen=True, slots=True)
class FrameState:
    compliant: bool
    confidence: float  # strongest box supporting the decision


def frame_states(boxes: Iterable[Box]) -> dict[Indicator, FrameState]:
    """Decision per indicator for one frame. Indicators with no relevant box are absent (unknown)."""
    best: dict[tuple[Indicator, bool], float] = {}
    for b in boxes:
        mapped = PPE_CLASSES.get(b.cls)
        if mapped is None:
            continue
        best[mapped] = max(best.get(mapped, 0.0), b.confidence)

    states: dict[Indicator, FrameState] = {}
    for indicator in PPE_INDICATORS:
        if (indicator, False) in best:
            states[indicator] = FrameState(False, best[(indicator, False)])
        elif (indicator, True) in best:
            states[indicator] = FrameState(True, best[(indicator, True)])
    return states


@dataclass(frozen=True, slots=True)
class IndicatorWindow:
    """Aggregated result for one indicator over one window (becomes one ai_detections row)."""

    indicator: Indicator
    compliant: bool
    confidence: float
    frames_observed: int
    frames_compliant: int
    frames_noncompliant: int
    classes: dict[str, int]


@dataclass(frozen=True, slots=True)
class WindowSummary:
    frames_analysed: int
    inference_ms: float | None
    indicators: list[IndicatorWindow]


@dataclass(slots=True)
class _Tally:
    compliant: list[float] = field(default_factory=list)  # confidences of compliant frames
    noncompliant: list[float] = field(default_factory=list)


FrameStatesFn = Callable[[Iterable[Box]], dict[Indicator, FrameState]]


class WindowAggregator:
    """Collects per-frame results and turns them into one result per indicator per window.

    PPE by default; the food-prep pillar uses the same window rules with its own
    indicators, class map and per-frame decision (see `food_prep.py`).
    """

    def __init__(
        self,
        min_frames: int = 3,
        *,
        indicators: tuple[Indicator, ...] = PPE_INDICATORS,
        class_map: Mapping[str, tuple[Indicator, bool]] = PPE_CLASSES,
        states: FrameStatesFn = frame_states,
    ) -> None:
        if min_frames < 1:
            raise ValueError("min_frames must be at least 1")
        self.min_frames = min_frames
        self.indicators = indicators
        self._class_map = class_map
        self._states = states
        self._reset()

    def _reset(self) -> None:
        self._frames = 0
        self._inference_ms: list[float] = []
        self._tally: dict[Indicator, _Tally] = {i: _Tally() for i in self.indicators}
        self._classes: dict[Indicator, Counter[str]] = {i: Counter() for i in self.indicators}

    @property
    def frames(self) -> int:
        return self._frames

    def add_frame(self, boxes: Iterable[Box], inference_ms: float | None = None) -> None:
        boxes = list(boxes)
        self._frames += 1
        if inference_ms is not None:
            self._inference_ms.append(inference_ms)
        for b in boxes:
            mapped = self._class_map.get(b.cls)
            if mapped is not None:
                self._classes[mapped[0]][b.cls] += 1
        for indicator, state in self._states(boxes).items():
            tally = self._tally[indicator]
            (tally.compliant if state.compliant else tally.noncompliant).append(state.confidence)

    def flush(self) -> WindowSummary:
        """Result of the window so far; starts a new window."""
        results: list[IndicatorWindow] = []
        for indicator in self.indicators:
            t = self._tally[indicator]
            observed = len(t.compliant) + len(t.noncompliant)
            if observed < self.min_frames:
                continue  # unknown in this window: no evidence either way
            # Majority vote; a tie is resolved as compliant so that a flickering
            # detector does not create evidence of a breach on its own.
            compliant = len(t.compliant) >= len(t.noncompliant)
            support = t.compliant if compliant else t.noncompliant
            results.append(
                IndicatorWindow(
                    indicator=indicator,
                    compliant=compliant,
                    confidence=round(fmean(support), 4),
                    frames_observed=observed,
                    frames_compliant=len(t.compliant),
                    frames_noncompliant=len(t.noncompliant),
                    classes=dict(self._classes[indicator]),
                )
            )
        summary = WindowSummary(
            frames_analysed=self._frames,
            inference_ms=round(fmean(self._inference_ms), 2) if self._inference_ms else None,
            indicators=results,
        )
        self._reset()
        return summary
