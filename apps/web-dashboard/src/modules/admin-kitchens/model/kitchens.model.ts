import type { Database } from "@/shared/types/database.types";

import { field } from "@/modules/admin/model/admin.model";
import type { StaffAccount } from "@/modules/admin-accounts/model/accounts.model";

export type DeviceType = Database["public"]["Enums"]["device_type"];

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  env_node: "Environmental sensor",
  camera: "Hygiene camera",
};

/** A device counts as reporting if it was heard from in the last 15 minutes (same rule as the database). */
export const REPORTING_WINDOW_MS = 15 * 60 * 1000;

export function isReporting(lastSeenAt: string | null, now: Date): boolean {
  return lastSeenAt !== null && now.getTime() - new Date(lastSeenAt).getTime() <= REPORTING_WINDOW_MS;
}

// ---------------------------------------------------------------------
// Listing (what customers see in the app) and opening hours
// ---------------------------------------------------------------------
export interface KitchenListing {
  name: string;
  location: string;
  timezone: string;
  cuisine: string;
  description: string;
  emoji: string;
  deliveryFeeLkr: number;
  prepMinutes: number;
  /** "HH:MM", in the kitchen's time zone. Same open and close time = open all day. */
  opensAt: string;
  closesAt: string;
}

export const DEFAULT_LISTING: KitchenListing = {
  name: "",
  location: "",
  timezone: "Asia/Colombo",
  cuisine: "",
  description: "",
  emoji: "",
  deliveryFeeLkr: 250,
  prepMinutes: 30,
  opensAt: "08:00",
  closesAt: "22:00",
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value.length > 0;
  } catch {
    return false;
  }
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; fieldErrors: Record<string, string> };

/** Same rules as public.admin_check_listing(), so mistakes are caught before the database. */
export function parseListingForm(formData: FormData): Parsed<KitchenListing> {
  const listing: KitchenListing = {
    name: field(formData, "name"),
    location: field(formData, "location"),
    timezone: field(formData, "timezone"),
    cuisine: field(formData, "cuisine"),
    description: field(formData, "description"),
    emoji: field(formData, "emoji"),
    deliveryFeeLkr: Number(field(formData, "delivery_fee_lkr")),
    prepMinutes: Number(field(formData, "prep_minutes")),
    opensAt: field(formData, "opens_at").slice(0, 5),
    closesAt: field(formData, "closes_at").slice(0, 5),
  };
  const errors: Record<string, string> = {};

  if (listing.name.length < 2 || listing.name.length > 80) errors.name = "2 to 80 characters.";
  if (listing.location.length > 120) errors.location = "120 characters at most.";
  if (!isTimeZone(listing.timezone)) errors.timezone = "Choose a time zone.";
  if (listing.cuisine.length > 60) errors.cuisine = "60 characters at most.";
  if (listing.description.length > 500) errors.description = "500 characters at most.";
  if ([...listing.emoji].length > 8) errors.emoji = "A single emoji.";
  if (
    !Number.isFinite(listing.deliveryFeeLkr) ||
    listing.deliveryFeeLkr < 0 ||
    listing.deliveryFeeLkr > 5000 ||
    Math.round(listing.deliveryFeeLkr * 100) !== listing.deliveryFeeLkr * 100
  ) {
    errors.delivery_fee_lkr = "Between 0 and 5000 LKR.";
  }
  if (!Number.isInteger(listing.prepMinutes) || listing.prepMinutes < 5 || listing.prepMinutes > 180) {
    errors.prep_minutes = "Whole minutes, 5 to 180.";
  }
  if (!TIME.test(listing.opensAt)) errors.opens_at = "Enter a time.";
  if (!TIME.test(listing.closesAt)) errors.closes_at = "Enter a time.";

  return Object.keys(errors).length > 0 ? { ok: false, fieldErrors: errors } : { ok: true, value: listing };
}

/** "08:00–22:00", "Open 24 hours" or "18:00–02:00 (overnight)". */
export function formatHours(opensAt: string, closesAt: string): string {
  const o = opensAt.slice(0, 5);
  const c = closesAt.slice(0, 5);
  if (o === c) return "Open 24 hours";
  return c < o ? `${o}–${c} (overnight)` : `${o}–${c}`;
}

// ---------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------
export interface KitchenSummary {
  id: string;
  code: string;
  name: string;
  location: string | null;
  emoji: string | null;
  isPublic: boolean;
  createdAt: string;
  rating: { status: string; grade: string | null } | null;
  devicesTotal: number;
  devicesReporting: number;
  operators: number;
}

export interface ReadinessItem {
  item: string;
  label: string;
  ok: boolean;
  blocking: boolean;
  detail: string;
}

export interface KitchenDevice {
  id: string;
  type: DeviceType;
  name: string;
  lastSeenAt: string | null;
  reporting: boolean;
}

export interface ActivityEntry {
  id: number;
  action: string;
  actorEmail: string | null;
  targetType: string;
  targetId: string;
  targetLabel: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface KitchenDetail {
  id: string;
  code: string;
  isPublic: boolean;
  publishedAt: string | null;
  createdAt: string;
  listing: KitchenListing;
  rating: { status: string; grade: string | null } | null;
  readiness: ReadinessItem[];
  devices: KitchenDevice[];
  staff: StaffAccount[];
  /** Operators and inspectors not yet linked to this kitchen. */
  otherStaff: StaffAccount[];
  activity: ActivityEntry[];
  generatedAt: string;
}

export function readyToPublish(readiness: ReadinessItem[]): boolean {
  return readiness.length > 0 && readiness.every((r) => r.ok || !r.blocking);
}
