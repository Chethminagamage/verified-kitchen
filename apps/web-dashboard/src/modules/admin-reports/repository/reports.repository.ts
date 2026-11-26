import { createClient } from "@/infrastructure/supabase/server";

export interface FeedbackRow {
  order_id: string;
  kitchen_id: string;
  rating: number | null;
  problem: string | null;
  comment: string | null;
  created_at: string;
}

/** Private order feedback across all kitchens (admins can read it; it is never public). */
export class ReportsRepository {
  async since(from: Date, hygieneOnly: boolean): Promise<FeedbackRow[]> {
    const supabase = await createClient();
    let query = supabase
      .from("order_feedback")
      .select("order_id, kitchen_id, rating, problem, comment, created_at")
      .gte("created_at", from.toISOString())
      .order("created_at", { ascending: false })
      .limit(300);
    query = hygieneOnly ? query.eq("problem", "hygiene_concern") : query.or("problem.not.is.null,rating.lte.2");
    const { data, error } = await query;
    if (error) throw new Error(`Could not load customer reports: ${error.message}`);
    return data;
  }

  async kitchenNames(): Promise<Map<string, string>> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("kitchens").select("id, name");
    if (error) throw new Error(`Could not load kitchens: ${error.message}`);
    return new Map(data.map((k) => [k.id, k.name]));
  }
}
