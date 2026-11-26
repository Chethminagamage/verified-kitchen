import type { ReactNode } from "react";

import type { OperatorSession } from "@/modules/auth/model/session.model";
import CriticalAlertWatcher from "@/modules/alerts/view/CriticalAlertWatcher";
import { ToastProvider } from "@/shared/components/feedback/Toaster";

import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";

interface DashboardShellProps {
  session: OperatorSession;
  children: ReactNode;
}

export default function DashboardShell({
  session,
  children,
}: DashboardShellProps) {
  return (
    <ToastProvider>
      {/* Desktop alerts for serious new violations, on every console page. */}
      {session.kitchen && <CriticalAlertWatcher kitchenId={session.kitchen.id} />}
      <div className="min-h-screen bg-slate-50">
        <Sidebar role={session.role} />

        <div className="lg:pl-64">
          <TopHeader session={session} />

          <main className="animate-fade-in p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
