export interface LoginCredentials {
  email: string;
  password: string;
}

/** Wrong email or password (as opposed to Supabase being unreachable, etc.). */
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

// ---------------------------------------------------------------------
// Session policy
//
// Supabase keeps a user signed in indefinitely (its refresh token does not
// expire). For an operator console on a possibly shared kitchen or PHI
// computer that is too long, so the dashboard adds its own rule, enforced
// in the Next.js Proxy on every request:
//   * the sign-in ends when the browser is closed (session cookie), and
//   * at the latest SESSION_MAX_AGE_MS after signing in (one work shift).
// ---------------------------------------------------------------------

/** httpOnly session cookie holding the sign-in time (epoch ms). */
export const SESSION_COOKIE = "vk_signed_in_at";

/** Absolute session lifetime: one 12-hour shift. */
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/** Allowed clock difference for a sign-in time slightly in the future. */
const CLOCK_SKEW_MS = 60 * 1000;

/** True while a sign-in made at `signedInAt` (cookie value) is still allowed. */
export function sessionStillValid(signedInAt: string | undefined, now: number): boolean {
  if (!signedInAt || !/^\d{1,15}$/.test(signedInAt)) return false;
  const started = Number(signedInAt);
  return started <= now + CLOCK_SKEW_MS && now - started <= SESSION_MAX_AGE_MS;
}

// ---------------------------------------------------------------------
// Login page messages. The URL only carries a code, never the text, so a
// crafted link cannot put arbitrary words on the login page.
// ---------------------------------------------------------------------
export const LOGIN_MESSAGES = {
  invalid: "Invalid email or password.",
  expired: "Your session has ended. Please sign in again.",
  unavailable: "Sign-in is temporarily unavailable. Please try again in a moment.",
} as const;

export type LoginMessageCode = keyof typeof LOGIN_MESSAGES;

export function loginMessage(code: string | string[] | undefined): string | undefined {
  const value = Array.isArray(code) ? code[0] : code;
  return value && Object.hasOwn(LOGIN_MESSAGES, value) ? LOGIN_MESSAGES[value as LoginMessageCode] : undefined;
}
