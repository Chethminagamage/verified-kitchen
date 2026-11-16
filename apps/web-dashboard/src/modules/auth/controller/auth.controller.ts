"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AccountDisabledError, InvalidCredentialsError } from "../model/auth.model";
import { isKitchenRole } from "../model/session.model";
import { SessionRepository } from "../repository/session.repository";
import { AuthService } from "../service/auth.service";

const authService = new AuthService();

export async function loginAction(
  formData: FormData
) {
  const email = String(
    formData.get("email") ?? ""
  );

  const password = String(
    formData.get("password") ?? ""
  );

  try {
    await authService.login({
      email,
      password,
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      redirect("/login?error=invalid");
    }
    if (error instanceof AccountDisabledError) {
      redirect("/login?error=disabled");
    }
    // A real fault, not a wrong password: log it and say so.
    console.error("[auth] sign-in failed:", error);
    redirect("/login?error=unavailable");
  }

  // The kitchen console is for kitchen staff only: customers use the mobile
  // app and administrators the admin site.
  const session = await new SessionRepository().getSession();
  if (session && (session.disabled || !isKitchenRole(session.role))) {
    await authService.logout();
    redirect(
      session.disabled
        ? "/login?error=disabled"
        : session.role === "admin"
          ? "/login?error=admin"
          : "/login?error=customer"
    );
  }

  revalidatePath("/", "layout");

  redirect("/dashboard");
}

export async function logoutAction() {
  await authService.logout();

  revalidatePath("/", "layout");

  redirect("/login");
}