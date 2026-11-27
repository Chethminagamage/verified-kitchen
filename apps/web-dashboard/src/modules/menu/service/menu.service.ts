import { SUPABASE_URL } from "@/config/env";
import type { OperatorSession } from "@/modules/auth/model/session.model";

import {
  DEFAULT_CATEGORY,
  DEFAULT_EMOJI,
  groupByCategory,
  isBannerPathFor,
  isDishPhotoPathFor,
  mediaUrl,
  parseDishForm,
  parseListingForm,
  type MenuActionState,
  type MenuDish,
  type MenuPage,
} from "../model/menu.model";
import { MenuRepository, type DishRow, type WriteOutcome } from "../repository/menu.repository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The kitchen's operators and admins manage the menu; inspectors only look. */
export function canManageMenu(session: OperatorSession): boolean {
  return session.role === "operator" || session.role === "admin";
}

function toDish(r: DishRow, supabaseUrl: string): MenuDish {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category || DEFAULT_CATEGORY,
    priceLkr: Number(r.price_lkr),
    emoji: r.emoji || DEFAULT_EMOJI,
    isAvailable: r.is_available,
    sortOrder: r.sort_order,
    imagePath: r.image_path,
    imageUrl: mediaUrl(supabaseUrl, r.image_path),
  };
}

function hhmm(time: string): string {
  return time.slice(0, 5);
}

const NOT_ALLOWED: MenuActionState = { ok: false, message: "You do not have permission to change this menu." };

function idOf(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

function result(outcome: WriteOutcome, success: string): MenuActionState {
  return outcome.kind === "saved" ? { ok: true, message: success } : { ok: false, message: outcome.message };
}

export class MenuService {
  constructor(
    private readonly repository = new MenuRepository(),
    private readonly supabaseUrl = SUPABASE_URL,
  ) {}

  async getPage(session: OperatorSession, kitchenId: string): Promise<MenuPage> {
    const [rows, listing] = await Promise.all([this.repository.dishes(kitchenId), this.repository.listing(kitchenId)]);
    if (!listing) throw new Error("Could not load the kitchen listing.");
    const dishes = rows.map((r) => toDish(r, this.supabaseUrl));
    return {
      listing: {
        kitchenId,
        name: listing.name,
        cuisine: listing.cuisine ?? "",
        description: listing.description ?? "",
        emoji: listing.emoji || DEFAULT_EMOJI,
        deliveryFeeLkr: Number(listing.delivery_fee_lkr),
        prepMinutes: listing.prep_minutes,
        opensAt: hhmm(listing.opens_at),
        closesAt: hhmm(listing.closes_at),
        bannerPath: listing.banner_path,
        bannerUrl: mediaUrl(this.supabaseUrl, listing.banner_path),
      },
      categories: groupByCategory(dishes),
      dishCount: dishes.length,
      availableCount: dishes.filter((d) => d.isAvailable).length,
      withPhotoCount: dishes.filter((d) => d.imagePath).length,
      canManage: canManageMenu(session),
    };
  }

  private kitchenFor(session: OperatorSession | null): string | null {
    return session?.kitchen && canManageMenu(session) && !session.disabled ? session.kitchen.id : null;
  }

  /** Adds a dish (no id field) or saves changes to one (id field). */
  async saveDish(session: OperatorSession | null, formData: FormData): Promise<MenuActionState> {
    const kitchenId = this.kitchenFor(session);
    if (!kitchenId) return NOT_ALLOWED;
    const parsed = parseDishForm(formData);
    if (!parsed.ok) return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };

    const rawId = formData.get("id");
    if (rawId === null || rawId === "") {
      const outcome = await this.repository.createDish(kitchenId, parsed.value, await this.repository.nextSortOrder(kitchenId));
      return result(outcome, `${parsed.value.name} was added to your menu.`);
    }
    const id = idOf(rawId);
    if (!id) return { ok: false, message: "That dish could not be found." };
    return result(await this.repository.updateDish(kitchenId, id, parsed.value), "Changes saved.");
  }

  async setAvailability(session: OperatorSession | null, rawId: FormDataEntryValue | null, available: boolean): Promise<MenuActionState> {
    const kitchenId = this.kitchenFor(session);
    const id = idOf(rawId);
    if (!kitchenId) return NOT_ALLOWED;
    if (!id) return { ok: false, message: "That dish could not be found." };
    const outcome = await this.repository.updateDish(kitchenId, id, { isAvailable: available });
    return result(outcome, available ? "Back on the menu." : "Marked as sold out.");
  }

  async deleteDish(session: OperatorSession | null, rawId: FormDataEntryValue | null): Promise<MenuActionState> {
    const kitchenId = this.kitchenFor(session);
    const id = idOf(rawId);
    if (!kitchenId) return NOT_ALLOWED;
    if (!id) return { ok: false, message: "That dish could not be found." };
    const dish = await this.repository.dish(kitchenId, id);
    if (!dish) return { ok: false, message: "That dish is no longer on your menu." };
    const outcome = await this.repository.deleteDish(kitchenId, id);
    if (outcome.kind === "saved" && dish.image_path) await this.repository.removeFiles([dish.image_path]);
    return result(outcome, `${dish.name} was removed from your menu.`);
  }

  /**
   * Saves the photo the browser has just uploaded (or removes it when path is
   * empty). The path must be one this kitchen and dish could have created; the
   * replaced file is then deleted.
   */
  async setDishPhoto(session: OperatorSession | null, rawId: FormDataEntryValue | null, rawPath: FormDataEntryValue | null): Promise<MenuActionState> {
    const kitchenId = this.kitchenFor(session);
    const id = idOf(rawId);
    if (!kitchenId) return NOT_ALLOWED;
    if (!id) return { ok: false, message: "That dish could not be found." };
    const path = typeof rawPath === "string" && rawPath !== "" ? rawPath : null;
    if (path !== null && !isDishPhotoPathFor(path, kitchenId, id)) return { ok: false, message: "That photo could not be saved." };

    const dish = await this.repository.dish(kitchenId, id);
    if (!dish) return { ok: false, message: "That dish is no longer on your menu." };
    const outcome = await this.repository.updateDish(kitchenId, id, { imagePath: path });
    if (outcome.kind === "saved" && dish.image_path && dish.image_path !== path) {
      await this.repository.removeFiles([dish.image_path]);
    }
    return result(outcome, path ? "Photo saved." : "Photo removed.");
  }

  async saveListing(session: OperatorSession | null, formData: FormData): Promise<MenuActionState> {
    const kitchenId = this.kitchenFor(session);
    if (!kitchenId) return NOT_ALLOWED;
    const parsed = parseListingForm(formData);
    if (!parsed.ok) return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    return result(await this.repository.updateListing(kitchenId, parsed.value), "Listing saved. Customers see it in the app.");
  }

  async setBanner(session: OperatorSession | null, rawPath: FormDataEntryValue | null): Promise<MenuActionState> {
    const kitchenId = this.kitchenFor(session);
    if (!kitchenId) return NOT_ALLOWED;
    const path = typeof rawPath === "string" && rawPath !== "" ? rawPath : null;
    if (path !== null && !isBannerPathFor(path, kitchenId)) return { ok: false, message: "That banner could not be saved." };

    const listing = await this.repository.listing(kitchenId);
    const outcome = await this.repository.updateListing(kitchenId, { bannerPath: path });
    if (outcome.kind === "saved" && listing?.banner_path && listing.banner_path !== path) {
      await this.repository.removeFiles([listing.banner_path]);
    }
    return result(outcome, path ? "Banner saved." : "Banner removed.");
  }
}
