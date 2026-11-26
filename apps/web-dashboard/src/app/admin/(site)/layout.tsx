import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/modules/admin/controller/admin.query";
import AdminShell from "@/modules/admin/view/AdminShell";
import { getCurrentSession } from "@/modules/auth/controller/auth.query";
import StaffOnly from "@/shared/components/feedback/StaffOnly";

export default async function AdminSiteLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (session.disabled) {
    return <StaffOnly email={session.email} reason="disabled" />;
  }
  if (session.role !== "admin") {
    return <StaffOnly email={session.email} reason="not_admin" />;
  }

  // An administrator past the 4-hour admin session (the Proxy normally ends it first).
  const admin = await getAdminSession();
  if (!admin) {
    redirect("/admin/login?error=expired");
  }

  return <AdminShell session={admin}>{children}</AdminShell>;
}
