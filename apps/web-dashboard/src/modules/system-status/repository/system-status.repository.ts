import { createClient } from "@/infrastructure/supabase/server";

import type { DeviceHeartbeat } from "../model/system-status.model";

export class SystemStatusRepository {
  async getDevices(
    kitchenId: string
  ): Promise<DeviceHeartbeat[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("devices")
      .select("id, name, type, last_seen_at, last_status")
      .eq("kitchen_id", kitchenId);

    if (error) {
      throw new Error(
        `Could not load devices: ${error.message}`
      );
    }

    return data.map((device) => ({
      id: device.id,
      name: device.name,
      type: device.type,
      lastSeenAt: device.last_seen_at,
      reportedOffline:
        typeof device.last_status === "object" &&
        device.last_status !== null &&
        !Array.isArray(device.last_status) &&
        device.last_status.state === "offline",
    }));
  }

  async countActiveViolations(
    kitchenId: string
  ): Promise<number> {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("violations")
      .select("id", { count: "exact", head: true })
      .eq("kitchen_id", kitchenId)
      .eq("status", "active");

    if (error) {
      throw new Error(
        `Could not count violations: ${error.message}`
      );
    }

    return count ?? 0;
  }
}
