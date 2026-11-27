/*
 * The kitchen's menu and its listing in the consumer app, managed by the
 * kitchen's own operator (the self-service route, as in delivery platforms).
 * Pure rules only (unit-tested); the database enforces who may change what.
 */

// ---------------------------------------------------------------- limits (same as the database)
export const DISH_NAME_MAX = 80;
export const DISH_DESCRIPTION_MAX = 300;
export const CATEGORY_MAX = 40;
export const LISTING_DESCRIPTION_MAX = 500;
export const EMOJI_MAX = 8;
export const PRICE_MAX = 99_999;
export const DEFAULT_CATEGORY = "Menu";
export const DEFAULT_EMOJI = "🍽️";

// ---------------------------------------------------------------- photos
/** Public Storage bucket for banners and dish photos. */
export const MEDIA_BUCKET = "kitchen-media";
/** Dish photos are stored square; banners wide. Resized in the browser before upload
 *  (Supabase's on-the-fly image resizing is a paid feature). */
export const DISH_PHOTO_SIZE = { width: 800, height: 800 } as const;
export const BANNER_SIZE = { width: 1600, height: 900 } as const;
export const PHOTO_QUALITY = 0.82;
/** Largest photo accepted before resizing (phone camera photos are 3-12 MB). */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

export interface MenuDish {
  id: string;
  name: string;
  description: string | null;
  category: string;
  priceLkr: number;
  emoji: string;
  isAvailable: boolean;
  sortOrder: number;
  imagePath: string | null;
  imageUrl: string | null;
}

export interface MenuCategory {
  name: string;
  dishes: MenuDish[];
}

export interface KitchenListing {
  kitchenId: string;
  name: string;
  cuisine: string;
  description: string;
  emoji: string;
  deliveryFeeLkr: number;
  prepMinutes: number;
  opensAt: string;
  closesAt: string;
  bannerPath: string | null;
  bannerUrl: string | null;
}

export interface MenuPage {
  listing: KitchenListing;
  categories: MenuCategory[];
  dishCount: number;
  availableCount: number;
  withPhotoCount: number;
  canManage: boolean;
}

export type MenuField =
  | "name"
  | "description"
  | "category"
  | "price"
  | "emoji"
  | "cuisine"
  | "listingDescription"
  | "deliveryFee"
  | "prepMinutes"
  | "opensAt"
  | "closesAt";

export type MenuActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<MenuField, string>>;
} | null;

export interface DishInput {
  name: string;
  description: string | null;
  category: string;
  priceLkr: number;
  emoji: string;
  /** Only set when the form has the checkbox (adding a dish); editing leaves availability unchanged. */
  isAvailable?: boolean;
}

export interface ListingInput {
  cuisine: string;
  description: string | null;
  emoji: string;
  deliveryFeeLkr: number;
  prepMinutes: number;
  opensAt: string;
  closesAt: string;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; fieldErrors: Partial<Record<MenuField, string>> };

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/** Characters as people see them (an emoji with a skin tone counts once). */
function visibleLength(value: string): number {
  return [...value].length;
}

/** A price in rupees with at most two decimals, or undefined. */
export function parsePrice(raw: string, { allowZero = false } = {}): number | undefined {
  const tidy = raw.replace(/[,\s]/g, "").replace(/^(LKR|Rs\.?)/i, "");
  if (!/^\d+(\.\d{1,2})?$/.test(tidy)) return undefined;
  const n = Number(tidy);
  if (n > PRICE_MAX || (!allowZero && n <= 0)) return undefined;
  return n;
}

/** "9:30" or "09:30" -> "09:30"; undefined when not a time of day. */
export function parseTime(raw: string): string | undefined {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(raw.trim());
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : undefined;
}

/** A checkbox sends nothing when unticked, so the form adds a hidden "off" before it. */
function availability(formData: FormData): { isAvailable?: boolean } {
  const values = formData.getAll("isAvailable");
  return values.length === 0 ? {} : { isAvailable: values.includes("on") };
}

export function parseDishForm(formData: FormData): Parsed<DishInput> {
  const fieldErrors: Partial<Record<MenuField, string>> = {};
  const name = text(formData, "name");
  const description = text(formData, "description");
  const category = text(formData, "category") || DEFAULT_CATEGORY;
  const emoji = text(formData, "emoji") || DEFAULT_EMOJI;
  const price = parsePrice(text(formData, "price"));

  if (name.length === 0) fieldErrors.name = "Enter the dish name.";
  else if (name.length > DISH_NAME_MAX) fieldErrors.name = `Keep the name under ${DISH_NAME_MAX} characters.`;
  if (description.length > DISH_DESCRIPTION_MAX) {
    fieldErrors.description = `Keep the description under ${DISH_DESCRIPTION_MAX} characters.`;
  }
  if (category.length > CATEGORY_MAX) fieldErrors.category = `Keep the category under ${CATEGORY_MAX} characters.`;
  if (price === undefined) fieldErrors.price = "Enter a price in rupees, for example 950.";
  if (visibleLength(emoji) > 2 || emoji.length > EMOJI_MAX) fieldErrors.emoji = "Use a single emoji.";

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return {
    ok: true,
    value: {
      name,
      description: description || null,
      category,
      priceLkr: price!,
      emoji,
      ...availability(formData),
    },
  };
}

