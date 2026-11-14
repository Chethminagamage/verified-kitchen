import { isDeviceOnline } from "@/modules/system-status/model/connection";
import type { Json } from "@/shared/types/database.types";

import {
  HISTORY_MS,
  PPE_INDICATORS,
  cameraStatusFields,
  complianceRate,
  liveState,
  windowFrames,
  type AIMonitoringPage,
  type CameraView,
  type DetectionRow,
} from "../model/ai-monitoring.model";
import { AIMonitoringRepository, type CameraRow } from "../repository/ai-monitoring.repository";

/** A stored score older than this no longer describes "now". */
const SCORE_FRESH_MS = 5 * 60 * 1000;
const EVENTS_SHOWN = 30;

function cameraView(row: CameraRow | null, now: number): CameraView {
  const status: Json = row?.last_status ?? null;
  const fields = cameraStatusFields(status);
  const reportedOffline =
    typeof status === "object" && status !== null && !Array.isArray(status) && status.state === "offline";
  return {
    ...fields,
    installed: row?.last_seen_at != null,
    online:
      row !== null &&
      isDeviceOnline({ id: row.id, name: row.name, type: "camera", lastSeenAt: row.last_seen_at, reportedOffline }, now),
    lastSeenAt: row?.last_seen_at ?? null,
  };
}

export class AIMonitoringService {
  constructor(private readonly repository = new AIMonitoringRepository()) {}

  async getPage(kitchenId: string, timezone: string, now = new Date()): Promise<AIMonitoringPage> {
    const since = new Date(now.getTime() - HISTORY_MS);
    const [camera, rows, score] = await Promise.all([
      this.repository.camera(kitchenId),
      this.repository.detections(kitchenId, since),
      this.repository.latestPersonalScore(kitchenId),
    ]);

    const byIndicator = new Map<string, DetectionRow[]>();
    for (const r of rows) {
      const list = byIndicator.get(r.indicator) ?? [];
      list.push(r); // rows are newest first
      byIndicator.set(r.indicator, list);
    }

    const indicators = PPE_INDICATORS.map((i) => {
      const history = byIndicator.get(i.id) ?? [];
      const latest = history[0];
      const state = liveState(latest, now.getTime());
      const frames = latest ? windowFrames(latest.metadata) : { compliant: null, observed: null };
      const live = state !== "Not in view";
      return {
        ...i,
        state,
        confidence: live ? latest.confidence : null,
        framesCompliant: live ? frames.compliant : null,
        framesObserved: live ? frames.observed : null,
        lastChecked: latest?.detected_at ?? null,
        complianceRate: complianceRate(history),
        windowsLastHour: history.length,
      };
    });

    const inference = rows.map((r) => r.inference_ms).filter((v): v is number => v !== null);
    const windows = new Set(rows.map((r) => r.detected_at));
    const scoreFresh = score !== null && now.getTime() - new Date(score.computed_at).getTime() <= SCORE_FRESH_MS;

    return {
      timezone,
      generatedAt: now.toISOString(),
      camera: cameraView(camera, now.getTime()),
      indicators,
      events: rows.slice(0, EVENTS_SHOWN).map((r) => {
        const frames = windowFrames(r.metadata);
        return {
          key: `${r.detected_at}-${r.indicator}`,
          at: r.detected_at,
          indicator: PPE_INDICATORS.find((i) => i.id === r.indicator)?.name ?? r.indicator,
          compliant: r.compliant,
          confidence: r.confidence,
          framesCompliant: frames.compliant,
          framesObserved: frames.observed,
        };
      }),
      personalScore: scoreFresh ? score.personal_score : null,
      windowsLastHour: windows.size,
      meanInferenceMs: inference.length ? inference.reduce((a, b) => a + b, 0) / inference.length : null,
    };
  }
}
