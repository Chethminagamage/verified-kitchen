import { describe, expect, it, vi } from "vitest";

vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));

import type { OperatorSession } from "@/modules/auth/model/session.model";
import {
  bannerPhotoPath,
  coverCrop,
  dishPhotoPath,
  groupByCategory,
  isBannerPathFor,
  isDishPhotoPathFor,
  mediaUrl,
  parseDishForm,
  parseListingForm,
  parsePrice,
  parseTime,
  photoProblem,
  type MenuDish,
} from "@/modules/menu/model/menu.model";
import type { DishRow, ListingRow, MenuRepository, WriteOutcome } from "@/modules/menu/repository/menu.repository";
import { MenuService } from "@/modules/menu/service/menu.service";

const K1 = "11111111-1111-4111-8111-111111111111";
const K2 = "22222222-2222-4222-8222-222222222222";
const D1 = "33333333-3333-4333-8333-333333333333";

function form(fields: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const value of [v].flat()) f.append(k, value);
  return f;
}

function session(role: OperatorSession["role"] = "operator", kitchenId = K1): OperatorSession {
  return {
    userId: "u1",
    email: "op@example.com",
    fullName: "Op",
    role,
    disabled: false,
    signedInAt: 0,
    kitchen: { id: kitchenId, code: "kitchen-001", name: "Rivora Heights", location: null, timezone: "Asia/Colombo" },
    kitchens: [],
  };
}

