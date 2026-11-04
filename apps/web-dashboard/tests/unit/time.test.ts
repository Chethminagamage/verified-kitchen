import { describe, expect, it } from "vitest";

import { formatClock, formatDateTime, formatRelative } from "@/shared/utils/time";

const NOW = "2026-11-04T10:00:00Z";

describe("formatRelative", () => {
  it.each([
    ["2026-11-04T09:59:55Z", "just now"],
    ["2026-11-04T09:59:15Z", "45 s ago"],
    ["2026-11-04T09:48:00Z", "12 min ago"],
    ["2026-11-04T07:00:00Z", "3 h ago"],
    ["2026-11-01T10:00:00Z", "3 days ago"],
  ])("%s -> %s", (iso, expected) => {
    expect(formatRelative(iso, NOW)).toBe(expected);
  });

  it("never shows negative ages for clock skew", () => {
    expect(formatRelative("2026-11-04T10:00:30Z", NOW)).toBe("just now");
  });
});

describe("kitchen-local formatting", () => {
  it("uses the kitchen time zone (Colombo is UTC+5:30)", () => {
    expect(formatClock("2026-11-04T08:35:00Z", "Asia/Colombo")).toBe("14:05");
    expect(formatDateTime("2026-11-04T08:35:00Z", "Asia/Colombo")).toBe("4 Nov 14:05");
  });

  it("shows midnight as 00:00, never 24:00", () => {
    expect(formatClock("2026-11-03T18:30:00Z", "Asia/Colombo")).toBe("00:00");
  });

  it("produces the same text regardless of the machine's locale data", () => {
    // Guards the hydration fix: no locale connector words like "at" or ",".
    expect(formatDateTime("2026-12-31T23:59:00Z", "UTC")).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{2}:\d{2}$/);
  });
});
