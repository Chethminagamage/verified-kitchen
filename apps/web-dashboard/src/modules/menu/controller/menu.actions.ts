"use server";

import { refresh } from "next/cache";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";

import type { MenuActionState } from "../model/menu.model";
import { MenuService } from "../service/menu.service";

const menuService = new MenuService();

/** Adds a dish, or saves one when the form has an id (name, description, category, price, emoji, isAvailable). */
export async function saveDishAction(_previous: MenuActionState, formData: FormData): Promise<MenuActionState> {
  const result = await menuService.saveDish(await getCurrentSession(), formData);
  if (result?.ok) refresh();
  return result;
}

/** Sold out / back on the menu (id, available = "true" | "false"). */
export async function setAvailabilityAction(_previous: MenuActionState, formData: FormData): Promise<MenuActionState> {
  const result = await menuService.setAvailability(
    await getCurrentSession(),
    formData.get("id"),
    formData.get("available") === "true",
  );
  refresh();
  return result;
}

/** Removes a dish and its photo (id). */
export async function deleteDishAction(_previous: MenuActionState, formData: FormData): Promise<MenuActionState> {
  const result = await menuService.deleteDish(await getCurrentSession(), formData.get("id"));
  if (result?.ok) refresh();
  return result;
}

/** Saves the path of a photo the browser uploaded, or removes the photo when path is empty (id, path). */
export async function setDishPhotoAction(id: string, path: string | null): Promise<MenuActionState> {
  const result = await menuService.setDishPhoto(await getCurrentSession(), id, path ?? "");
  if (result?.ok) refresh();
  return result;
}

/** Saves the listing customers see (cuisine, listingDescription, emoji, deliveryFee, prepMinutes, opensAt, closesAt). */
export async function saveListingAction(_previous: MenuActionState, formData: FormData): Promise<MenuActionState> {
  const result = await menuService.saveListing(await getCurrentSession(), formData);
  if (result?.ok) refresh();
  return result;
}

/** Saves the path of an uploaded banner, or removes the banner when path is empty. */
export async function setBannerAction(path: string | null): Promise<MenuActionState> {
  const result = await menuService.setBanner(await getCurrentSession(), path ?? "");
  if (result?.ok) refresh();
  return result;
}
