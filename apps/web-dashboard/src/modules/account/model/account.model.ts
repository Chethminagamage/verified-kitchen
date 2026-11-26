import { passwordProblem } from "@/modules/auth/model/setup.model";

/*
 * The signed-in user's own account: profile, password and sessions.
 * Pure validation only (unit-tested); the database enforces who may change what
 * (users may update only their own name and phone).
 */

export type AccountField = "fullName" | "phone" | "currentPassword" | "newPassword" | "confirmPassword";

export type AccountActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<AccountField, string>>;
} | null;

export interface ProfileInput {
  fullName: string;
  /** Null clears the number. */
  phone: string | null;
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
  /** Also end the user's sessions on other devices. */
  signOutOthers: boolean;
}

type Parsed<T> = { ok: true; value: T } | { ok: false; fieldErrors: Partial<Record<AccountField, string>> };

export const NAME_MAX_LENGTH = 80;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * A phone number as people type it: optional leading "+", digits, spaces,
 * dashes and brackets, with 7 to 15 digits. Returned tidied (single spaces),
 * or null when empty, or undefined when invalid.
 */
export function normalizePhone(raw: string): string | null | undefined {
  const tidy = raw.trim().replace(/\s+/g, " ");
  if (tidy === "") return null;
  if (!/^\+?[\d\s()-]+$/.test(tidy)) return undefined;
  const digits = tidy.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15 ? tidy : undefined;
}

export function parseProfileForm(formData: FormData): Parsed<ProfileInput> {
  const fullName = text(formData, "fullName").trim().replace(/\s+/g, " ");
  const phone = normalizePhone(text(formData, "phone"));
  const fieldErrors: Partial<Record<AccountField, string>> = {};

  if (fullName.length < 2) fieldErrors.fullName = "Enter your name.";
  else if (fullName.length > NAME_MAX_LENGTH) fieldErrors.fullName = `Use at most ${NAME_MAX_LENGTH} characters.`;
  if (phone === undefined) fieldErrors.phone = "Enter a valid phone number, e.g. +94 77 123 4567.";

  return Object.keys(fieldErrors).length > 0
    ? { ok: false, fieldErrors }
    : { ok: true, value: { fullName, phone: phone ?? null } };
}

export function parsePasswordForm(formData: FormData): Parsed<PasswordChangeInput> {
  const currentPassword = text(formData, "currentPassword");
  const newPassword = text(formData, "newPassword");
  const confirmPassword = text(formData, "confirmPassword");
  const fieldErrors: Partial<Record<AccountField, string>> = {};

  if (currentPassword === "") fieldErrors.currentPassword = "Enter your current password.";

  // Strength rules belong to the new password; a mismatch to the confirmation field.
  const strengthProblem = passwordProblem(newPassword, newPassword);
  if (strengthProblem) fieldErrors.newPassword = strengthProblem;
  else if (newPassword === currentPassword) fieldErrors.newPassword = "Choose a password different from your current one.";
  else if (newPassword !== confirmPassword) fieldErrors.confirmPassword = "The two passwords do not match.";

  return Object.keys(fieldErrors).length > 0
    ? { ok: false, fieldErrors }
    : { ok: true, value: { currentPassword, newPassword, signOutOthers: formData.get("signOutOthers") === "on" } };
}