describe("dish form", () => {
  it("accepts a dish and tidies it", () => {
    const parsed = parseDishForm(form({ name: "  Egg   kottu ", price: "LKR 1,150", category: "", emoji: "", description: "" }));
    expect(parsed).toEqual({
      ok: true,
      value: { name: "Egg kottu", priceLkr: 1150, category: "Menu", emoji: "🍽️", description: null },
    });
  });

  it("explains each problem next to its field", () => {
    const parsed = parseDishForm(form({ name: "", price: "free", emoji: "🍛🍛🍛", description: "x".repeat(301) }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(Object.keys(parsed.fieldErrors).sort()).toEqual(["description", "emoji", "name", "price"]);
  });

  it("only changes availability when the form has the checkbox", () => {
    const base = { name: "Tea", price: "100" };
    expect(parseDishForm(form(base))).toMatchObject({ ok: true, value: { name: "Tea" } });
    expect("isAvailable" in (parseDishForm(form(base)) as { value: object }).value).toBe(false); // editing
    expect(parseDishForm(form({ ...base, isAvailable: ["off", "on"] }))).toMatchObject({ value: { isAvailable: true } });
    expect(parseDishForm(form({ ...base, isAvailable: "off" }))).toMatchObject({ value: { isAvailable: false } });
  });

  it("reads prices and times the way people type them", () => {
    expect(parsePrice("950")).toBe(950);
    expect(parsePrice("Rs. 1,250.50")).toBe(1250.5);
    expect(parsePrice("0")).toBeUndefined();
    expect(parsePrice("0", { allowZero: true })).toBe(0);
    expect(parsePrice("12.345")).toBeUndefined();
    expect(parsePrice("100000")).toBeUndefined();
    expect(parseTime("9:30")).toBe("09:30");
    expect(parseTime("24:00")).toBeUndefined();
  });
});

describe("listing form", () => {
  const ok = { cuisine: "Sri Lankan", emoji: "🍛", deliveryFee: "200", prepMinutes: "25", opensAt: "08:00", closesAt: "22:00" };

  it("accepts a listing; a free delivery is allowed", () => {
    expect(parseListingForm(form({ ...ok, deliveryFee: "0" }))).toMatchObject({ ok: true, value: { deliveryFeeLkr: 0, prepMinutes: 25 } });
  });

  it("rejects impossible hours and preparation times", () => {
    const parsed = parseListingForm(form({ ...ok, prepMinutes: "2", closesAt: "08:00", cuisine: "" }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(Object.keys(parsed.fieldErrors).sort()).toEqual(["closesAt", "cuisine", "prepMinutes"]);
  });
});

describe("photos", () => {
  it("builds public URLs from stored paths", () => {
    expect(mediaUrl("https://x.supabase.co/", `${K1}/banner-1.jpg`)).toBe(
      `https://x.supabase.co/storage/v1/object/public/kitchen-media/${K1}/banner-1.jpg`,
    );
    expect(mediaUrl("https://x.supabase.co", null)).toBeNull();
  });

  it("accepts only paths this kitchen and dish could have created", () => {
    const stamp = 1_764_230_000_000;
    expect(isDishPhotoPathFor(dishPhotoPath(K1, D1, stamp), K1, D1)).toBe(true);
    expect(isDishPhotoPathFor(dishPhotoPath(K2, D1, stamp), K1, D1)).toBe(false); // another kitchen
    expect(isDishPhotoPathFor(`${K1}/dishes/${D1}-1.jpg/../../x`, K1, D1)).toBe(false);
    expect(isBannerPathFor(bannerPhotoPath(K1, stamp), K1)).toBe(true);
    expect(isBannerPathFor(bannerPhotoPath(K1, stamp), K2)).toBe(false);
  });

  it("crops from the centre to fill the shape without stretching", () => {
    // A portrait phone photo to a square dish photo: keep the middle band.
    expect(coverCrop(3024, 4032, 800, 800)).toEqual({ sx: 0, sy: 504, sw: 3024, sh: 3024 });
    // A square photo to a 16:9 banner: keep the middle strip.
    expect(coverCrop(1000, 1000, 1600, 900)).toEqual({ sx: 0, sy: 219, sw: 1000, sh: 563 });
  });

  it("refuses files that are not photos or are too large", () => {
    expect(photoProblem({ type: "application/pdf", size: 10 })).toMatch(/photo/);
    expect(photoProblem({ type: "image/jpeg", size: 25 * 1024 * 1024 })).toMatch(/20 MB/);
    expect(photoProblem({ type: "image/png", size: 3 * 1024 * 1024 })).toBeNull();
  });
});

describe("grouping", () => {
  const dish = (name: string, category: string, sortOrder: number) => ({ name, category, sortOrder }) as MenuDish;
  it("keeps the kitchen's order within and across categories", () => {
    const groups = groupByCategory([dish("Tea", "Drinks", 3), dish("Kottu", "Mains", 1), dish("Rice", "Mains", 2)]);
    expect(groups.map((g) => [g.name, g.dishes.map((d) => d.name)])).toEqual([
      ["Mains", ["Kottu", "Rice"]],
      ["Drinks", ["Tea"]],
    ]);
  });
});

describe("MenuService", () => {
  function fakeRepository(dish: Partial<DishRow> | null = { id: D1, name: "Egg kottu", image_path: `${K1}/dishes/${D1}-1.jpg` }) {
    const saved = { kind: "saved" } as WriteOutcome;
    return {
      dish: vi.fn(async () => (dish ? ({ ...dish } as DishRow) : null)),
      listing: vi.fn(async () => ({ banner_path: `${K1}/banner-1.jpg` }) as ListingRow),
      updateDish: vi.fn(async (): Promise<WriteOutcome> => saved),
      updateListing: vi.fn(async () => saved),
      deleteDish: vi.fn(async () => saved),
      createDish: vi.fn(async () => saved),
      nextSortOrder: vi.fn(async () => 4),
      removeFiles: vi.fn(async () => {}),
    };
  }
  const service = (repo: ReturnType<typeof fakeRepository>) =>
    new MenuService(repo as unknown as MenuRepository, "https://x.supabase.co");

  it("inspectors, disabled accounts and signed-out users cannot change the menu", async () => {
    const repo = fakeRepository();
    const s = service(repo);
    expect((await s.saveDish(session("phi"), form({ name: "Tea", price: "100" })))?.ok).toBe(false);
    expect((await s.saveDish({ ...session(), disabled: true }, form({ name: "Tea", price: "100" })))?.ok).toBe(false);
    expect((await s.setBanner(null, `${K1}/banner-2.jpg`))?.ok).toBe(false);
    expect(repo.createDish).not.toHaveBeenCalled();
    expect(repo.updateListing).not.toHaveBeenCalled();
  });

  it("adds a dish at the end of the menu", async () => {
    const repo = fakeRepository();
    const result = await service(repo).saveDish(session(), form({ name: "Tea", price: "100", isAvailable: ["off", "on"] }));
    expect(result).toEqual({ ok: true, message: "Tea was added to your menu." });
    expect(repo.createDish).toHaveBeenCalledWith(K1, expect.objectContaining({ name: "Tea", isAvailable: true }), 4);
  });

  it("saves a new photo and removes the replaced file", async () => {
    const repo = fakeRepository();
    const path = dishPhotoPath(K1, D1, 1_764_230_000_000);
    expect(await service(repo).setDishPhoto(session(), D1, path)).toEqual({ ok: true, message: "Photo saved." });
    expect(repo.updateDish).toHaveBeenCalledWith(K1, D1, { imagePath: path });
    expect(repo.removeFiles).toHaveBeenCalledWith([`${K1}/dishes/${D1}-1.jpg`]);
  });

  it("refuses a photo path from another kitchen, even from a signed-in operator", async () => {
    const repo = fakeRepository();
    const result = await service(repo).setDishPhoto(session(), D1, dishPhotoPath(K2, D1, 1_764_230_000_000));
    expect(result?.ok).toBe(false);
    expect(repo.updateDish).not.toHaveBeenCalled();
  });

  it("removing a dish also removes its photo", async () => {
    const repo = fakeRepository();
    expect(await service(repo).deleteDish(session(), D1)).toEqual({ ok: true, message: "Egg kottu was removed from your menu." });
    expect(repo.removeFiles).toHaveBeenCalledWith([`${K1}/dishes/${D1}-1.jpg`]);
  });

  it("a failed save keeps the old photo", async () => {
    const repo = fakeRepository();
    repo.updateDish.mockResolvedValueOnce({ kind: "refused", message: "You do not have permission to change this menu." });
    const result = await service(repo).setDishPhoto(session(), D1, dishPhotoPath(K1, D1, 1_764_230_000_000));
    expect(result?.ok).toBe(false);
    expect(repo.removeFiles).not.toHaveBeenCalled();
  });

  it("removing the banner clears it and deletes the file", async () => {
    const repo = fakeRepository();
    expect(await service(repo).setBanner(session(), "")).toEqual({ ok: true, message: "Banner removed." });
    expect(repo.updateListing).toHaveBeenCalledWith(K1, { bannerPath: null });
    expect(repo.removeFiles).toHaveBeenCalledWith([`${K1}/banner-1.jpg`]);
  });
});
