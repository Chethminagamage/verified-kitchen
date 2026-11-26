import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/shared/types/database.types";

import type { ViolationSeverity, ViolationStatus } from "../model/environment.model";

export interface ReadingRow {
  device_ts: string;
  ambient_temp_c: number | null;
  humidity_pct: number | null;
  fridge_temp_c: number | null;
}

export interface BucketRow {
  bucket: string;
  samples: number;
  ambient_avg: number | null;
  ambient_min: number | null;
  ambient_max: number | null;
  humidity_avg: number | null;
  humidity_min: number | null;
  humidity_max: number | null;
  fridge_avg: number | null;
  fridge_min: number | null;
  fridge_max: number | null;
}

export interface DeviceRow {
  id: string;
  name: string;
  last_seen_at: string | null;
  last_status: Json | null;
}

export interface ViolationRow {
  id: string;
  title: string;
  severity: ViolationSeverity;
  status: ViolationStatus;
  occurred_at: string;
  sensor_value: number | null;
  sensor_unit: string | null;
}

function fail(what: string, message: string): never {
  throw new Error(`Could not load ${what}: ${message}`);
}

export class EnvironmentRepository {
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

  /** Raw readings (used for short ranges: one hour is ~120 readings). */
  async readings(kitchenId: string, from: Date, to: Date): Promise<ReadingRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sensor_readings")
      .select("device_ts, ambient_temp_c, humidity_pct, fridge_temp_c")
      .eq("kitchen_id", kitchenId)
      .gte("device_ts", from.toISOString())
      .lt("device_ts", to.toISOString())
      .order("device_ts")
      .limit(1000);
    if (error) fail("sensor readings", error.message);
    return data;
  }

  async buckets(kitchenId: string, from: Date, to: Date, bucket: string): Promise<BucketRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("sensor_reading_series", {
      p_kitchen: kitchenId,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_bucket: bucket,
    });
    if (error) fail("sensor history", error.message);
    return data as BucketRow[];
  }

  async latestScore(kitchenId: string): Promise<{ environmental_score: number | null; details: Json } | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("hygiene_scores")
      .select("environmental_score, details")
      .eq("kitchen_id", kitchenId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) fail("latest score", error.message);
    return data;
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

  async environmentNode(kitchenId: string): Promise<DeviceRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("devices")
      .select("id, name, last_seen_at, last_status")
      .eq("kitchen_id", kitchenId)
      .eq("type", "env_node")
      .order("id")
      .limit(1)
      .maybeSingle();
    if (error) fail("environmental node", error.message);
    return data;
  }

  async recentViolations(kitchenId: string, limit: number): Promise<ViolationRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("violations")
      .select("id, title, severity, status, occurred_at, sensor_value, sensor_unit")
      .eq("kitchen_id", kitchenId)
      .eq("pillar", "environmental")
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) fail("environmental violations", error.message);
    return data;
  }
}
