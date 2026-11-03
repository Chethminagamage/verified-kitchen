import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { createClient } from "@/infrastructure/supabase/server";

import DashboardShell from "@/shared/components/layout/DashboardShell";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = await createClient();

  const { data } =
    await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  );
}