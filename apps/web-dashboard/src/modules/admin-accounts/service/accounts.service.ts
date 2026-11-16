import { AdminConfigError, siteUrl } from "@/config/server-env";

import type { ActionState } from "@/modules/admin/model/admin.model";

import {
  displayName,
  isStaffRoleValue,
  setupLinkUrl,
  toStaffAccount,
  type InviteInput,
  type StaffAccount,
} from "../model/accounts.model";
import { AccountsRepository } from "../repository/accounts.repository";

/** Runs a step that needs the server's admin configuration; reports a missing setting clearly. */
async function withAdminConfig(run: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof AdminConfigError) return { ok: false, message: error.message };
    throw error;
  }
}

export class AccountsService {
  constructor(
    private readonly repository = new AccountsRepository(),
    private readonly origin: () => string = siteUrl
  ) {}

  async list(): Promise<StaffAccount[]> {
    return (await this.repository.list()).flatMap((row) => toStaffAccount(row) ?? []);
  }

  async get(userId: string): Promise<StaffAccount | null> {
    const [row] = await this.repository.list(userId);
    return row ? toStaffAccount(row) : null;
  }

  /**
   * Invites a new staff member: creates their login, gives it the role and
   * kitchen, and returns a one-time link for the admin to send them.
   */
  async invite(input: InviteInput): Promise<ActionState> {
    return withAdminConfig(async () => {
      const origin = this.origin(); // fail before creating anything if the site URL is missing
      const created = await this.repository.createInvitation(input.email, input.fullName);
      if (!created.ok) {
        return {
          ok: false,
          message:
            created.reason === "exists"
              ? `${created.message} Staff need their own account: a customer's app account cannot be used.`
              : created.message,
          fieldErrors: created.reason === "exists" ? { email: "Already registered." } : undefined,
        };
      }

      const onboarded = await this.repository.onboard(created.userId, input.role, input.kitchenId);
      if (!onboarded.ok) {
        await this.repository.deleteLogin(created.userId); // leave no half-made account behind
        return { ok: false, message: onboarded.message };
      }

      return {
        ok: true,
        message: `${input.fullName} has been invited.`,
        link: { url: setupLinkUrl(origin, created.tokenHash, "invite"), recipient: input.fullName, purpose: "setup" },
      };
    });
  }

  /** A fresh one-time link: to finish set-up (never signed in) or to reset a forgotten password. */
  async issueLink(userId: string): Promise<ActionState> {
    return withAdminConfig(async () => {
      const account = await this.get(userId);
      if (!account) return { ok: false, message: "Staff account not found." };
      if (account.status === "disabled") return { ok: false, message: "Enable the account before sending it a link." };

      const origin = this.origin();
      const link = await this.repository.createPasswordLink(account.email);
      if (!link.ok) return { ok: false, message: link.message };

      const purpose = account.status === "invited" ? "setup" : "reset";
      await this.repository.noteEvent(userId, purpose === "setup" ? "account.setup_link_issued" : "account.reset_link_issued");
      return {
        ok: true,
        message: purpose === "setup" ? "New set-up link created." : "Password reset link created.",
        link: { url: setupLinkUrl(origin, link.tokenHash, "recovery"), recipient: displayName(account), purpose },
      };
    });
  }

  async changeRole(userId: string, role: unknown): Promise<ActionState> {
    if (!isStaffRoleValue(role)) return { ok: false, message: "Choose a role." };
    const result = await this.repository.setRole(userId, role);
    return result.ok ? { ok: true, message: "Role updated." } : { ok: false, message: result.message };
  }

  /**
   * Disabling is immediate in the database (all data access stops), then the
   * login is banned in Supabase Auth so the person cannot sign in again.
   */
  async setDisabled(userId: string, disabled: boolean): Promise<ActionState> {
    const result = await this.repository.setDisabled(userId, disabled);
    if (!result.ok) return { ok: false, message: result.message };

    let banned = false;
    try {
      banned = await this.repository.setLoginBanned(userId, disabled);
    } catch (error) {
      if (!(error instanceof AdminConfigError)) throw error;
    }
    if (!banned) {
      await this.repository.noteEvent(userId, "account.login_ban_failed");
      return {
        ok: true,
        message: disabled
          ? "Account disabled: it can no longer see any data. Its login could not be blocked in Supabase Auth; check SUPABASE_SECRET_KEY."
          : "Account enabled, but its login could not be unblocked in Supabase Auth; check SUPABASE_SECRET_KEY.",
      };
    }
    return { ok: true, message: disabled ? "Account disabled." : "Account enabled." };
  }
}
