import type { Json } from "@/shared/types/database.types";
import type { UserRole } from "@/modules/auth/model/session.model";

import { field, isUuid } from "@/modules/admin/model/admin.model";

export type StaffRole = Extract<UserRole, "operator" | "phi" | "admin">;

export const STAFF_ROLES: readonly StaffRole[] = ["operator", "phi", "admin"];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  operator: "Kitchen operator",
  phi: "Health inspector (read-only)",
  admin: "Platform administrator",
};

export function isStaffRoleValue(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

/** Invited = has never set a password; disabled = blocked by an administrator. */
export type AccountStatus = "active" | "invited" | "disabled";

export interface KitchenRef {
  id: string;
  code: string;
  name: string;
}

export interface StaffAccount {
  userId: string;
  email: string;
  fullName: string | null;
  role: StaffRole;
  status: AccountStatus;
  invitedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  kitchens: KitchenRef[];
}

/** One row of public.admin_list_accounts(). */
export interface AccountRow {
  user_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  disabled_at: string | null;
  invited_at: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  kitchens: Json;
}

function kitchenRefs(value: Json): KitchenRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((k) =>
    k && typeof k === "object" && !Array.isArray(k) && typeof k.id === "string"
      ? [{ id: k.id, code: String(k.code ?? ""), name: String(k.name ?? "") }]
      : []
  );
}

export function accountStatus(row: Pick<AccountRow, "disabled_at" | "email_confirmed_at" | "last_sign_in_at">): AccountStatus {
  if (row.disabled_at) return "disabled";
  if (!row.email_confirmed_at && !row.last_sign_in_at) return "invited";
  return "active";
}

export function toStaffAccount(row: AccountRow): StaffAccount | null {
  if (!isStaffRoleValue(row.role)) return null;
  return {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    status: accountStatus(row),
    invitedAt: row.invited_at,
    lastSignInAt: row.last_sign_in_at,
    createdAt: row.created_at,
    kitchens: kitchenRefs(row.kitchens),
  };
}

export function displayName(account: Pick<StaffAccount, "fullName" | "email">): string {
  return account.fullName?.trim() || account.email;
}

// ---------------------------------------------------------------------
// Invitation form
// ---------------------------------------------------------------------
export interface InviteInput {
  email: string;
  fullName: string;
  role: StaffRole;
  /** Required for operators and inspectors; administrators see every kitchen. */
  kitchenId: string | null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type Parsed<T> = { ok: true; value: T } | { ok: false; fieldErrors: Record<string, string> };

export function parseInviteForm(formData: FormData): Parsed<InviteInput> {
  const email = field(formData, "email").toLowerCase();
  const fullName = field(formData, "full_name");
  const role = field(formData, "role");
  const kitchenId = field(formData, "kitchen_id");
  const errors: Record<string, string> = {};

  if (!EMAIL.test(email) || email.length > 254) errors.email = "Enter a valid email address.";
  if (fullName.length < 2 || fullName.length > 100) errors.full_name = "Enter the person's full name.";
  if (!isStaffRoleValue(role)) errors.role = "Choose a role.";
  if (role !== "admin" && !isUuid(kitchenId)) errors.kitchen_id = "Choose the kitchen this person works for.";

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    value: { email, fullName, role: role as StaffRole, kitchenId: role === "admin" ? null : kitchenId },
  };
}

/** The set-up page a link opens (see auth/model/setup.model.ts). */
export function setupLinkUrl(origin: string, tokenHash: string, type: "invite" | "recovery"): string {
  const url = new URL("/account/setup", origin);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  return url.toString();
}
