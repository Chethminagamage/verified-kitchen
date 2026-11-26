/**
 * Account set-up links (/account/setup?token_hash=...&type=...).
 *
 * An administrator creates the link for a new staff member ("invite") or for
 * a password reset ("recovery") and sends it to them. The link is only
 * redeemed when the person submits a password (POST), never when the page is
 * opened: chat apps and mail scanners open links to build previews, which
 * would otherwise use up the one-time link.
 */
export type SetupLinkType = "invite" | "recovery";

export interface SetupLink {
  tokenHash: string;
  type: SetupLinkType;
}

const TOKEN = /^[A-Za-z0-9_-]{16,256}$/;

export function parseSetupLink(tokenHash: unknown, type: unknown): SetupLink | null {
  const t = Array.isArray(type) ? type[0] : type;
  const h = Array.isArray(tokenHash) ? tokenHash[0] : tokenHash;
  if ((t !== "invite" && t !== "recovery") || typeof h !== "string" || !TOKEN.test(h)) return null;
  return { tokenHash: h, type: t };
}

export const PASSWORD_MIN_LENGTH = 10;
/** Supabase Auth hashes with bcrypt, which uses at most 72 bytes. */
export const PASSWORD_MAX_BYTES = 72;

/** Why a new password is not acceptable, or null when it is. */
export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return "That password is too long.";
  }
  if (/^(.)\1*$/.test(password)) {
    return "Choose a password that is harder to guess.";
  }
  if (password !== confirm) {
    return "The two passwords do not match.";
  }
  return null;
}

export type SetupState = { message: string; field?: "password" } | null;

export const SETUP_MESSAGES = {
  invalidLink: "This link is not valid. Ask your Verified Kitchen administrator for a new one.",
  usedLink:
    "This link has expired or has already been used. Ask your Verified Kitchen administrator for a new one.",
  disabled: "This account has been disabled. Contact your Verified Kitchen administrator.",
  failed: "Your password could not be saved. Please try again.",
} as const;
