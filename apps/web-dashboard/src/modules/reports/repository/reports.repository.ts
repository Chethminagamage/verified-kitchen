import type {
  ReportsData,
} from "../model/reports.model";

export class ReportsRepository {
  async getReportsData(): Promise<ReportsData> {
    return {
      kitchenName: "Verified Kitchen - Test Kitchen",

      period: "Last 7 Days",

      summary: {
        averageHygieneScore: 86.4,
        complianceRate: 91,
        totalViolations: 17,
        verifiedAuditRecords: 12,
      },

      hygieneTrend: [
        {
          date: "19 Aug",
          score: 84,
        },
        {
          date: "20 Aug",
          score: 86,
        },
        {
          date: "21 Aug",
          score: 83,
        },
        {
          date: "22 Aug",
          score: 88,
        },
        {
          date: "23 Aug",
          score: 90,
        },
        {
          date: "24 Aug",
          score: 87,
        },
        {
          date: "25 Aug",
          score: 87,
        },
      ],

      pillarPerformance: [
        {
          pillar: "Personal Hygiene",
          averageScore: 91,
        },
        {
          pillar: "Food Preparation",
          averageScore: 84,
        },
        {
          pillar: "Environmental",
          averageScore: 88,
        },
      ],

      violationBreakdown: [
        {
          category: "Personal Hygiene",
          count: 7,
        },
        {
          category: "Food Preparation",
          count: 6,
        },
        {
          category: "Environmental",
          count: 4,
        },
      ],

      environmentalSummary: [
        {
          id: "temperature",
          metric: "Kitchen Temperature",
          average: 26.8,
          minimum: 24.9,
          maximum: 29.2,
          unit: "°C",
        },
        {
          id: "humidity",
          metric: "Humidity",
          average: 60.7,
          minimum: 54,
          maximum: 68,
          unit: "%",
        },
        {
          id: "refrigerator",
          metric: "Refrigerator Temperature",
          average: 4.1,
          minimum: 3.4,
          maximum: 6.2,
          unit: "°C",
        },
      ],
    };
  }
}