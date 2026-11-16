"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/modules/admin/controller/admin.query";
import { field, isUuid, SESSION_ENDED, type ActionState } from "@/modules/admin/model/admin.model";

import { parseListingForm } from "../model/kitchens.model";
import { KitchensService } from "../service/kitchens.service";

const kitchens = new KitchensService();

function invalid(fieldErrors: Record<string, string>): ActionState {
  return { ok: false, message: "Check the highlighted fields.", fieldErrors };
}
const DEVICE_ID = /^vk-(env|cam)-[0-9]{2,}$/;

/** Create a kitchen (hidden), then open its page to finish onboarding. */
export async function createKitchenAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminSession())) return SESSION_ENDED;
  const parsed = parseListingForm(formData);
  if (!parsed.ok) return invalid(parsed.fieldErrors);
  const created = await kitchens.create(parsed.value);
  if (!created.ok) return { ok: false, message: created.message };
  redirect(`/admin/kitchens/${created.value}?created=1`);
}

export async function updateKitchenAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminSession())) return SESSION_ENDED;
  const id = field(formData, "kitchen_id");
  if (!isUuid(id)) return { ok: false, message: "Unknown kitchen." };
  const parsed = parseListingForm(formData);
  if (!parsed.ok) return invalid(parsed.fieldErrors);
  const result = await kitchens.update(id, parsed.value);
  refresh();
  return result;
}

/** Go live or hide (fields: kitchen_id, published = "true" | "false"). */
export async function setPublishedAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminSession())) return SESSION_ENDED;
  const id = field(formData, "kitchen_id");
  const published = field(formData, "published");
  if (!isUuid(id) || (published !== "true" && published !== "false")) return { ok: false, message: "Unknown kitchen." };
  const result = await kitchens.setPublished(id, published === "true");
  refresh();
  return result;
}

export async function registerDeviceAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminSession())) return SESSION_ENDED;
  const id = field(formData, "kitchen_id");
  const type = field(formData, "type");
  const name = field(formData, "name");
  if (!isUuid(id)) return { ok: false, message: "Unknown kitchen." };
  if (type !== "env_node" && type !== "camera") return { ok: false, message: "Choose the device type.", fieldErrors: { type: "Required." } };
  if (name.length < 2 || name.length > 80) return { ok: false, message: "Name the device (2 to 80 characters).", fieldErrors: { name: "2 to 80 characters." } };
  const result = await kitchens.registerDevice(id, type, name);
  refresh();
  return result;
}

export async function renameDeviceAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminSession())) return SESSION_ENDED;
  const id = field(formData, "device_id");
  const name = field(formData, "name");
  if (!DEVICE_ID.test(id)) return { ok: false, message: "Unknown device." };
  if (name.length < 2 || name.length > 80) return { ok: false, message: "2 to 80 characters." };
  const result = await kitchens.renameDevice(id, name);
  refresh();
  return result;
}

export async function removeDeviceAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminSession())) return SESSION_ENDED;
  const id = field(formData, "device_id");
  if (!DEVICE_ID.test(id)) return { ok: false, message: "Unknown device." };
  const result = await kitchens.removeDevice(id);
  refresh();
  return result;
}

/** Give or remove kitchen access (fields: user_id, kitchen_id, linked = "true" | "false"). */
export async function setStaffAccessAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminSession())) return SESSION_ENDED;
  const userId = field(formData, "user_id");
  const kitchenId = field(formData, "kitchen_id");
  const linked = field(formData, "linked");
  if (!isUuid(userId)) return { ok: false, message: "Choose a person.", fieldErrors: { user_id: "Required." } };
  if (!isUuid(kitchenId) || (linked !== "true" && linked !== "false")) return { ok: false, message: "Unknown kitchen." };
  const result = linked === "true" ? await kitchens.linkStaff(userId, kitchenId) : await kitchens.unlinkStaff(userId, kitchenId);
  refresh();
  return result;
}
