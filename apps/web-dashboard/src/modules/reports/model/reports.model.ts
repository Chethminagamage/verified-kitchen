export interface ReportSummary {
  /** Mean of all stored scores in the period (null = no scores). */
  averageHygieneScore: number | null;
  /** Share of stored scores rated Good or better (>= 75). */
  complianceRate: number | null;
  scoredSamples: number;
  totalViolations: number;
  verifiedAuditRecords: number;
  pendingAuditRecords: number;
}

export interface HygieneTrendPoint {
  date: string;
  score: number | null;
}

export interface PillarPerformance {
  pillar: string;
  averageScore: number | null;
}

export interface ViolationBreakdown {
  category: string;
  count: number;
}

export interface EnvironmentalSummary {
  id: string;
  metric: string;
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  unit: string;
  decimals: number;
  samples: number;
}

export interface ReportsData {
  period: string;
  summary: ReportSummary;
  hygieneTrend: HygieneTrendPoint[];
  pillarPerformance: PillarPerformance[];
  violationBreakdown: ViolationBreakdown[];
  environmentalSummary: EnvironmentalSummary[];
}

/** Score at or above which a scored minute counts as compliant ("Good" band). */
export const COMPLIANT_SCORE = 75;
export const REPORT_PERIOD_DAYS = 7;

export interface SeriesBucket {
  samples: number;
  overall: number | null;
  personal: number | null;
  foodPrep: number | null;
  environmental: number | null;
}

/** Sample-weighted average of one field over buckets, ignoring buckets without it. */
export function weightedAverage(
  buckets: ReadonlyArray<SeriesBucket>,
  field: keyof Omit<SeriesBucket, "samples">
): number | null {
  let sum = 0;
  let n = 0;
  for (const b of buckets) {
    const v = b[field];
    if (v === null || b.samples <= 0) continue;
    sum += v * b.samples;
    n += b.samples;
  }
  return n === 0 ? null : sum / n;
}
