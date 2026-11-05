import type { KitchenSummary } from "@/modules/auth/model/session.model";
import { formatDateTime } from "@/shared/utils/time";

import { REPORT_PERIOD_DAYS, weightedAverage, type ReportsData } from "../model/reports.model";
import { ReportsRepository } from "../repository/reports.repository";

export class ReportsService {
  constructor(private readonly repository = new ReportsRepository()) {}

  async getReportsData(kitchen: KitchenSummary, now = new Date()): Promise<ReportsData> {
    const from = new Date(now.getTime() - REPORT_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const [trend, daily, compliance, byPillar, audit, environmentalSummary] = await Promise.all([
      this.repository.scoreSeries(kitchen.id, from, now, "6 hours"),
      this.repository.scoreSeries(kitchen.id, from, now, "1 day"),
      this.repository.complianceCounts(kitchen.id, from, now),
      this.repository.violationsByPillar(kitchen.id, from, now),
      this.repository.auditCounts(kitchen.id),
      this.repository.environmentalSummary(kitchen.id, from, now),
    ]);

    const average = weightedAverage(daily, "overall");

    return {
      period: `Last ${REPORT_PERIOD_DAYS} days (since ${formatDateTime(from.toISOString(), kitchen.timezone)})`,
      summary: {
        averageHygieneScore: average === null ? null : Math.round(average * 10) / 10,
        complianceRate:
          compliance.total === 0 ? null : Math.round((1000 * compliance.compliant) / compliance.total) / 10,
        scoredSamples: compliance.total,
        totalViolations: Object.values(byPillar).reduce((a, b) => a + b, 0),
        verifiedAuditRecords: audit.verified,
        pendingAuditRecords: audit.pending,
      },
      hygieneTrend: trend.map((b) => ({
        date: formatDateTime(b.bucket, kitchen.timezone),
        score: b.overall === null ? null : Math.round(b.overall * 10) / 10,
      })),
      pillarPerformance: [
        { pillar: "Personal", averageScore: weightedAverage(daily, "personal") },
        { pillar: "Food Prep", averageScore: weightedAverage(daily, "foodPrep") },
        { pillar: "Environmental", averageScore: weightedAverage(daily, "environmental") },
      ].map((p) => ({ ...p, averageScore: p.averageScore === null ? null : Math.round(p.averageScore * 10) / 10 })),
      violationBreakdown: [
        { category: "Personal", count: byPillar.personal ?? 0 },
        { category: "Food Prep", count: byPillar.food_prep ?? 0 },
        { category: "Environmental", count: byPillar.environmental ?? 0 },
      ],
      environmentalSummary,
    };
  }
}
