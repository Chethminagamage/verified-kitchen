"""Food-preparation evidence from detector output (pure functions, no camera, model or network).

The food-prep model detects *states of the preparation area*, not people:

* `clean_surface` / `dirty_surface`: a preparation surface (cutting board, counter work
  area) seen clean or dirty. Both feed the "surface" item, which pools the two.
* `food_waste`: scraps or peels left on the board, counter or floor. Waste inside a bin
  is correct disposal and is deliberately not labelled.
* `food_spill`: liquid spilled on a surface (only once the model has this class).

Per frame:

1. **Seen = evidence.** A surface box gives clean (compliant) or dirty (not compliant)
   evidence; a waste or spill box is evidence of a breach.
2. **Absence counts only when it can be seen.** "No waste" is compliant evidence only if
   a preparation surface is visible in the same frame (otherwise the camera may simply
   be blocked by a worker) *and* the model can detect that class at all. A model
   without a `food_spill` class therefore never produces spill evidence: the item stays
   unknown and is left out of the score, never counted as 100.

Windows use the same rules as PPE (`WindowAggregator`: majority vote, `min_frames`).
"""

from __future__ import annotations

from collections.abc import Collection, Iterable
from functools import partial

from ..domain import Indicator
from .ppe import Box, FrameState, FrameStatesFn, WindowAggregator

# model class name -> (indicator, compliant when the box is seen)
FOOD_PREP_CLASSES: dict[str, tuple[Indicator, bool]] = {
    "clean_surface": (Indicator.CLEAN_SURFACE, True),
    "dirty_surface": (Indicator.DIRTY_SURFACE, False),
    "food_waste": (Indicator.FOOD_WASTE, False),
    "food_spill": (Indicator.FOOD_SPILL, False),
}

FOOD_PREP_INDICATORS: tuple[Indicator, ...] = (
    Indicator.CLEAN_SURFACE,
    Indicator.DIRTY_SURFACE,
    Indicator.FOOD_WASTE,
    Indicator.FOOD_SPILL,
)

_SURFACE_CLASSES = ("clean_surface", "dirty_surface")
# Breaches whose absence is evidence of compliance while a surface is in view.
_ABSENCE_CLASSES = ("food_waste", "food_spill")


def food_prep_frame_states(boxes: Iterable[Box], known_classes: Collection[str]) -> dict[Indicator, FrameState]:
    """Decision per food-prep indicator for one frame; indicators without evidence are absent."""
    best: dict[str, float] = {}
    for b in boxes:
        if b.cls in FOOD_PREP_CLASSES:
            best[b.cls] = max(best.get(b.cls, 0.0), b.confidence)

    states: dict[Indicator, FrameState] = {}
    for cls, conf in best.items():
        indicator, compliant = FOOD_PREP_CLASSES[cls]
        states[indicator] = FrameState(compliant, conf)

    surface_conf = max((best[c] for c in _SURFACE_CLASSES if c in best), default=None)
    if surface_conf is not None:
        for cls in _ABSENCE_CLASSES:
            indicator = FOOD_PREP_CLASSES[cls][0]
            if cls in known_classes and indicator not in states:
                # Confidence of "nothing there" = how sure we are the surface is in view.
                states[indicator] = FrameState(True, surface_conf)
    return states


def food_prep_aggregator(known_classes: Collection[str], min_frames: int = 3) -> WindowAggregator:
    """Window aggregator for a food-prep model that can detect `known_classes`."""
    known = frozenset(known_classes)
    if not known & FOOD_PREP_CLASSES.keys():
        raise ValueError(f"model has none of the food-prep classes {sorted(FOOD_PREP_CLASSES)}")
    states: FrameStatesFn = partial(food_prep_frame_states, known_classes=known)
    return WindowAggregator(
        min_frames,
        indicators=tuple(i for i in FOOD_PREP_INDICATORS if _detectable(i, known)),
        class_map=FOOD_PREP_CLASSES,
        states=states,
    )


def _detectable(indicator: Indicator, known: frozenset[str]) -> bool:
    return any(ind is indicator and cls in known for cls, (ind, _) in FOOD_PREP_CLASSES.items())
