import {
  SCORE_STALE_AFTER_MS,
  TREND_HOURS,
  type DashboardOverview,
  type MetricId,
  type PillarId,
  type PillarScore,
  type SensorSummary,
} from "../model/dashboard.model";
import { scoreBand } from "../model/score-band";
import { isRecord, metricStatus, missingPillars } from "../model/metric-status";
import {
  DashboardRepository,
  type LatestReadingRow,
  type LatestScoreRow,
} from "../repository/dashboard.repository";

const PILLARS: ReadonlyArray<{
  id: PillarId;
  name: string;
  description: string;
  column: keyof Pick<
    LatestScoreRow,
    "personal_score" | "food_prep_score" | "environmental_score"
  >;
}> = [
  {
    id: "personal",
    name: "Personal Hygiene",
    description: "Hairnet, mask and gloves",
    column: "personal_score",
  },
  {
    id: "food_prep",
    name: "Food Preparation",
    description: "Surface cleanliness, spills and waste",
    column: "food_prep_score",
  },
  {
    id: "environmental",
    name: "Environmental Hygiene",
    description: "Temperature, humidity and refrigeration",
    column: "environmental_score",
  },
];

const METRICS: ReadonlyArray<{
  id: MetricId;
  name: string;
  unit: string;
}> = [
  { id: "ambient_temp_c", name: "Kitchen Temperature", unit: "°C" },
  { id: "humidity_pct", name: "Humidity", unit: "%" },
  { id: "fridge_temp_c", name: "Refrigerator", unit: "°C" },
];

function sensors(
  reading: LatestReadingRow | null,
  score: LatestScoreRow | null
): SensorSummary[] {
  return METRICS.map((metric) => {
    const value = reading?.[metric.id] ?? null;

    return {
      ...metric,
      value,
      status:
        value === null
          ? "No data"
          : metricStatus(score?.details, metric.id),
    };
  });
}

export class DashboardService {
  constructor(
    private readonly repository = new DashboardRepository()
  ) {}

  async getOverview(
    kitchenId: string,
    timezone: string,
    now = new Date()
  ): Promise<DashboardOverview> {
    const from = new Date(now.getTime() - TREND_HOURS * 60 * 60 * 1000);

    const [score, reading, series, violations] =
      await Promise.all([
        this.repository.getLatestScore(kitchenId),
        this.repository.getLatestReading(kitchenId),
        this.repository.getScoreSeries(kitchenId, from, now, "1 hour"),
        this.repository.getOpenViolations(kitchenId, 5),
      ]);

    const pillars: PillarScore[] = PILLARS.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      score: score?.[p.column] ?? null,
    }));

    return {
      timezone,
      generatedAt: now.toISOString(),
      score: score && {
        value: score.overall_score,
        band: scoreBand(score.overall_score),
        computedAt: score.computed_at,
        isStale:
          now.getTime() - new Date(score.computed_at).getTime() >
          SCORE_STALE_AFTER_MS,
        missingPillars: missingPillars(score.details),
        configVersion:
          isRecord(score.details) &&
          typeof score.details.config_version === "string"
            ? score.details.config_version
            : null,
      },
      pillars,
      sensors: sensors(reading, score),
      sensorsUpdatedAt: reading?.device_ts ?? null,
      trend: series.map((row) => ({
        bucket: row.bucket,
        overall: row.overall_score,
        personal: row.personal_score,
        foodPrep: row.food_prep_score,
        environmental: row.environmental_score,
      })),
      openViolationCount: violations.total,
      openViolations: violations.rows.map((v) => ({
        id: v.id,
        title: v.title,
        severity: v.severity,
        status: v.status,
        pillar: v.pillar,
        occurredAt: v.occurred_at,
      })),
    };
  }
}
