import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";
import { isKitchenRole } from "@/modules/auth/model/session.model";
import NoKitchenAssigned from "@/shared/components/feedback/NoKitchenAssigned";
import StaffOnly from "@/shared/components/feedback/StaffOnly";
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

  // Administrators work on the admin site, not in a kitchen's console.
  if (session.role === "admin" && !session.disabled) {
    redirect("/admin");
  }

  // Defence in depth: customer and disabled sessions never render any dashboard page.
  if (session.disabled || !isKitchenRole(session.role)) {
    return <StaffOnly email={session.email} reason={session.disabled ? "disabled" : "customer"} />;
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
