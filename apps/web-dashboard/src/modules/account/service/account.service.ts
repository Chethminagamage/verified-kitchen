import type { OperatorSession } from "@/modules/auth/model/session.model";

import {
  parsePasswordForm,
  parseProfileForm,
  type AccountActionState,
} from "../model/account.model";
import { AccountRepository, type AuthResult } from "../repository/account.repository";

const EXPIRED: AccountActionState = { ok: false, message: "Your session has expired. Please sign in again." };

/** Supabase auth error codes -> what the user should read (anything else gets a generic message). */
function authMessage(result: Extract<AuthResult, { ok: false }>): string {
  switch (result.code) {
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a few minutes and try again.";
    case "weak_password":
      return "That password is too easy to guess. Choose a longer or less common one.";
    case "same_password":
      return "Choose a password different from your current one.";
    case "reauthentication_needed":
    case "session_not_found":
      return "For your security, sign out, sign in again and then change your password.";
    default:
      console.error("account: auth call failed", result.code, result.message);
      return "Something went wrong. Please try again.";
  }
}

export class AccountService {
  constructor(private readonly repository = new AccountRepository()) {}

  async phone(session: OperatorSession): Promise<string | null> {
    return this.repository.phone(session.userId);
  }

  async updateProfile(session: OperatorSession | null, formData: FormData): Promise<AccountActionState> {
    if (!session) return EXPIRED;
    const parsed = parseProfileForm(formData);
    if (!parsed.ok) return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };

    const result = await this.repository.updateProfile(session.userId, parsed.value);
    if (!result.ok) {
      console.error("account: profile update failed", result.code, result.message);
      return { ok: false, message: "Your profile could not be saved. Please try again." };
    }
    return { ok: true, message: "Profile updated." };
  }

  async changePassword(session: OperatorSession | null, formData: FormData): Promise<AccountActionState> {
    if (!session) return EXPIRED;
    const parsed = parsePasswordForm(formData);
    if (!parsed.ok) return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    const { currentPassword, newPassword, signOutOthers } = parsed.value;

    // Re-check the current password, so nobody at an unlocked screen can change it.
    const verified = await this.repository.verifyPassword(session.email, currentPassword);
    if (!verified.ok) {
      return verified.code === "invalid_credentials"
        ? { ok: false, message: "Check the highlighted fields.", fieldErrors: { currentPassword: "That is not your current password." } }
        : { ok: false, message: authMessage(verified) };
    }

    const updated = await this.repository.updatePassword(newPassword);
    if (!updated.ok) return { ok: false, message: authMessage(updated) };

    if (signOutOthers) {
      const others = await this.repository.signOutOtherSessions();
      if (!others.ok) {
        return { ok: true, message: "Password changed, but other devices could not be signed out. Use “Sign out other devices”." };
      }
      return { ok: true, message: "Password changed. Other devices have been signed out." };
    }
    return { ok: true, message: "Password changed." };
  }

  async signOutOtherDevices(session: OperatorSession | null): Promise<AccountActionState> {
    if (!session) return EXPIRED;
    const result = await this.repository.signOutOtherSessions();
    return result.ok
      ? { ok: true, message: "Signed out of all other devices." }
      : { ok: false, message: authMessage(result) };
  }
}
