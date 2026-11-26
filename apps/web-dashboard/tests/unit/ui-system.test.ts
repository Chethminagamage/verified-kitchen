import { describe, expect, it } from "vitest";

import { scoreChange, type TrendPoint } from "@/modules/dashboard/model/dashboard.model";
import { scoreBand } from "@/modules/dashboard/model/score-band";
import { easeOutCubic, interpolate } from "@/shared/components/ui/AnimatedNumber";
import { TONES, toneForScore, toneForStatus } from "@/shared/components/ui/tone";
import { initials } from "@/shared/utils/initials";

describe("toneForStatus", () => {
  it("maps the console's status words to one colour meaning, ignoring case", () => {
    expect(toneForStatus("Compliant")).toBe("positive");
    expect(toneForStatus("SAFE")).toBe("positive");
    expect(toneForStatus("Warning")).toBe("warning");
    expect(toneForStatus("high")).toBe("serious");
    expect(toneForStatus("Non-Compliant")).toBe("critical");
    expect(toneForStatus("Critical")).toBe("critical");
    expect(toneForStatus("No evidence")).toBe("neutral");
    expect(toneForStatus("Not in view")).toBe("neutral");
  });

  it("treats unknown or missing statuses as neutral, never as good or bad news", () => {
    expect(toneForStatus("something new")).toBe("neutral");
    expect(toneForStatus(null)).toBe("neutral");
    expect(toneForStatus(undefined)).toBe("neutral");
  });

  it("has classes for every tone it can return", () => {
    for (const word of ["compliant", "warning", "high", "critical", "offline", "x"]) {
      expect(TONES[toneForStatus(word)]).toBeDefined();
    }
  });
});

describe("toneForScore", () => {
  it("agrees with the score bands shown as text (Good+ / Moderate / Poor)", () => {
    for (let score = 0; score <= 100; score += 0.5) {
      const band = scoreBand(score);
      const expected = band === "Excellent" || band === "Good" ? "positive" : band === "Moderate" ? "warning" : "critical";
      expect(toneForScore(score)).toBe(expected);
    }
  });

  it("is neutral without a score", () => {
    expect(toneForScore(null)).toBe("neutral");
    expect(toneForScore(Number.NaN)).toBe("neutral");
  });
});

describe("scoreChange", () => {
  const point = (overall: number | null, hour: number): TrendPoint => ({
    bucket: `2026-11-25T${String(hour).padStart(2, "0")}:00:00Z`,
    overall,
    personal: null,
    foodPrep: null,
    environmental: null,
  });

  it("compares the current score with the oldest scored hour", () => {
    expect(scoreChange([point(null, 0), point(70, 1), point(80, 2)], 82.4)).toBe(12);
    expect(scoreChange([point(90, 0), point(85, 1)], 84)).toBe(-6);
  });

  it("has nothing to compare with fewer than two scored hours", () => {
    expect(scoreChange([], 80)).toBeNull();
    expect(scoreChange([point(null, 0), point(75, 1)], 80)).toBeNull();
  });
});

describe("initials", () => {
  it("takes the first and last word of a name", () => {
    expect(initials("Kitchen Operator")).toBe("KO");
    expect(initials("  Nimal  Perera  Silva ")).toBe("NS");
    expect(initials("nimal")).toBe("N");
  });

  it("falls back to the email's name part, then to a question mark", () => {
    expect(initials(null, "kitchen.operator01@gmail.com")).toBe("KO");
    expect(initials("", "")).toBe("?");
    expect(initials(undefined)).toBe("?");
  });
});

describe("AnimatedNumber maths", () => {
  it("eases from 0 to 1 and clamps outside that range", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5); // fast start, gentle stop
  });

  it("moves between two values, ending exactly on the target", () => {
    expect(interpolate(60, 80, 0)).toBe(60);
    expect(interpolate(60, 80, 1)).toBe(80);
    expect(interpolate(80, 60, 1)).toBe(60);
  });
});
