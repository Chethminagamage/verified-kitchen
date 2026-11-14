"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { InvalidCredentialsError } from "../model/auth.model";
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
    // A real fault, not a wrong password: log it and say so.
    console.error("[auth] sign-in failed:", error);
    redirect("/login?error=unavailable");
  }

  revalidatePath("/", "layout");

  redirect("/dashboard");
}

export async function logoutAction() {
  await authService.logout();

  revalidatePath("/", "layout");

  redirect("/login");
}