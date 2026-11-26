import { describe, expect, it } from "vitest";

import { liveMetricStatus, metricStatus, missingPillars, sensorFeedLive } from "@/modules/dashboard/model/metric-status";
import { explainScore } from "@/modules/dashboard/model/score-details";
import { scoreBand } from "@/modules/dashboard/model/score-band";
import { connectionState, installedDevices, isDeviceOnline } from "@/modules/system-status/model/connection";

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

  it("is offline at once when the broker reports the device's last will", () => {
    expect(isDeviceOnline({ ...device("2026-11-04T09:59:50Z"), reportedOffline: true }, now)).toBe(false);
  });

  it("ignores devices that have never reported (not installed yet)", () => {
    const devices = [device("2026-11-04T09:59:50Z"), { ...device(null), id: "camera" }];
    const installed = installedDevices(devices);
    expect(installed).toHaveLength(1);
    expect(connectionState(installed.filter((d) => isDeviceOnline(d, now)).length, installed.length)).toBe("online");
  });

  it("summarises devices into online / degraded / offline", () => {
    expect(connectionState(2, 2)).toBe("online");
    expect(connectionState(1, 2)).toBe("degraded");
    expect(connectionState(0, 2)).toBe("offline");
    expect(connectionState(0, 0)).toBe("offline");
  });
});

describe("sensor feed liveness", () => {
  const now = Date.parse("2026-11-05T16:00:00Z");
  const secondsAgo = (s: number) => new Date(now - s * 1000).toISOString();

  it("is live only with a recent reading and no offline last will", () => {
    expect(sensorFeedLive(secondsAgo(30), false, now)).toBe(true);
    expect(sensorFeedLive(secondsAgo(30), true, now)).toBe(false); // unplugged: broker reported offline
    expect(sensorFeedLive(secondsAgo(121), false, now)).toBe(false); // stopped reporting
    expect(sensorFeedLive(null, false, now)).toBe(false);
  });

  it("never shows Safe/Critical for a value that is not live", () => {
    const details = { environment: { fridge_temp_c: { score: 0 } } };
    expect(liveMetricStatus(27.3, details, "fridge_temp_c", true)).toBe("Critical");
    expect(liveMetricStatus(27.3, details, "fridge_temp_c", false)).toBe("Offline");
    expect(liveMetricStatus(null, details, "fridge_temp_c", false)).toBe("No data");
  });
});

describe("score explanation (from the scoring engine's details)", () => {
  it("reads grade, caps and the items costing the most points", () => {
    const e = explainScore(
      {
        grade: "B",
        uncapped_overall: 86.2,
        caps_applied: [{ key: "fridge_temp_c", cap: 74, reason: "Refrigerator at or above 8 °C for 15 min", since: "2026-11-15T10:00:00Z" }],
        impacts: [
          { item: "hairnet", points: 3.1 },
          { item: "fridge_temp_c", points: 12.9 },
          { item: "mask", points: 0.4 },
        ],
      },
      74
    );
    expect(e.grade).toBe("B");
    expect(e.uncapped).toBe(86.2);
    expect(e.caps[0]).toMatchObject({ key: "fridge_temp_c", cap: 74 });
    expect(e.issues.map((i) => i.label)).toEqual(["Refrigerator temperature", "Hairnet"]); // sorted, <1 pt dropped
  });

  it("tolerates scores stored before the explanation existed", () => {
    expect(explainScore({ config_version: "v0-provisional" }, 91)).toEqual({ grade: null, uncapped: null, caps: [], issues: [] });
    expect(explainScore(null, 91).grade).toBeNull();
    expect(explainScore({ grade: "Z", caps_applied: [{ cap: "x" }] }, 50)).toMatchObject({ grade: null, caps: [] });
  });
});
