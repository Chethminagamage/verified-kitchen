import { describe, expect, it } from "vitest";

import {
  LIVE_WINDOW_MS,
  cameraStatusFields,
  complianceRate,
  liveState,
  splitModelVersion,
  windowFrames,
  type DetectionRow,
} from "@/modules/ai-monitoring/model/ai-monitoring.model";

const NOW = Date.parse("2026-11-14T10:00:00Z");

function row(secondsAgo: number, compliant: boolean): DetectionRow {
  return {
    detected_at: new Date(NOW - secondsAgo * 1000).toISOString(),
    indicator: "gloves",
    compliant,
    confidence: 0.86,
    inference_ms: 6.4,
    model_version: "ppe_yolo26n_best@ada23a1ecd47",
    metadata: { frames_observed: 20, frames_compliant: 18 },
  };
}

describe("live indicator state", () => {
  it("follows the newest window while it is recent", () => {
    expect(liveState(row(5, true), NOW)).toBe("Compliant");
    expect(liveState(row(5, false), NOW)).toBe("Non-Compliant");
  });

  it("is 'Not in view' when the newest window is old or missing (never a violation)", () => {
    expect(liveState(row(LIVE_WINDOW_MS / 1000 + 1, false), NOW)).toBe("Not in view");
    expect(liveState(undefined, NOW)).toBe("Not in view");
  });
});

describe("compliance rate", () => {
  it("is the share of compliant windows, or null without windows", () => {
    expect(complianceRate([{ compliant: true }, { compliant: true }, { compliant: false }, { compliant: true }])).toBe(75);
    expect(complianceRate([])).toBeNull();
  });
});

describe("camera status and metadata parsing", () => {
  it("reads the fields the camera publishes and ignores anything malformed", () => {
    const fields = cameraStatusFields({
      state: "online",
      camera: "ok",
      source: "webcam 0",
      model_version: "ppe@abc",
      fps: 4.9,
      inference_ms: "fast",
      roi: "full frame",
    });
    expect(fields).toMatchObject({ camera: "ok", source: "webcam 0", modelVersion: "ppe@abc", fps: 4.9, inferenceMs: null });
    expect(cameraStatusFields(null).camera).toBeNull();
    expect(windowFrames({ frames_observed: 20, frames_compliant: 18 })).toEqual({ compliant: 18, observed: 20 });
    expect(windowFrames([])).toEqual({ compliant: null, observed: null });
  });

  it("splits the model name from its weights fingerprint", () => {
    expect(splitModelVersion("ppe_yolo26n_best@ada23a1ecd47")).toEqual({ name: "ppe_yolo26n_best", hash: "ada23a1ecd47" });
    expect(splitModelVersion("simulator-v1")).toEqual({ name: "simulator-v1", hash: null });
    expect(splitModelVersion(null)).toBeNull();
  });
});
