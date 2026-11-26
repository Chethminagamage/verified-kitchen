import { isDeviceOnline } from "@/modules/system-status/model/connection";
import type { Json } from "@/shared/types/database.types";

import { paginate } from "@/shared/utils/pagination";

import {
  EVENTS_PAGE_SIZE,
  FOOD_PREP_CARDS,
  HISTORY_MS,
  INDICATOR_NAMES,
  PPE_INDICATORS,
  cameraStatusFields,
  complianceRate,
  liveState,
  pooledHistory,
  windowFrames,
  type AIMonitoringPage,
  type CameraView,
  type DetectionRow,
  type IndicatorView,
} from "../model/ai-monitoring.model";
import { AIMonitoringRepository, type CameraRow } from "../repository/ai-monitoring.repository";

/** A stored score older than this no longer describes "now". */
const SCORE_FRESH_MS = 5 * 60 * 1000;

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

function indicatorView(
  card: { id: string; name: string; requirement: string },
  history: DetectionRow[],
  now: number,
): IndicatorView {
  const latest = history[0];
  const state = liveState(latest, now);
  const frames = latest ? windowFrames(latest.metadata) : { compliant: null, observed: null };
  const live = state !== "Not in view";
  return {
    id: card.id,
    name: card.name,
    requirement: card.requirement,
    state,
    confidence: live ? latest.confidence : null,
    framesCompliant: live ? frames.compliant : null,
    framesObserved: live ? frames.observed : null,
    lastChecked: latest?.detected_at ?? null,
    complianceRate: complianceRate(history),
    windowsLastHour: history.length,
  };
}

export class AIMonitoringService {
  constructor(private readonly repository = new AIMonitoringRepository()) {}

  async getPage(
    kitchenId: string,
    timezone: string,
    { eventsPage = 1, now = new Date() }: { eventsPage?: number; now?: Date } = {},
  ): Promise<AIMonitoringPage> {
    const since = new Date(now.getTime() - HISTORY_MS);
    const [camera, personalRows, foodRows, score] = await Promise.all([
      this.repository.camera(kitchenId),
      this.repository.detections(kitchenId, "personal", since),
      this.repository.detections(kitchenId, "food_prep", since),
      this.repository.latestPillarScores(kitchenId),
    ]);
    const rows = [...personalRows, ...foodRows].sort((a, b) => b.detected_at.localeCompare(a.detected_at));

    const byIndicator = new Map<string, DetectionRow[]>();
    for (const r of rows) {
      const list = byIndicator.get(r.indicator) ?? [];
      list.push(r); // rows are newest first
      byIndicator.set(r.indicator, list);
    }

    const indicators = PPE_INDICATORS.map((i) => indicatorView(i, byIndicator.get(i.id) ?? [], now.getTime()));
    const foodPrep = FOOD_PREP_CARDS.map((c) =>
      indicatorView(c, pooledHistory(byIndicator, c.indicators), now.getTime()),
    );

    const inference = rows.map((r) => r.inference_ms).filter((v): v is number => v !== null);
    const windows = new Set(rows.map((r) => r.detected_at));
    const scoreFresh = score !== null && now.getTime() - new Date(score.computed_at).getTime() <= SCORE_FRESH_MS;

    const events = paginate(rows, eventsPage, EVENTS_PAGE_SIZE);

    return {
      timezone,
      generatedAt: now.toISOString(),
      camera: cameraView(camera, now.getTime()),
      indicators,
      foodPrep,
      events: events.items.map((r) => {
        const frames = windowFrames(r.metadata);
        return {
          key: `${r.detected_at}-${r.indicator}`,
          at: r.detected_at,
          indicator: INDICATOR_NAMES[r.indicator] ?? r.indicator,
          compliant: r.compliant,
          confidence: r.confidence,
          framesCompliant: frames.compliant,
          framesObserved: frames.observed,
        };
      }),
      eventsPagination: {
        page: events.page,
        pageCount: events.pageCount,
        total: events.total,
        first: events.first,
        last: events.last,
      },
      personalScore: scoreFresh ? score.personal_score : null,
      foodPrepScore: scoreFresh ? score.food_prep_score : null,
      windowsLastHour: windows.size,
      meanInferenceMs: inference.length ? inference.reduce((a, b) => a + b, 0) / inference.length : null,
    };
  }
}
