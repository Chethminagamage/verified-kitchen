import { createClient } from "@/infrastructure/supabase/server";
import {
  METRICS,
  combineStats,
} from "@/modules/environment/model/environment.model";

import type {
  EnvironmentalSummary,
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

      // Filled from real ESP32 readings by ReportsService.
      environmentalSummary: [],
    };
  }

  /** Average / min / max of the real ESP32 readings over a period. */
  async environmentalSummary(
    kitchenId: string,
    from: Date,
    to: Date
  ): Promise<EnvironmentalSummary[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("sensor_reading_series", {
      p_kitchen: kitchenId,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_bucket: "1 hour",
    });

    if (error) {
      throw new Error(`Could not load environmental summary: ${error.message}`);
    }

    const key = { ambient_temp_c: "ambient", humidity_pct: "humidity", fridge_temp_c: "fridge" } as const;

    return METRICS.map((m) => {
      const k = key[m.id];
      const stats = combineStats(
        data.map((b) => ({
          min: b[`${k}_min`] ?? null,
          avg: b[`${k}_avg`] ?? null,
          max: b[`${k}_max`] ?? null,
          samples: Number(b.samples),
        }))
      );
      return {
        id: m.id,
        metric: m.name,
        average: stats?.avg ?? null,
        minimum: stats?.min ?? null,
        maximum: stats?.max ?? null,
        unit: m.unit,
        decimals: m.decimals,
        samples: data.reduce((n, b) => n + Number(b.samples), 0),
      };
    });
  }
}