export function parseListingForm(formData: FormData): Parsed<ListingInput> {
  const fieldErrors: Partial<Record<MenuField, string>> = {};
  const cuisine = text(formData, "cuisine");
  const description = text(formData, "listingDescription");
  const emoji = text(formData, "emoji") || DEFAULT_EMOJI;
  const deliveryFee = parsePrice(text(formData, "deliveryFee"), { allowZero: true });
  const prep = Number(text(formData, "prepMinutes"));
  const opensAt = parseTime(text(formData, "opensAt"));
  const closesAt = parseTime(text(formData, "closesAt"));

  if (cuisine.length === 0) fieldErrors.cuisine = "Say what you serve, for example “Sri Lankan · Rice & curry”.";
  else if (cuisine.length > 60) fieldErrors.cuisine = "Keep it under 60 characters.";
  if (description.length > LISTING_DESCRIPTION_MAX) {
    fieldErrors.listingDescription = `Keep the description under ${LISTING_DESCRIPTION_MAX} characters.`;
  }
  if (visibleLength(emoji) > 2 || emoji.length > EMOJI_MAX) fieldErrors.emoji = "Use a single emoji.";
  if (deliveryFee === undefined || deliveryFee > 5000) fieldErrors.deliveryFee = "Enter a fee between 0 and 5,000 rupees.";
  if (!Number.isInteger(prep) || prep < 5 || prep > 180) fieldErrors.prepMinutes = "Enter whole minutes between 5 and 180.";
  if (!opensAt) fieldErrors.opensAt = "Use a time like 09:00.";
  if (!closesAt) fieldErrors.closesAt = "Use a time like 22:00.";
  if (opensAt && closesAt && opensAt === closesAt) fieldErrors.closesAt = "Closing time must differ from opening time.";

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return {
    ok: true,
    value: {
      cuisine,
      description: description || null,
      emoji,
      deliveryFeeLkr: deliveryFee!,
      prepMinutes: prep,
      opensAt: opensAt!,
      closesAt: closesAt!,
    },
  };
}

/** Dishes grouped by category, in the order the kitchen set (then by name). */
export function groupByCategory(dishes: readonly MenuDish[]): MenuCategory[] {
  const groups = new Map<string, MenuDish[]>();
  for (const d of [...dishes].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))) {
    const list = groups.get(d.category) ?? [];
    list.push(d);
    groups.set(d.category, list);
  }
  return [...groups].map(([name, list]) => ({ name, dishes: list }));
}

// ---------------------------------------------------------------- storage paths
/** Public URL of a file in the media bucket (the database stores only the path). */
export function mediaUrl(supabaseUrl: string, path: string | null): string | null {
  if (!path) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/${encoded}`;
}

/** Every upload gets a new name (time stamp), so a replaced photo is never served stale. */
export function dishPhotoPath(kitchenId: string, dishId: string, stamp: number): string {
  return `${kitchenId}/dishes/${dishId}-${stamp}.jpg`;
}

export function bannerPhotoPath(kitchenId: string, stamp: number): string {
  return `${kitchenId}/banner-${stamp}.jpg`;
}

/** A path the browser reports after upload must be one this kitchen and dish could have made. */
export function isDishPhotoPathFor(path: string, kitchenId: string, dishId: string): boolean {
  return new RegExp(`^${kitchenId}/dishes/${dishId}-\\d{10,16}\\.jpg$`).test(path);
}

export function isBannerPathFor(path: string, kitchenId: string): boolean {
  return new RegExp(`^${kitchenId}/banner-\\d{10,16}\\.jpg$`).test(path);
}

/**
 * The centre part of a photo to keep so it fills the target shape without
 * stretching ("cover"): returns the source rectangle to draw.
 */
export function coverCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const target = targetWidth / targetHeight;
  const source = sourceWidth / sourceHeight;
  if (source > target) {
    const sw = Math.round(sourceHeight * target);
    return { sx: Math.round((sourceWidth - sw) / 2), sy: 0, sw, sh: sourceHeight };
  }
  const sh = Math.round(sourceWidth / target);
  return { sx: 0, sy: Math.round((sourceHeight - sh) / 2), sw: sourceWidth, sh };
}

/** Why a chosen file cannot be used, or null when it is fine. */
export function photoProblem(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("image/")) return "Choose a photo (JPEG, PNG or WebP).";
  if (file.size > MAX_SOURCE_BYTES) return "That photo is larger than 20 MB. Choose a smaller one.";
  return null;
}
