import { createAuthAdmin } from "@/infrastructure/supabase/admin";
import { createClient } from "@/infrastructure/supabase/server";

import { refused, type WriteResult } from "@/modules/admin/model/admin.model";

import type { AccountRow, StaffRole } from "../model/accounts.model";

export type LinkResult =
  | { ok: true; userId: string; tokenHash: string }
  | { ok: false; reason: "exists" | "failed"; message: string };

/**
 * Staff accounts. Roles, kitchen access and disabling go through the
 * database's admin functions with the administrator's own session; only the
 * login itself (create, link, ban, delete) uses Supabase Auth's admin API.
 */
export class AccountsRepository {
  async list(userId?: string): Promise<AccountRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_list_accounts", userId ? { p_user: userId } : {});
    if (error) throw new Error(`Could not load accounts: ${error.message}`);
    return data;
  }

  async onboard(userId: string, role: StaffRole, kitchenId: string | null): Promise<WriteResult> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_onboard_staff", {
      p_user: userId,
      p_role: role,
      ...(kitchenId ? { p_kitchen: kitchenId } : {}),
    });
    return error ? refused(error, "onboard staff") : { ok: true, value: undefined };
  }

  async setRole(userId: string, role: StaffRole): Promise<WriteResult> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_set_staff_role", { p_user: userId, p_role: role });
    return error ? refused(error, "change role") : { ok: true, value: undefined };
  }

  async setDisabled(userId: string, disabled: boolean): Promise<WriteResult> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_set_account_disabled", { p_user: userId, p_disabled: disabled });
    return error ? refused(error, "disable account") : { ok: true, value: undefined };
  }

  async noteEvent(
    userId: string,
    action: "account.setup_link_issued" | "account.reset_link_issued" | "account.login_ban_failed"
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_note_account_event", { p_user: userId, p_action: action });
    if (error) console.error("[admin] could not log account event:", error.message);
  }

  // -- Supabase Auth (secret key) ------------------------------------------

  /** Creates the login (no email is sent) and returns a one-time set-up token. */
  async createInvitation(email: string, fullName: string): Promise<LinkResult> {
    const { data, error } = await createAuthAdmin().generateLink({
      type: "invite",
      email,
      options: { data: { full_name: fullName } },
    });
    if (error || !data.user) {
      if (error?.code === "email_exists" || error?.status === 422) {
        return { ok: false, reason: "exists", message: "An account with this email address already exists." };
      }
      console.error("[admin] invitation failed:", error?.code, error?.message);
      return { ok: false, reason: "failed", message: "The invitation could not be created. Please try again." };
    }
    return { ok: true, userId: data.user.id, tokenHash: data.properties.hashed_token };
  }

  /** A one-time link to (re)set the password of an existing login. */
  async createPasswordLink(email: string): Promise<LinkResult> {
    const { data, error } = await createAuthAdmin().generateLink({ type: "recovery", email });
    if (error || !data.user) {
      console.error("[admin] password link failed:", error?.code, error?.message);
      return { ok: false, reason: "failed", message: "The link could not be created. Please try again." };
    }
    return { ok: true, userId: data.user.id, tokenHash: data.properties.hashed_token };
  }

  /** Blocks (or unblocks) the login itself, on top of the database's disabled flag. */
  async setLoginBanned(userId: string, banned: boolean): Promise<boolean> {
    const { error } = await createAuthAdmin().updateUserById(userId, {
      ban_duration: banned ? "876000h" : "none", // ~100 years
    });
    if (error) console.error("[admin] login ban change failed:", error.code, error.message);
    return !error;
  }

  /** Undo for a half-finished invitation (the login exists but its role could not be set). */
  async deleteLogin(userId: string): Promise<void> {
    const { error } = await createAuthAdmin().deleteUser(userId);
    if (error) console.error("[admin] could not remove unfinished login", userId, error.message);
  }
}
