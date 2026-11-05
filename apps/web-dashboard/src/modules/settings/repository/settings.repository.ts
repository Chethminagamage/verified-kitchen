import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/shared/types/database.types";

export interface DeviceRow {
  id: string;
  type: "env_node" | "camera";
  name: string;
  last_seen_at: string | null;
  last_status: Json | null;
}

function fail(what: string, message: string): never {
  throw new Error(`Could not load ${what}: ${message}`);
}

export class SettingsRepository {
  async devices(kitchenId: string): Promise<DeviceRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("devices")
      .select("id, type, name, last_seen_at, last_status")
      .eq("kitchen_id", kitchenId)
      .order("id");
    if (error) fail("devices", error.message);
    return data;
  }

  async latestReadingAt(kitchenId: string): Promise<string | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sensor_readings")
      .select("device_ts")
      .eq("kitchen_id", kitchenId)
      .order("device_ts", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) fail("latest reading", error.message);
    return data?.device_ts ?? null;
  }

  async pendingAuditRecords(kitchenId: string): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("audit_records")
      .select("id", { count: "exact", head: true })
      .eq("kitchen_id", kitchenId)
      .eq("status", "pending");
    if (error) fail("audit records", error.message);
    return count ?? 0;
  }

  async activeConfigVersion(): Promise<string | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scoring_configs")
      .select("version")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (error) fail("scoring config", error.message);
    return data?.version ?? null;
  }
}
