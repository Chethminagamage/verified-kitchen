import { describe, expect, it } from "vitest";

import { metricStatus, missingPillars } from "@/modules/dashboard/model/metric-status";
import { scoreBand } from "@/modules/dashboard/model/score-band";
import { connectionState, isDeviceOnline } from "@/modules/system-status/model/connection";

describe("scoreBand", () => {
  it.each([
    [100, "Excellent"],
    [90, "Excellent"],
    [89.9, "Good"],
    [75, "Good"],
    [74.9, "Moderate"],
    [50, "Moderate"],
    [49.9, "Poor"],
    [0, "Poor"],
  ] as const)("%s -> %s", (score, band) => {
    expect(scoreBand(score)).toBe(band);
  });
});

describe("metricStatus (uses the backend's metric score, never local thresholds)", () => {
  const details = (score: number | null) => ({ environment: { fridge_temp_c: { mean: 4, score } } });

  it.each([
    [100, "Safe"],
    [50, "Warning"],
    [0.1, "Warning"],
    [0, "Critical"],
  ] as const)("score %s -> %s", (score, status) => {
    expect(metricStatus(details(score), "fridge_temp_c")).toBe(status);
  });

  it("is 'No data' when the backend had no reading for the metric", () => {
    expect(metricStatus(details(null), "fridge_temp_c")).toBe("No data");
    expect(metricStatus({ environment: {} }, "fridge_temp_c")).toBe("No data");
    expect(metricStatus(null, "fridge_temp_c")).toBe("No data");
    expect(metricStatus(undefined, "humidity_pct")).toBe("No data");
  });
});

describe("missingPillars", () => {
  it("keeps only known pillar names", () => {
    expect(missingPillars({ missing_pillars: ["personal", "food_prep", "bogus", 3] })).toEqual([
      "personal",
      "food_prep",
    ]);
  });

  it("tolerates malformed details", () => {
    expect(missingPillars({})).toEqual([]);
    expect(missingPillars("x")).toEqual([]);
    expect(missingPillars({ missing_pillars: "personal" })).toEqual([]);
  });
});

describe("device status", () => {
  const now = Date.parse("2026-11-04T10:00:00Z");
  const device = (lastSeenAt: string | null) => ({ id: "d", name: "d", type: "camera" as const, lastSeenAt });

  it("is online within 2 minutes of the last heartbeat", () => {
    expect(isDeviceOnline(device("2026-11-04T09:58:30Z"), now)).toBe(true);
    expect(isDeviceOnline(device("2026-11-04T09:57:59Z"), now)).toBe(false);
    expect(isDeviceOnline(device(null), now)).toBe(false);
  });

  it("summarises devices into online / degraded / offline", () => {
    expect(connectionState(2, 2)).toBe("online");
    expect(connectionState(1, 2)).toBe("degraded");
    expect(connectionState(0, 2)).toBe("offline");
    expect(connectionState(0, 0)).toBe("offline");
  });
});
