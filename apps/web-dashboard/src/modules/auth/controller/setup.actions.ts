"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/infrastructure/supabase/server";

import { parseSetupLink, passwordProblem, SETUP_MESSAGES, type SetupState } from "../model/setup.model";
import { startSessionClock } from "../repository/auth.repository";
import { SessionRepository } from "../repository/session.repository";

/**
 * Remembers, for 15 minutes and on this page only, which account this
 * browser just redeemed a link for. If saving the password then fails (for
 * example a password Supabase rejects), the person can try again without a
 * new link: the link itself is single-use.
 */
const PENDING_COOKIE = "vk_setup_user";
const PENDING_PATH = "/account/setup";

export async function setupAccountAction(_previous: SetupState, formData: FormData): Promise<SetupState> {
  const link = parseSetupLink(formData.get("token_hash"), formData.get("type"));
  if (!link) return { message: SETUP_MESSAGES.invalidLink };

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const problem = passwordProblem(password, confirm);
  if (problem) return { message: problem, field: "password" };

  const supabase = await createClient();
  const store = await cookies();

  const verified = await supabase.auth.verifyOtp({ type: link.type, token_hash: link.tokenHash });
  if (!verified.error && verified.data.user) {
    store.set(PENDING_COOKIE, verified.data.user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: PENDING_PATH,
      maxAge: 15 * 60,
    });
  } else {
    // Already redeemed by this browser a moment ago (a previous attempt)?
    const pending = store.get(PENDING_COOKIE)?.value;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!pending || !user || user.id !== pending) {
      return { message: SETUP_MESSAGES.usedLink };
    }
  }

  const updated = await supabase.auth.updateUser({ password });
  if (updated.error) {
    if (updated.error.code === "weak_password") {
      return { message: "Supabase rejected this password as too weak. Choose a longer, less common one.", field: "password" };
    }
    if (updated.error.code === "same_password") {
      return { message: "Choose a password you have not used before.", field: "password" };
    }
    console.error("[auth] saving a new password failed:", updated.error.code, updated.error.message);
    return { message: SETUP_MESSAGES.failed };
  }

  store.delete({ name: PENDING_COOKIE, path: PENDING_PATH });
  await startSessionClock();

  const session = await new SessionRepository().getSession();
  if (!session || session.disabled) {
    await supabase.auth.signOut();
    return { message: SETUP_MESSAGES.disabled };
  }

  redirect(session.role === "admin" ? "/admin" : "/dashboard");
}
