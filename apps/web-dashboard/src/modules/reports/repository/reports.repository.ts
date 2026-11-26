import { createClient } from "@/infrastructure/supabase/server";
import { METRICS, combineStats } from "@/modules/environment/model/environment.model";

import { COMPLIANT_SCORE, type EnvironmentalSummary, type SeriesBucket } from "../model/reports.model";

export interface ScoreBucketRow extends SeriesBucket {
  bucket: string;
}

function fail(what: string, message: string): never {
  throw new Error(`Could not load ${what}: ${message}`);
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export class ReportsRepository {
  async scoreSeries(kitchenId: string, from: Date, to: Date, bucket: string): Promise<ScoreBucketRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("hygiene_score_series", {
      p_kitchen: kitchenId,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_bucket: bucket,
    });
    if (error) fail("score history", error.message);
    return data.map((r) => ({
      bucket: r.bucket,
      samples: Number(r.samples),
      overall: num(r.overall_score),
      personal: num(r.personal_score),
      foodPrep: num(r.food_prep_score),
      environmental: num(r.environmental_score),
    }));
  }

  /** Stored scores in the period, and how many were compliant (>= COMPLIANT_SCORE). */
  async complianceCounts(kitchenId: string, from: Date, to: Date): Promise<{ total: number; compliant: number }> {
    const supabase = await createClient();
    const base = () =>
      supabase
        .from("hygiene_scores")
        .select("id", { count: "exact", head: true })
        .eq("kitchen_id", kitchenId)
        .gte("computed_at", from.toISOString())
        .lt("computed_at", to.toISOString());

    const [all, good] = await Promise.all([base(), base().gte("overall_score", COMPLIANT_SCORE)]);
    if (all.error) fail("scores", all.error.message);
    if (good.error) fail("scores", good.error.message);
    return { total: all.count ?? 0, compliant: good.count ?? 0 };
  }

  async violationsByPillar(kitchenId: string, from: Date, to: Date): Promise<Record<string, number>> {
    const supabase = await createClient();
    const pillars = ["personal", "food_prep", "environmental"] as const;
    const results = await Promise.all(
      pillars.map((pillar) =>
        supabase
          .from("violations")
          .select("id", { count: "exact", head: true })
          .eq("kitchen_id", kitchenId)
          .eq("pillar", pillar)
          .gte("occurred_at", from.toISOString())
          .lt("occurred_at", to.toISOString())
      )
    );
    const out: Record<string, number> = {};
    results.forEach((r, i) => {
      if (r.error) fail("violations", r.error.message);
      out[pillars[i]] = r.count ?? 0;
    });
    return out;
  }

  async auditCounts(kitchenId: string): Promise<{ verified: number; pending: number }> {
    const supabase = await createClient();
    const count = (status: "verified" | "pending") =>
      supabase
        .from("audit_records")
        .select("id", { count: "exact", head: true })
        .eq("kitchen_id", kitchenId)
        .eq("status", status);
    const [verified, pending] = await Promise.all([count("verified"), count("pending")]);
    if (verified.error) fail("audit records", verified.error.message);
    if (pending.error) fail("audit records", pending.error.message);
    return { verified: verified.count ?? 0, pending: pending.count ?? 0 };
  }

  /** Average / min / max of the real ESP32 readings over a period. */
  async environmentalSummary(kitchenId: string, from: Date, to: Date): Promise<EnvironmentalSummary[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("sensor_reading_series", {
      p_kitchen: kitchenId,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_bucket: "1 hour",
    });
    if (error) fail("environmental summary", error.message);

    const key = { ambient_temp_c: "ambient", humidity_pct: "humidity", fridge_temp_c: "fridge" } as const;
    const samples = data.reduce((n, b) => n + Number(b.samples), 0);

    return METRICS.map((m) => {
      const k = key[m.id];
      const stats = combineStats(
        data.map((b) => ({
          min: num(b[`${k}_min`]),
          avg: num(b[`${k}_avg`]),
          max: num(b[`${k}_max`]),
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
        samples,
      };
    });
  }
}
