import "server-only";

import { createClient as createStatelessClient } from "@supabase/supabase-js";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/config/env";
import { createClient } from "@/infrastructure/supabase/server";
import type { Database } from "@/shared/types/database.types";

import type { ProfileInput } from "../model/account.model";

/** Outcome of an auth call, with Supabase's error code for the service to translate. */
export type AuthResult = { ok: true } | { ok: false; code: string | undefined; message: string };

function fail(error: { code?: string; message: string }): AuthResult {
  return { ok: false, code: error.code, message: error.message };
}

/** Reads and changes the signed-in user's own account. Row Level Security limits every call to that user. */
export class AccountRepository {
  async phone(userId: string): Promise<string | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").select("phone").eq("id", userId).maybeSingle();
    if (error) throw new Error(`Could not load your profile: ${error.message}`);
    return data?.phone ?? null;
  }

  async updateProfile(userId: string, input: ProfileInput): Promise<AuthResult> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: input.fullName, phone: input.phone })
      .eq("id", userId);
    return error ? fail(error) : { ok: true };
  }

  /**
   * Checks a password without touching the browser session: a separate client
   * that stores nothing signs in, and that temporary session is ended at once.
   */
  async verifyPassword(email: string, password: string): Promise<AuthResult> {
    const probe = createStatelessClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error } = await probe.auth.signInWithPassword({ email, password });
    if (error) return fail(error);
    await probe.auth.signOut({ scope: "local" });
    return { ok: true };
  }

  async updatePassword(newPassword: string): Promise<AuthResult> {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? fail(error) : { ok: true };
  }

  /** Ends every session of this user except the current one. */
  async signOutOtherSessions(): Promise<AuthResult> {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "others" });
    return error ? fail(error) : { ok: true };
  }
}
