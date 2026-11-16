import type { ActionState } from "@/modules/admin/model/admin.model";
import { AccountsService } from "@/modules/admin-accounts/service/accounts.service";

import {
  isReporting,
  type ActivityEntry,
  type DeviceType,
  type KitchenDetail,
  type KitchenListing,
  type KitchenSummary,
} from "../model/kitchens.model";
import { KitchensRepository, type AuditRow, type KitchenRow } from "../repository/kitchens.repository";

export function toActivity(row: AuditRow): ActivityEntry {
  const details = row.details && typeof row.details === "object" && !Array.isArray(row.details) ? row.details : {};
  return {
    id: row.id,
    action: row.action,
    actorEmail: row.actor_email,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_label,
    details: details as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

export function toListing(row: KitchenRow): KitchenListing {
  return {
    name: row.name,
    location: row.location ?? "",
    timezone: row.timezone,
    cuisine: row.cuisine ?? "",
    description: row.description ?? "",
    emoji: row.emoji ?? "",
    deliveryFeeLkr: Number(row.delivery_fee_lkr),
    prepMinutes: row.prep_minutes,
    opensAt: row.opens_at.slice(0, 5),
    closesAt: row.closes_at.slice(0, 5),
  };
}

export class KitchensService {
  constructor(
    private readonly repository = new KitchensRepository(),
    private readonly accounts = new AccountsService()
  ) {}

  async list(now = new Date()): Promise<KitchenSummary[]> {
    const [kitchens, devices, ratings, memberships] = await Promise.all([
      this.repository.kitchens(),
      this.repository.devices(),
      this.repository.ratings(),
      this.repository.memberships(),
    ]);
    return kitchens.map((k) => {
      const own = devices.filter((d) => d.kitchen_id === k.id);
      const rating = ratings.find((r) => r.kitchen_id === k.id);
      return {
        id: k.id,
        code: k.code,
        name: k.name,
        location: k.location,
        emoji: k.emoji,
        isPublic: k.is_public,
        createdAt: k.created_at,
        rating: rating ? { status: rating.status, grade: rating.grade } : null,
        devicesTotal: own.length,
        devicesReporting: own.filter((d) => isReporting(d.last_seen_at, now)).length,
        operators: memberships.filter(
          (m) => m.kitchen_id === k.id && m.profiles?.role === "operator" && !m.profiles.disabled_at
        ).length,
      };
    });
  }

  async detail(id: string, now = new Date()): Promise<KitchenDetail | null> {
    const kitchen = await this.repository.kitchen(id);
    if (!kitchen) return null;
    const [readiness, devices, rating, staff, activity] = await Promise.all([
      this.repository.readiness(id),
      this.repository.devices(id),
      this.repository.rating(id),
      this.accounts.list(),
      this.repository.activity(id, kitchen.code),
    ]);
    const linked = (s: (typeof staff)[number]) => s.kitchens.some((k) => k.id === id);
    return {
      id: kitchen.id,
      code: kitchen.code,
      isPublic: kitchen.is_public,
      publishedAt: kitchen.published_at,
      createdAt: kitchen.created_at,
      listing: toListing(kitchen),
      rating: rating ? { status: rating.status, grade: rating.grade } : null,
      readiness,
      devices: devices.map((d) => ({
        id: d.id,
        type: d.type,
        name: d.name,
        lastSeenAt: d.last_seen_at,
        reporting: isReporting(d.last_seen_at, now),
      })),
      staff: staff.filter((s) => s.role !== "admin" && linked(s)),
      otherStaff: staff.filter((s) => s.role !== "admin" && s.status !== "disabled" && !linked(s)),
      activity: activity.map(toActivity),
      generatedAt: now.toISOString(),
    };
  }

  /** Every kitchen for pickers (invite form). */
  async options(): Promise<{ id: string; name: string; code: string }[]> {
    return (await this.repository.kitchens()).map((k) => ({ id: k.id, name: k.name, code: k.code }));
  }

  async create(listing: KitchenListing) {
    return this.repository.create(listing);
  }

  async update(id: string, listing: KitchenListing): Promise<ActionState> {
    const r = await this.repository.update(id, listing);
    return r.ok ? { ok: true, message: "Listing saved." } : { ok: false, message: r.message };
  }

  async setPublished(id: string, published: boolean): Promise<ActionState> {
    const r = await this.repository.setPublished(id, published);
    if (!r.ok) return { ok: false, message: r.message };
    return {
      ok: true,
      message: published
        ? "The kitchen is live: customers can now find it in the app."
        : "The kitchen is hidden from the app. Orders already placed continue.",
    };
  }

  async registerDevice(kitchenId: string, type: DeviceType, name: string): Promise<ActionState> {
    const r = await this.repository.registerDevice(kitchenId, type, name);
    return r.ok ? { ok: true, message: `Registered as ${r.value}.` } : { ok: false, message: r.message };
  }

  async renameDevice(id: string, name: string): Promise<ActionState> {
    const r = await this.repository.renameDevice(id, name);
    return r.ok ? { ok: true, message: "Device renamed." } : { ok: false, message: r.message };
  }

  async removeDevice(id: string): Promise<ActionState> {
    const r = await this.repository.removeDevice(id);
    return r.ok ? { ok: true, message: `${id} removed.` } : { ok: false, message: r.message };
  }

  async linkStaff(userId: string, kitchenId: string): Promise<ActionState> {
    const r = await this.repository.linkStaff(userId, kitchenId);
    return r.ok ? { ok: true, message: "Access given." } : { ok: false, message: r.message };
  }

  async unlinkStaff(userId: string, kitchenId: string): Promise<ActionState> {
    const r = await this.repository.unlinkStaff(userId, kitchenId);
    return r.ok ? { ok: true, message: "Access removed." } : { ok: false, message: r.message };
  }
}
