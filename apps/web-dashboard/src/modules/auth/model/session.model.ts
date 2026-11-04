import type { Database } from "@/shared/types/database.types";

export type UserRole =
  Database["public"]["Enums"]["user_role"];

export interface KitchenSummary {
  id: string;
  code: string;
  name: string;
  location: string | null;
}

export interface OperatorSession {
  userId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  /** The kitchen the dashboard shows. Null when the user has no kitchen access yet. */
  kitchen: KitchenSummary | null;
  kitchens: KitchenSummary[];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  operator: "Kitchen Operator",
  phi: "Public Health Inspector",
};
