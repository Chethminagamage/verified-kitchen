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

/** The login is banned in Supabase Auth (an administrator disabled the account). */
export class AccountDisabledError extends Error {
  constructor() {
    super("This account has been disabled.");
    this.name = "AccountDisabledError";
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

/** The admin site (/admin) allows a shorter session: 4 hours from sign-in. */
export const ADMIN_SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000;

/** Allowed clock difference for a sign-in time slightly in the future. */
const CLOCK_SKEW_MS = 60 * 1000;

/** True while a sign-in made at `signedInAt` (cookie value) is still allowed. */
export function sessionStillValid(
  signedInAt: string | undefined,
  now: number,
  maxAgeMs: number = SESSION_MAX_AGE_MS
): boolean {
  if (!signedInAt || !/^\d{1,15}$/.test(signedInAt)) return false;
  const started = Number(signedInAt);
  return started <= now + CLOCK_SKEW_MS && now - started <= maxAgeMs;
}

/** The admin site lives under /admin (its own login, layout and shorter session). */
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * Pages reachable without a valid session: the two sign-in pages and the
 * account set-up page opened from an invitation or reset link.
 */
export function isSignInPage(pathname: string): boolean {
  return pathname === "/login" || pathname === "/admin/login" || pathname === "/account/setup";
}

/** Where an ended session is sent to sign in again. */
export function expiredSessionRedirect(pathname: string): string {
  return isAdminPath(pathname) ? "/admin/login?error=expired" : "/login?error=expired";
}

// ---------------------------------------------------------------------
// Login page messages. The URL only carries a code, never the text, so a
// crafted link cannot put arbitrary words on the login page.
// ---------------------------------------------------------------------
export const LOGIN_MESSAGES = {
  invalid: "Invalid email or password.",
  expired: "Your session has ended. Please sign in again.",
  unavailable: "Sign-in is temporarily unavailable. Please try again in a moment.",
  customer: "This console is for kitchen staff. Use the Verified Kitchen app to order food.",
  admin: "Administrator accounts sign in on the admin site at /admin/login.",
  disabled: "This account has been disabled. Contact your Verified Kitchen administrator.",
} as const;

export type LoginMessageCode = keyof typeof LOGIN_MESSAGES;

export function loginMessage(code: string | string[] | undefined): string | undefined {
  const value = Array.isArray(code) ? code[0] : code;
  return value && Object.hasOwn(LOGIN_MESSAGES, value) ? LOGIN_MESSAGES[value as LoginMessageCode] : undefined;
}

// Messages of the admin sign-in page (/admin/login), same code-only scheme.
export const ADMIN_LOGIN_MESSAGES = {
  invalid: "Invalid email or password.",
  expired: "Your admin session has ended. Please sign in again.",
  unavailable: "Sign-in is temporarily unavailable. Please try again in a moment.",
  not_admin: "This account is not an administrator. Kitchen staff sign in at /login.",
  disabled: "This account has been disabled.",
} as const;

export function adminLoginMessage(code: string | string[] | undefined): string | undefined {
  const value = Array.isArray(code) ? code[0] : code;
  return value && Object.hasOwn(ADMIN_LOGIN_MESSAGES, value)
    ? ADMIN_LOGIN_MESSAGES[value as keyof typeof ADMIN_LOGIN_MESSAGES]
    : undefined;
}
