import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/shared/types/database.types";

import { RECORDS_SHOWN, type AuditStatus } from "../model/audit.model";

export interface AuditRow {
  id: number;
  chain_seq: number;
  created_at: string;
  event_type: string;
  event_payload: Json;
  violation_id: string | null;
  event_hash: string;
  prev_hash: string;
  status: AuditStatus;
  fabric_tx_id: string | null;
  fabric_block: number | null;
}

function fail(what: string, message: string): never {
  throw new Error(`Could not load ${what}: ${message}`);
}

export class AuditRepository {
  async latest(kitchenId: string): Promise<AuditRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("audit_records")
      .select(
        "id, chain_seq, created_at, event_type, event_payload, violation_id, event_hash, prev_hash, status, fabric_tx_id, fabric_block"
      )
      .eq("kitchen_id", kitchenId)
      .order("chain_seq", { ascending: false })
      .limit(RECORDS_SHOWN);
    if (error) fail("audit records", error.message);
    return data;
  }

  async counts(kitchenId: string): Promise<Record<AuditStatus, number>> {
    const supabase = await createClient();
    const statuses: AuditStatus[] = ["verified", "pending", "failed"];
    const results = await Promise.all(
      statuses.map((status) =>
        supabase
          .from("audit_records")
          .select("id", { count: "exact", head: true })
          .eq("kitchen_id", kitchenId)
          .eq("status", status)
      )
    );
    const out = { verified: 0, pending: 0, failed: 0 };
    results.forEach((r, i) => {
      if (r.error) fail("audit counts", r.error.message);
      out[statuses[i]] = r.count ?? 0;
    });
    return out;
  }

  /** Recomputes every hash in the database (verify_audit_chain) and reports each link. */
  async verifyChain(kitchenId: string): Promise<{ chain_seq: number; ok: boolean; reason: string | null }[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("verify_audit_chain", { p_kitchen: kitchenId });
    if (error) fail("chain verification", error.message);
    return data;
  }
}
