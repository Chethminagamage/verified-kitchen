"use server";

import { refresh } from "next/cache";

import { getAdminSession } from "@/modules/admin/controller/admin.query";
import { field, isUuid, SESSION_ENDED, type ActionState } from "@/modules/admin/model/admin.model";

import { parseInviteForm } from "../model/accounts.model";
import { AccountsService } from "../service/accounts.service";

const accounts = new AccountsService();

/** Invite a staff member (fields: email, full_name, role, kitchen_id). */
export async function inviteStaffAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminSession())) return SESSION_ENDED;
  const parsed = parseInviteForm(formData);
  if (!parsed.ok) return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  const result = await accounts.invite(parsed.value);
  if (result?.ok) refresh();
  return result;
}

/** New one-time set-up or password link (field: user_id). */
export async function issueLinkAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminSession())) return SESSION_ENDED;
  const userId = field(formData, "user_id");
  if (!isUuid(userId)) return { ok: false, message: "Unknown account." };
  return accounts.issueLink(userId);
}

/** Change a staff member's role (fields: user_id, role). */
export async function changeRoleAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminSession())) return SESSION_ENDED;
  const userId = field(formData, "user_id");
  if (!isUuid(userId)) return { ok: false, message: "Unknown account." };
  const result = await accounts.changeRole(userId, field(formData, "role"));
  refresh();
  return result;
}

/** Disable or enable an account (fields: user_id, disabled = "true" | "false"). */
export async function setDisabledAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getAdminSession())) return SESSION_ENDED;
  const userId = field(formData, "user_id");
  const disabled = field(formData, "disabled");
  if (!isUuid(userId) || (disabled !== "true" && disabled !== "false")) return { ok: false, message: "Unknown account." };
  const result = await accounts.setDisabled(userId, disabled === "true");
  refresh();
  return result;
}
