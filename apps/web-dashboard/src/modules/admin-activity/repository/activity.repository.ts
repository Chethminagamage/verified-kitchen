import { createClient } from "@/infrastructure/supabase/server";

import type { AuditRow } from "@/modules/admin-kitchens/repository/kitchens.repository";

export class ActivityRepository {
  async latest(limit: number): Promise<AuditRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("id, action, actor_email, target_type, target_id, target_label, details, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Could not load the activity log: ${error.message}`);
    return data;
  }
}
