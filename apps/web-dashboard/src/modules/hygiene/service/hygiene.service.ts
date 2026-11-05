import { metricStatus } from "@/modules/dashboard/model/metric-status";
import { METRICS, safeRangeFrom } from "@/modules/environment/model/environment.model";

import {
  AI_STALE_AFTER_MS,
  INDICATORS,
  PILLAR_INFO,
  SCORE_STALE_AFTER_MS,
  aiCheckStatus,
  indicatorBreakdown,
  type HygieneCheck,
  type HygienePage,
  type PillarId,
} from "../model/hygiene.model";
import { HygieneRepository } from "../repository/hygiene.repository";

export class HygieneService {
  constructor(private readonly repository = new HygieneRepository()) {}

  async getPage(kitchenId: string, timezone: string, now = new Date()): Promise<HygienePage> {
    const [score, reading, detections, openKeys, thresholds] = await Promise.all([
      this.repository.latestScore(kitchenId),
      this.repository.latestReading(kitchenId),
      this.repository.latestDetections(kitchenId, new Date(now.getTime() - 60 * 60 * 1000)),
      this.repository.openViolationIndicators(kitchenId),
      this.repository.activeThresholds(),
    ]);

    const latestAi = [...detections.values()].sort().at(-1) ?? null;
    const aiConnected = latestAi !== null && now.getTime() - new Date(latestAi).getTime() <= AI_STALE_AFTER_MS;

    const aiChecks = (pillar: "personal" | "food_prep"): HygieneCheck[] =>
      INDICATORS.filter((i) => i.pillar === pillar).map((i) => {
        // Indicator results only count while the camera is actually sending evidence.
        const b = aiConnected ? indicatorBreakdown(score?.details, i.id) : { score: null, confidentSamples: null, meanConfidence: null };
        return {
          id: i.id,
          name: i.name,
          source: "AI",
          status: aiCheckStatus(b.score, openKeys.has(i.id)),
          compliancePct: b.score,
          confidence: b.meanConfidence,
          samples: b.confidentSamples,
          value: null,
          unit: null,
          decimals: 0,
          safeRange: null,
          lastChecked: detections.get(i.id) ?? null,
        };
      });

    const sensorChecks: HygieneCheck[] = METRICS.map((m) => {
      const value = reading?.[m.id] ?? null;
      return {
        id: m.id,
        name: m.name,
        source: "Sensor",
        status: value === null ? "No data" : metricStatus(score?.details, m.id),
        compliancePct: null,
        confidence: null,
        samples: null,
        value,
        unit: m.unit,
        decimals: m.decimals,
        safeRange: safeRangeFrom(thresholds ?? undefined, m.id),
        lastChecked: reading?.device_ts ?? null,
      };
    });

    const pillarScore = (id: PillarId): number | null => {
      if (!score) return null;
      if (id === "personal") return aiConnected ? score.personal_score : null;
      if (id === "food_prep") return aiConnected ? score.food_prep_score : null;
      return score.environmental_score;
    };

    return {
      timezone,
      generatedAt: now.toISOString(),
      overall: score?.overall_score ?? null,
      computedAt: score?.computed_at ?? null,
      scoreIsStale: !score || now.getTime() - new Date(score.computed_at).getTime() > SCORE_STALE_AFTER_MS,
      aiConnected,
      pillars: (["personal", "food_prep", "environmental"] as const).map((id) => ({
        id,
        ...PILLAR_INFO[id],
        score: pillarScore(id),
        checks: id === "environmental" ? sensorChecks : aiChecks(id),
      })),
    };
  }
}
