import { createClient } from "@/infrastructure/supabase/server";

import {
  PAGE_SIZE,
  type AuditStatus,
  type EvidenceSource,
  type PillarId,
  type TargetStatus,
  type ViolationCounts,
  type ViolationFilters,
  type ViolationSeverity,
  type ViolationStatus,
} from "../model/violation.model";

export interface ViolationRow {
  id: string;
  occurred_at: string;
  pillar: PillarId;
  source: EvidenceSource;
  title: string;
  description: string | null;
  severity: ViolationSeverity;
  status: ViolationStatus;
  score_impact: number | null;
  ai_confidence: number | null;
  sensor_value: number | null;
  sensor_unit: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  audit_records: { event_type: string; status: AuditStatus }[];
}

export type UpdateOutcome =
  | { kind: "updated" }
  | { kind: "not_found_or_forbidden" }
  | { kind: "invalid_transition" }
  | { kind: "error"; message: string };

const STATUS_SETS: Record<ViolationFilters["status"], ViolationStatus[] | null> = {
  open: ["active", "acknowledged"],
  active: ["active"],
  acknowledged: ["acknowledged"],
  resolved: ["resolved"],
  all: null,
};

export class ViolationRepository {
  async list(
    kitchenId: string,
    filters: ViolationFilters
  ): Promise<{ rows: ViolationRow[]; total: number }> {
    const supabase = await createClient();
    const from = (filters.page - 1) * PAGE_SIZE;

    let query = supabase
      .from("violations")
      .select(
        `id, occurred_at, pillar, source, title, description, severity, status,
         score_impact, ai_confidence, sensor_value, sensor_unit,
         acknowledged_by, acknowledged_at, resolved_at,
         audit_records ( event_type, status )`,
        { count: "exact" }
      )
      .eq("kitchen_id", kitchenId);

    const statuses = STATUS_SETS[filters.status];
    if (statuses) query = query.in("status", statuses);
    if (filters.severity) query = query.eq("severity", filters.severity);
    if (filters.source) query = query.eq("source", filters.source);
    if (filters.pillar) query = query.eq("pillar", filters.pillar);

    const { data, error, count } = await query
      .order("occurred_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      // Asking for a page past the end is not an error for the user.
      if (error.code === "PGRST103") return { rows: [], total: count ?? 0 };
      throw new Error(`Could not load violations: ${error.message}`);
    }

    return { rows: data, total: count ?? data.length };
  }

  async counts(kitchenId: string): Promise<ViolationCounts> {
    const supabase = await createClient();

    const count = async (
      statuses: ViolationStatus[],
      severities?: ViolationSeverity[]
    ) => {
      let q = supabase
        .from("violations")
        .select("id", { count: "exact", head: true })
        .eq("kitchen_id", kitchenId)
        .in("status", statuses);

      if (severities) q = q.in("severity", severities);

      const { count: n, error } = await q;
      if (error) throw new Error(`Could not count violations: ${error.message}`);
      return n ?? 0;
    };

    const [active, acknowledged, resolved, openHighSeverity] = await Promise.all([
      count(["active"]),
      count(["acknowledged"]),
      count(["resolved"]),
      count(["active", "acknowledged"], ["high", "critical"]),
    ]);

    return { active, acknowledged, resolved, openHighSeverity };
  }

  /**
   * Requests a status change as the signed-in user. Row Level Security
   * decides whether the user may change this row, and the workflow trigger
   * rejects invalid transitions and records who acted and when.
   */
  async updateStatus(id: string, status: TargetStatus): Promise<UpdateOutcome> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("violations")
      .update({ status })
      .eq("id", id)
      .select("id");

    if (error) {
      if (error.code === "23514") return { kind: "invalid_transition" };
      if (error.code === "42501") return { kind: "not_found_or_forbidden" };
      return { kind: "error", message: error.message };
    }

    return data.length === 0 ? { kind: "not_found_or_forbidden" } : { kind: "updated" };
  }
}
