/**
 * Chart styling shared by every chart in the console.
 *
 * Series colours are the first four slots of a validated categorical palette
 * (blue, orange, aqua, yellow), assigned in fixed order and always to the same
 * thing, so "food preparation" is aqua on every chart. Validated as a set:
 * colour-blind separation and normal-vision separation pass. Aqua and yellow
 * are below 3:1 against white, so every chart that uses them also shows a
 * legend or labels and a data-table view (never colour alone).
 *
 * Status colours (green / amber / red) are NOT used for series: they are
 * reserved for good / warning / critical states.
 */

export type ChartPillarId = "personal" | "food_prep" | "environmental";

export const SERIES_COLORS = {
  overall: "#2a78d6", // slot 1, blue
  personal: "#eb6834", // slot 2, orange
  food_prep: "#1baf7a", // slot 3, aqua
  environmental: "#eda100", // slot 4, yellow
} as const;

/** The colour of a chart that has only one series. */
export const SINGLE_SERIES_COLOR = SERIES_COLORS.overall;

/** Safe range band behind sensor lines (status "good", drawn faint). */
export const SAFE_BAND_COLOR = "#10b981";

export const GRID_STROKE = "#e2e8f0";
export const AXIS_TICK = { fontSize: 12, fill: "#64748b" } as const;
export const CURSOR = { stroke: "#94a3b8", strokeWidth: 1 } as const;
export const LINE_WIDTH = 2;
export const ACTIVE_DOT = { r: 4, stroke: "#ffffff", strokeWidth: 2 } as const;
export const CHART_MARGIN = { top: 8, right: 12, left: -18, bottom: 0 } as const;
/** Rounded data end of a bar (4 px), square at the baseline. */
export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
/** Light fill shown behind the hovered bar. */
export const BAR_CURSOR = { fill: "#f1f5f9" } as const;
