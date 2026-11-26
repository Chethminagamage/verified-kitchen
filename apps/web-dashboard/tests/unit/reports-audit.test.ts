import { describe, expect, it } from "vitest";

import { chainCheckFrom, describeEvent, eventLabel } from "@/modules/audit/model/audit.model";
import { weightedAverage } from "@/modules/reports/model/reports.model";

describe("weightedAverage", () => {
  it("weights by samples and skips buckets without the value", () => {
    const b = [
      { samples: 10, overall: 80, personal: null, foodPrep: null, environmental: 80 },
      { samples: 30, overall: 40, personal: null, foodPrep: null, environmental: 40 },
    ];
    expect(weightedAverage(b, "overall")).toBe(50);
    expect(weightedAverage(b, "personal")).toBeNull(); // no AI evidence: never shown as 0
    expect(weightedAverage([], "overall")).toBeNull();
  });
});

describe("audit descriptions", () => {
  it("summarises a raised violation from its stored payload", () => {
    expect(
      describeEvent(
        "violation_created",
        { title: "Refrigerator temperature above safe limit", severity: "critical", sensor_value: 27.5, sensor_unit: "°C" },
        null
      )
    ).toBe("Refrigerator temperature above safe limit (27.5 °C) · critical");
  });

  it("names who changed a status", () => {
    const payload = { from: "active", to: "acknowledged", changed_by: "u1" };
    expect(describeEvent("violation_status_changed", payload, "u1")).toBe("active → acknowledged by you");
    expect(describeEvent("violation_status_changed", payload, "u2")).toBe("active → acknowledged by an operator");
    expect(describeEvent("violation_status_changed", { ...payload, changed_by: null }, "u1")).toBe(
      "active → acknowledged by the system"
    );
  });

  it("labels events", () => {
    expect(eventLabel("violation_created")).toBe("Violation raised");
    expect(eventLabel("daily_score_summary")).toBe("daily score summary");
  });
});

describe("chainCheckFrom", () => {
  it("reports an intact chain", () => {
    const c = chainCheckFrom([{ chain_seq: 1, ok: true, reason: null }, { chain_seq: 2, ok: true, reason: null }], "t");
    expect(c).toEqual({ checkedAt: "t", records: 2, intact: true, firstProblem: null });
  });

  it("reports the first broken link", () => {
    const c = chainCheckFrom(
      [
        { chain_seq: 1, ok: true, reason: null },
        { chain_seq: 2, ok: false, reason: "record content modified" },
        { chain_seq: 3, ok: false, reason: "prev_hash does not match previous record" },
      ],
      "t"
    );
    expect(c.intact).toBe(false);
    expect(c.firstProblem).toEqual({ seq: 2, reason: "record content modified" });
  });
});
