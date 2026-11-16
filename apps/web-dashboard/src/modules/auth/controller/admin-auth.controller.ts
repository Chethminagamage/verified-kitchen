"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AccountDisabledError, InvalidCredentialsError } from "../model/auth.model";
import { SessionRepository } from "../repository/session.repository";
import { AuthService } from "../service/auth.service";

const authService = new AuthService();

/** Sign-in for the admin site (/admin/login). Only active administrators get in. */
export async function adminLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await authService.login({ email, password });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) redirect("/admin/login?error=invalid");
    if (error instanceof AccountDisabledError) redirect("/admin/login?error=disabled");
    console.error("[auth] admin sign-in failed:", error);
    redirect("/admin/login?error=unavailable");
  }

  const session = await new SessionRepository().getSession();
  if (!session || session.disabled || session.role !== "admin") {
    await authService.logout();
    redirect(session?.disabled ? "/admin/login?error=disabled" : "/admin/login?error=not_admin");
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function adminLogoutAction() {
  await authService.logout();
  revalidatePath("/", "layout");
  redirect("/admin/login");
}
