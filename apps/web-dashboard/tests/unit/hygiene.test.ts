import { describe, expect, it } from "vitest";

import { aiCheckStatus, indicatorBreakdown } from "@/modules/hygiene/model/hygiene.model";

describe("aiCheckStatus (verdicts come from the backend, not the dashboard)", () => {
  it("is non-compliant only while the backend has an open violation", () => {
    expect(aiCheckStatus(20, true)).toBe("Non-Compliant");
    expect(aiCheckStatus(20, false)).toBe("Compliant");
    expect(aiCheckStatus(100, false)).toBe("Compliant");
  });

  it("never assumes compliance without evidence", () => {
    expect(aiCheckStatus(null, false)).toBe("No evidence");
    expect(aiCheckStatus(null, true)).toBe("Non-Compliant");
  });
});

describe("indicatorBreakdown", () => {
  it("reads the per-indicator details stored with each score", () => {
    const details = { indicators: { gloves: { score: 33.33, confident_samples: 6, mean_confidence: 0.88 } } };
    expect(indicatorBreakdown(details, "gloves")).toEqual({ score: 33.33, confidentSamples: 6, meanConfidence: 0.88 });
  });

  it("is empty when the camera produced no evidence", () => {
    expect(indicatorBreakdown({ indicators: { gloves: { score: null, confident_samples: 0 } } }, "gloves")).toEqual({
      score: null,
      confidentSamples: 0,
      meanConfidence: null,
    });
    expect(indicatorBreakdown(null, "mask")).toEqual({ score: null, confidentSamples: null, meanConfidence: null });
  });
});
