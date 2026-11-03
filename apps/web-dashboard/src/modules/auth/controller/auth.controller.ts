"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  } catch {
    redirect(
      "/login?error=Invalid%20email%20or%20password"
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