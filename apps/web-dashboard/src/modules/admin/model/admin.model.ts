/** Times on the admin site are shown in the platform's home time zone. */
export const PLATFORM_TIMEZONE = "Asia/Colombo";

/**
 * Result of an admin Server Action, shown next to the form that sent it.
 * `fieldErrors` marks individual inputs; `link` carries a one-time
 * invitation or password link to hand to a person.
 */
export type ActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  link?: { url: string; recipient: string; purpose: "setup" | "reset" };
} | null;

export const SESSION_ENDED: ActionState = {
  ok: false,
  message: "Your admin session has ended. Sign in again to continue.",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** A form field as a trimmed string ("" when missing). */
export function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Postgres error codes the admin functions raise on purpose, with a message
 * written for the person using the site:
 * check_violation, unique_violation, no_data_found, insufficient_privilege.
 */
const EXPLAINED = new Set(["23514", "23505", "P0002", "42501"]);

export interface DatabaseError {
  code?: string;
  message: string;
}

/** The database's own explanation when it refused on purpose; otherwise null. */
export function explainedMessage(error: DatabaseError): string | null {
  if (!error.code || !EXPLAINED.has(error.code)) return null;
  const text = error.message.trim();
  if (!text) return null;
  const sentence = text[0].toUpperCase() + text.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

/** Outcome of a repository write: done, or refused with a message for the admin. */
export type WriteResult<T = void> = { ok: true; value: T } | { ok: false; message: string };

/** Turns a Supabase error into a WriteResult, logging anything unexpected. */
export function refused(error: DatabaseError, context: string): { ok: false; message: string } {
  const explained = explainedMessage(error);
  if (explained) return { ok: false, message: explained };
  console.error(`[admin] ${context} failed:`, error.code, error.message);
  return { ok: false, message: "Something went wrong. Please try again." };
}
