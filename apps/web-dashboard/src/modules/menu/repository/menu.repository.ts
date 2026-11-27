import { createClient } from "@/infrastructure/supabase/server";

import { MEDIA_BUCKET, type DishInput, type ListingInput } from "../model/menu.model";

export interface DishRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price_lkr: number;
  emoji: string | null;
  is_available: boolean;
  sort_order: number;
  image_path: string | null;
}

export interface ListingRow {
  id: string;
  name: string;
  cuisine: string | null;
  description: string | null;
  emoji: string | null;
  delivery_fee_lkr: number;
  prep_minutes: number;
  opens_at: string;
  closes_at: string;
  banner_path: string | null;
}

export type WriteOutcome = { kind: "saved" } | { kind: "refused"; message: string };

function fail(what: string, message: string): never {
  throw new Error(`Could not load ${what}: ${message}`);
}

/** A database refusal as a sentence for the operator (never raw SQL). */
function refusal(error: { code?: string; message: string }): WriteOutcome {
  if (error.code === "23505") return { kind: "refused", message: "A dish with this name is already on your menu." };
  if (error.code === "42501") return { kind: "refused", message: "You do not have permission to change this menu." };
  return { kind: "refused", message: "That change could not be saved. Please try again." };
}

const DISH_COLUMNS = "id, name, description, category, price_lkr, emoji, is_available, sort_order, image_path";

/**
 * The kitchen's menu and listing. Runs as the signed-in user, so Row Level
 * Security and the Storage policies decide what they may read and change.
 */
export class MenuRepository {
  async dishes(kitchenId: string): Promise<DishRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("menu_items")
      .select(DISH_COLUMNS)
      .eq("kitchen_id", kitchenId)
      .order("sort_order")
      .order("name");
    if (error) fail("the menu", error.message);
    return data as DishRow[];
  }

  async dish(kitchenId: string, id: string): Promise<DishRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("menu_items")
      .select(DISH_COLUMNS)
      .eq("kitchen_id", kitchenId)
      .eq("id", id)
      .maybeSingle();
    if (error) fail("the dish", error.message);
    return data as DishRow | null;
  }

  async listing(kitchenId: string): Promise<ListingRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("kitchens")
      .select("id, name, cuisine, description, emoji, delivery_fee_lkr, prep_minutes, opens_at, closes_at, banner_path")
      .eq("id", kitchenId)
      .maybeSingle();
    if (error) fail("the kitchen listing", error.message);
    return data as ListingRow | null;
  }

  async nextSortOrder(kitchenId: string): Promise<number> {
    const supabase = await createClient();
    const { data } = await supabase
      .from("menu_items")
      .select("sort_order")
      .eq("kitchen_id", kitchenId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.sort_order ?? 0) + 1;
  }

  async createDish(kitchenId: string, input: DishInput, sortOrder: number): Promise<WriteOutcome> {
    const supabase = await createClient();
    const { error } = await supabase.from("menu_items").insert({
      kitchen_id: kitchenId,
      name: input.name,
      description: input.description,
      category: input.category,
      price_lkr: input.priceLkr,
      emoji: input.emoji,
      is_available: input.isAvailable ?? true,
      sort_order: sortOrder,
    });
    return error ? refusal(error) : { kind: "saved" };
  }

  async updateDish(kitchenId: string, id: string, values: Partial<DishInput> & { imagePath?: string | null }): Promise<WriteOutcome> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("menu_items")
      .update({
        ...(values.name !== undefined && { name: values.name }),
        ...(values.description !== undefined && { description: values.description }),
        ...(values.category !== undefined && { category: values.category }),
        ...(values.priceLkr !== undefined && { price_lkr: values.priceLkr }),
        ...(values.emoji !== undefined && { emoji: values.emoji }),
        ...(values.isAvailable !== undefined && { is_available: values.isAvailable }),
        ...(values.imagePath !== undefined && { image_path: values.imagePath }),
      })
      .eq("kitchen_id", kitchenId)
      .eq("id", id)
      .select("id");
    if (error) return refusal(error);
    return data.length === 1 ? { kind: "saved" } : { kind: "refused", message: "That dish is no longer on your menu." };
  }

  async deleteDish(kitchenId: string, id: string): Promise<WriteOutcome> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("menu_items").delete().eq("kitchen_id", kitchenId).eq("id", id).select("id");
    if (error) return refusal(error);
    return data.length === 1 ? { kind: "saved" } : { kind: "refused", message: "That dish is no longer on your menu." };
  }

  async updateListing(kitchenId: string, values: Partial<ListingInput> & { bannerPath?: string | null }): Promise<WriteOutcome> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("kitchens")
      .update({
        ...(values.cuisine !== undefined && { cuisine: values.cuisine }),
        ...(values.description !== undefined && { description: values.description }),
        ...(values.emoji !== undefined && { emoji: values.emoji }),
        ...(values.deliveryFeeLkr !== undefined && { delivery_fee_lkr: values.deliveryFeeLkr }),
        ...(values.prepMinutes !== undefined && { prep_minutes: values.prepMinutes }),
        ...(values.opensAt !== undefined && { opens_at: values.opensAt }),
        ...(values.closesAt !== undefined && { closes_at: values.closesAt }),
        ...(values.bannerPath !== undefined && { banner_path: values.bannerPath }),
      })
      .eq("id", kitchenId)
      .select("id");
    if (error) return refusal(error);
    return data.length === 1 ? { kind: "saved" } : { kind: "refused", message: "You do not have permission to change this listing." };
  }

  /** Removes replaced photos. Best effort: a leftover file is harmless, a failed save is not. */
  async removeFiles(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const supabase = await createClient();
    await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  }
}
