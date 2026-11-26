import "server-only";

import { createClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/config/env";
import { supabaseSecretKey } from "@/config/server-env";
import type { Database } from "@/shared/types/database.types";

/**
 * Supabase Auth administration (create logins, invitation links, bans).
 * Uses the secret key, so it is only ever called from admin Server Actions
 * after the caller has been checked to be an active administrator. All data
 * changes still go through the caller's own session and the database's
 * admin functions, never through this client.
 */
export function createAuthAdmin() {
  return createClient<Database>(SUPABASE_URL, supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }).auth.admin;
}
