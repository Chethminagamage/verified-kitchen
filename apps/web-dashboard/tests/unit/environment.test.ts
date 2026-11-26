import { describe, expect, it } from "vitest";

import {
  combineStats,
  formatUptime,
  parseRange,
  safeRangeFrom,
  sensorHealth,
  signalQuality,
} from "@/modules/environment/model/environment.model";

describe("parseRange", () => {
  it("defaults to 24 h and ignores unknown values", () => {
    expect(parseRange(undefined)).toBe("24h");
    expect(parseRange("1h")).toBe("1h");
    expect(parseRange(["7d", "1h"])).toBe("7d");
    expect(parseRange("1y")).toBe("24h");
  });
});

describe("safeRangeFrom (safe ranges come from the scoring config, never the dashboard)", () => {
  const thresholds = {
    environment: {
      fridge_temp_c: { min: 0, max: 5, tolerance: 3 },
      humidity_pct: { max: 70, tolerance: 15 },
    },
  };

  it("reads the configured range", () => {
    expect(safeRangeFrom(thresholds, "fridge_temp_c")).toEqual({ min: 0, max: 5 });
    expect(safeRangeFrom(thresholds, "humidity_pct")).toEqual({ min: null, max: 70 });
  });

  it("returns null when the config has no range (no invented limits)", () => {
    expect(safeRangeFrom(thresholds, "ambient_temp_c")).toBeNull();
    expect(safeRangeFrom({}, "fridge_temp_c")).toBeNull();
    expect(safeRangeFrom(null, "fridge_temp_c")).toBeNull();
    expect(safeRangeFrom({ environment: { fridge_temp_c: { min: "0" } } }, "fridge_temp_c")).toBeNull();
  });
});

describe("combineStats", () => {
  it("weights the average by samples and keeps the extremes", () => {
    expect(
      combineStats([
        { min: 3, avg: 4, max: 5, samples: 10 },
        { min: 6, avg: 8, max: 9, samples: 30 },
      ])
    ).toEqual({ min: 3, avg: 7, max: 9 });
  });

  it("skips buckets where the sensor had no valid reading", () => {
    expect(
      combineStats([
        { min: null, avg: null, max: null, samples: 10 },
        { min: 4, avg: 4, max: 4, samples: 10 },
      ])
    ).toEqual({ min: 4, avg: 4, max: 4 });
    expect(combineStats([])).toBeNull();
  });
});

describe("device helpers", () => {
  it("reads sensor health", () => {
    expect(sensorHealth({ ds18b20: "ok" }, "ds18b20")).toBe(true);
    expect(sensorHealth({ ds18b20: "error" }, "ds18b20")).toBe(false);
    expect(sensorHealth({}, "ds18b20")).toBeNull();
  });

  it("formats uptime", () => {
    expect(formatUptime(16)).toBe("16 s");
    expect(formatUptime(600)).toBe("10 min");
    expect(formatUptime(3 * 3600 + 120)).toBe("3 h 2 min");
    expect(formatUptime(5 * 86400)).toBe("5 days");
  });

  it("rates Wi-Fi signal", () => {
    expect(signalQuality(-52)).toBe("Excellent");
    expect(signalQuality(-62)).toBe("Good");
    expect(signalQuality(-72)).toBe("Fair");
    expect(signalQuality(-85)).toBe("Weak");
  });
});
