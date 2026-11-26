import { createClient } from "@/infrastructure/supabase/server";

import { refused, type WriteResult } from "@/modules/admin/model/admin.model";

import type { DeviceType, KitchenListing, ReadinessItem } from "../model/kitchens.model";

export interface KitchenRow {
  id: string;
  code: string;
  name: string;
  location: string | null;
  timezone: string;
  cuisine: string | null;
  description: string | null;
  emoji: string | null;
  delivery_fee_lkr: number;
  prep_minutes: number;
  opens_at: string;
  closes_at: string;
  is_public: boolean;
  published_at: string | null;
  created_at: string;
}

export interface DeviceRow {
  id: string;
  kitchen_id: string;
  type: DeviceType;
  name: string;
  last_seen_at: string | null;
}

export interface RatingRow {
  kitchen_id: string;
  status: string;
  grade: string | null;
}

export interface MembershipRow {
  kitchen_id: string;
  profiles: { role: string; disabled_at: string | null } | null;
}

export interface AuditRow {
  id: number;
  action: string;
  actor_email: string | null;
  target_type: string;
  target_id: string;
  target_label: string | null;
  details: unknown;
  created_at: string;
}

const KITCHEN_COLUMNS =
  "id, code, name, location, timezone, cuisine, description, emoji, delivery_fee_lkr, prep_minutes, " +
  "opens_at, closes_at, is_public, published_at, created_at";

function fail(what: string, message: string): never {
  throw new Error(`Could not load ${what}: ${message}`);
}

function listingArgs(l: KitchenListing) {
  return {
    p_name: l.name,
    p_location: l.location || null,
    p_timezone: l.timezone,
    p_cuisine: l.cuisine || null,
    p_description: l.description || null,
    p_emoji: l.emoji || null,
    p_delivery_fee_lkr: l.deliveryFeeLkr,
    p_prep_minutes: l.prepMinutes,
    p_opens_at: l.opensAt,
    p_closes_at: l.closesAt,
  };
}

/**
 * Kitchens, devices and access as seen by an administrator. Reads use the
 * admin's session (Row Level Security lets admins see every kitchen);
 * writes go only through the database's admin functions.
 */
export class KitchensRepository {
  async kitchens(): Promise<KitchenRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("kitchens").select(KITCHEN_COLUMNS).order("created_at");
    if (error) fail("kitchens", error.message);
    return data as unknown as KitchenRow[];
  }

  async kitchen(id: string): Promise<KitchenRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("kitchens").select(KITCHEN_COLUMNS).eq("id", id).maybeSingle();
    if (error) fail("kitchen", error.message);
    return data as unknown as KitchenRow | null;
  }

  async devices(kitchenId?: string): Promise<DeviceRow[]> {
    const supabase = await createClient();
    let query = supabase.from("devices").select("id, kitchen_id, type, name, last_seen_at").order("id");
    if (kitchenId) query = query.eq("kitchen_id", kitchenId);
    const { data, error } = await query;
    if (error) fail("devices", error.message);
    return data;
  }

  async ratings(): Promise<RatingRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("public_ratings").select("kitchen_id, status, grade");
    if (error) fail("ratings", error.message);
    return data;
  }

  async rating(kitchenId: string): Promise<RatingRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("public_ratings")
      .select("kitchen_id, status, grade")
      .eq("kitchen_id", kitchenId)
      .maybeSingle();
    if (error) fail("rating", error.message);
    return data;
  }

  async memberships(): Promise<MembershipRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("user_kitchens").select("kitchen_id, profiles(role, disabled_at)");
    if (error) fail("kitchen access", error.message);
    return data as unknown as MembershipRow[];
  }

  async readiness(kitchenId: string): Promise<ReadinessItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("kitchen_readiness", { p_kitchen: kitchenId });
    if (error) fail("go-live checklist", error.message);
    return data;
  }

  /** Admin log entries about this kitchen, its devices and its staff access. */
  async activity(kitchenId: string, kitchenCode: string, limit = 15): Promise<AuditRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("id, action, actor_email, target_type, target_id, target_label, details, created_at")
      .or(`and(target_type.eq.kitchen,target_id.eq.${kitchenId}),details->>kitchen.eq.${kitchenCode}`)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) fail("activity", error.message);
    return data;
  }

  // -- writes (database admin functions) -------------------------------------

  async create(listing: KitchenListing): Promise<WriteResult<string>> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_create_kitchen", listingArgs(listing));
    return error ? refused(error, "create kitchen") : { ok: true, value: data };
  }

  async update(id: string, listing: KitchenListing): Promise<WriteResult> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_update_kitchen", { p_kitchen: id, ...listingArgs(listing) });
    return error ? refused(error, "update kitchen") : { ok: true, value: undefined };
  }

  async setPublished(id: string, published: boolean): Promise<WriteResult> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_set_kitchen_published", { p_kitchen: id, p_published: published });
    return error ? refused(error, "publish kitchen") : { ok: true, value: undefined };
  }

  async registerDevice(kitchenId: string, type: DeviceType, name: string): Promise<WriteResult<string>> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_register_device", { p_kitchen: kitchenId, p_type: type, p_name: name });
    return error ? refused(error, "register device") : { ok: true, value: data };
  }

  async renameDevice(id: string, name: string): Promise<WriteResult> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_rename_device", { p_device: id, p_name: name });
    return error ? refused(error, "rename device") : { ok: true, value: undefined };
  }

  async removeDevice(id: string): Promise<WriteResult> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_remove_device", { p_device: id });
    return error ? refused(error, "remove device") : { ok: true, value: undefined };
  }

  async linkStaff(userId: string, kitchenId: string): Promise<WriteResult> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_link_staff", { p_user: userId, p_kitchen: kitchenId });
    return error ? refused(error, "give kitchen access") : { ok: true, value: undefined };
  }

  async unlinkStaff(userId: string, kitchenId: string): Promise<WriteResult> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_unlink_staff", { p_user: userId, p_kitchen: kitchenId });
    return error ? refused(error, "remove kitchen access") : { ok: true, value: undefined };
  }
}
