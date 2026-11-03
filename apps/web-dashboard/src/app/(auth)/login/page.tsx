import type { Metadata } from "next";

import { redirect } from "next/navigation";

import { createClient } from "@/infrastructure/supabase/server";

import LoginView from "@/modules/auth/view/LoginView";

export const metadata: Metadata = {
  title: "Operator Login",
};

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const supabase = await createClient();

  const { data } =
    await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <LoginView
      error={params.error}
    />
  );
}