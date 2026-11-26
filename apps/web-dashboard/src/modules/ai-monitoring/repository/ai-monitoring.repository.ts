import { createClient } from "@/infrastructure/supabase/server";
import type { Json } from "@/shared/types/database.types";

import type { DetectionRow } from "../model/ai-monitoring.model";

export interface CameraRow {
  id: string;
  name: string;
  last_seen_at: string | null;
  last_status: Json | null;
}

export interface PillarScoreRow {
  personal_score: number | null;
  food_prep_score: number | null;
  computed_at: string;
}

function fail(what: string, message: string): never {
  throw new Error(`Could not load ${what}: ${message}`);
}

/** Reads AI evidence with the signed-in user's session: Row Level Security limits it to their kitchens. */
export class AIMonitoringRepository {
  async camera(kitchenId: string): Promise<CameraRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("devices")
      .select("id, name, last_seen_at, last_status")
      .eq("kitchen_id", kitchenId)
      .eq("type", "camera")
      .order("id")
      .limit(1)
      .maybeSingle();
    if (error) fail("camera", error.message);
    return data;
  }

  /** Newest first, one pillar at a time. One hour of 5-s windows is at most 720 per indicator. */
  async detections(kitchenId: string, pillar: "personal" | "food_prep", since: Date): Promise<DetectionRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_detections")
      .select("detected_at, indicator, compliant, confidence, inference_ms, model_version, metadata")
      .eq("kitchen_id", kitchenId)
      .eq("pillar", pillar)
      .gte("detected_at", since.toISOString())
      .order("detected_at", { ascending: false })
      .limit(2500);
    if (error) fail("AI detections", error.message);
    return data;
  }

  async latestPillarScores(kitchenId: string): Promise<PillarScoreRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("hygiene_scores")
      .select("personal_score, food_prep_score, computed_at")
      .eq("kitchen_id", kitchenId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) fail("hygiene score", error.message);
    return data;
  }
}
