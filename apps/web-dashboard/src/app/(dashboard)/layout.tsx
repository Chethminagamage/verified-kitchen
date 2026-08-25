import type { ReactNode } from "react";
import DashboardShell from "@/shared/components/layout/DashboardShell";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  );
}