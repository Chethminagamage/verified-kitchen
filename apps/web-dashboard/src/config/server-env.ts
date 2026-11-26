import "server-only";

/**
 * Server-only settings for the admin site. Read when an admin action needs
 * them (not at start-up), so the kitchen console runs without them.
 *
 *   SUPABASE_SECRET_KEY  sb_secret_... (Supabase > Project Settings > API keys).
 *                        Creates logins and invitation links. NEVER prefix it
 *                        with NEXT_PUBLIC_: it must not reach a browser.
 *   SITE_URL             Public address of this website, used in invitation
 *                        links (default in development: http://localhost:3000).
 */
export class AdminConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminConfigError";
  }
}

export function supabaseSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!key) {
    throw new AdminConfigError(
      "SUPABASE_SECRET_KEY is not set on the web server. Add it to apps/web-dashboard/.env.local and restart."
    );
  }
  if (key.startsWith("sb_publishable_")) {
    throw new AdminConfigError("SUPABASE_SECRET_KEY holds the publishable key; use the secret key (sb_secret_...).");
  }
  return key;
}

export function siteUrl(): string {
  const configured = process.env.SITE_URL?.trim();
  if (configured) {
    const url = new URL(configured); // throws on a malformed value
    return url.origin;
  }
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }
  throw new AdminConfigError("SITE_URL is not set on the web server (the public address of this website).");
}
