import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/shared/types/database.types";

import type {
  PillarId,
  ViolationSeverity,
  ViolationStatus,
} from "../model/dashboard.model";

export interface LatestScoreRow {
  overall_score: number;
  personal_score: number | null;
  food_prep_score: number | null;
  environmental_score: number | null;
  computed_at: string;
  details: Json;
}

export interface LatestReadingRow {
  device_ts: string;
  ambient_temp_c: number | null;
  humidity_pct: number | null;
  fridge_temp_c: number | null;
}

export interface SeriesRow {
  bucket: string;
  overall_score: number | null;
  personal_score: number | null;
  food_prep_score: number | null;
  environmental_score: number | null;
}

export interface OpenViolationRow {
  id: string;
  title: string;
  severity: ViolationSeverity;
  status: ViolationStatus;
  pillar: PillarId;
  occurred_at: string;
}

function fail(what: string, message: string): never {
  throw new Error(`Could not load ${what}: ${message}`);
}

export class DashboardRepository {
  async getLatestScore(
    kitchenId: string
  ): Promise<LatestScoreRow | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("hygiene_scores")
      .select(
        "overall_score, personal_score, food_prep_score, environmental_score, computed_at, details"
      )
      .eq("kitchen_id", kitchenId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      fail("latest hygiene score", error.message);
    }

    return data;
  }

  async getLatestReading(
    kitchenId: string
  ): Promise<LatestReadingRow | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("sensor_readings")
      .select(
        "device_ts, ambient_temp_c, humidity_pct, fridge_temp_c"
      )
      .eq("kitchen_id", kitchenId)
      .order("device_ts", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      fail("latest sensor reading", error.message);
    }

    return data;
  }

  async getScoreSeries(
    kitchenId: string,
    from: Date,
    to: Date,
    bucket: string
  ): Promise<SeriesRow[]> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "hygiene_score_series",
      {
        p_kitchen: kitchenId,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
        p_bucket: bucket,
      }
    );

    if (error) {
      fail("hygiene score trend", error.message);
    }

    // Averages are null for pillars with no evidence in a bucket.
    return data as SeriesRow[];
  }

  async getOpenViolations(
    kitchenId: string,
    limit: number
  ): Promise<{
    rows: OpenViolationRow[];
    total: number;
  }> {
    const supabase = await createClient();

    const { data, error, count } = await supabase
      .from("violations")
      .select(
        "id, title, severity, status, pillar, occurred_at",
        { count: "exact" }
      )
      .eq("kitchen_id", kitchenId)
      .in("status", ["active", "acknowledged"])
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (error) {
      fail("open violations", error.message);
    }

    return { rows: data, total: count ?? data.length };
  }
}
