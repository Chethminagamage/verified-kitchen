import type { Database } from "@/shared/types/database.types";

export type UserRole =
  Database["public"]["Enums"]["user_role"];

export interface KitchenSummary {
  id: string;
  code: string;
  name: string;
  location: string | null;
  /** IANA time zone, e.g. Asia/Colombo. */
  timezone: string;
}

export interface OperatorSession {
  userId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  /** An administrator disabled this account: it may not use either site. */
  disabled: boolean;
  /** Sign-in time (epoch ms), for the shorter admin session. */
  signedInAt: number;
  /** The kitchen the dashboard shows. Null when the user has no kitchen access yet. */
  kitchen: KitchenSummary | null;
  kitchens: KitchenSummary[];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  operator: "Kitchen Operator",
  phi: "Public Health Inspector",
  customer: "Customer",
};

/** Roles allowed into this console. Customers use the mobile app. */
export function isStaffRole(role: UserRole): boolean {
  return role === "admin" || role === "operator" || role === "phi";
}

/** Roles that work in a kitchen (the kitchen console). Admins use /admin. */
export function isKitchenRole(role: UserRole): boolean {
  return role === "operator" || role === "phi";
}
