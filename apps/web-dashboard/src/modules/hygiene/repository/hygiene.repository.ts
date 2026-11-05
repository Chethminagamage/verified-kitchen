import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/shared/types/database.types";

export interface ScoreRow {
  overall_score: number;
  personal_score: number | null;
  food_prep_score: number | null;
  environmental_score: number | null;
  computed_at: string;
  details: Json;
}

export interface ReadingRow {
  device_ts: string;
  ambient_temp_c: number | null;
  humidity_pct: number | null;
  fridge_temp_c: number | null;
}

function fail(what: string, message: string): never {
  throw new Error(`Could not load ${what}: ${message}`);
}

export class HygieneRepository {
  async latestScore(kitchenId: string): Promise<ScoreRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("hygiene_scores")
      .select("overall_score, personal_score, food_prep_score, environmental_score, computed_at, details")
      .eq("kitchen_id", kitchenId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) fail("latest score", error.message);
    return data;
  }

  async latestReading(kitchenId: string): Promise<ReadingRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sensor_readings")
      .select("device_ts, ambient_temp_c, humidity_pct, fridge_temp_c")
      .eq("kitchen_id", kitchenId)
      .order("device_ts", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) fail("latest reading", error.message);
    return data;
  }

  /** Time of the most recent AI detection for each indicator (recent window only). */
  async latestDetections(kitchenId: string, since: Date): Promise<Map<string, string>> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_detections")
      .select("indicator, detected_at")
      .eq("kitchen_id", kitchenId)
      .gte("detected_at", since.toISOString())
      .order("detected_at", { ascending: false })
      .limit(200);
    if (error) fail("AI detections", error.message);
    const latest = new Map<string, string>();
    for (const d of data) {
      if (!latest.has(d.indicator)) latest.set(d.indicator, d.detected_at);
    }
    return latest;
  }

  async openViolationIndicators(kitchenId: string): Promise<Set<string>> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("violations")
      .select("indicator")
      .eq("kitchen_id", kitchenId)
      .in("status", ["active", "acknowledged"]);
    if (error) fail("open violations", error.message);
    return new Set(data.map((v) => v.indicator));
  }

  async activeThresholds(): Promise<Json | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scoring_configs")
      .select("thresholds")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (error) fail("scoring config", error.message);
    return data?.thresholds ?? null;
  }
}
