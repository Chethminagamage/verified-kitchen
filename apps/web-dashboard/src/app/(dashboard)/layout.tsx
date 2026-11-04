import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";
import NoKitchenAssigned from "@/shared/components/feedback/NoKitchenAssigned";
import DashboardShell from "@/shared/components/layout/DashboardShell";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardShell session={session}>
      {session.kitchen ? (
        children
      ) : (
        <NoKitchenAssigned email={session.email} />
      )}
    </DashboardShell>
  );
}
