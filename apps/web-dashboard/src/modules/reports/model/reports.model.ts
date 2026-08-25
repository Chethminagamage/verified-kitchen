export interface ReportSummary {
  averageHygieneScore: number;
  complianceRate: number;
  totalViolations: number;
  verifiedAuditRecords: number;
}

export interface HygieneTrendPoint {
  date: string;
  score: number;
}

export interface PillarPerformance {
  pillar: string;
  averageScore: number;
}

export interface ViolationBreakdown {
  category: string;
  count: number;
}

export interface EnvironmentalSummary {
  id: string;
  metric: string;
  average: number;
  minimum: number;
  maximum: number;
  unit: string;
}

export interface ReportsData {
  kitchenName: string;
  period: string;

  summary: ReportSummary;

  hygieneTrend: HygieneTrendPoint[];

  pillarPerformance: PillarPerformance[];

  violationBreakdown: ViolationBreakdown[];

  environmentalSummary: EnvironmentalSummary[];
}