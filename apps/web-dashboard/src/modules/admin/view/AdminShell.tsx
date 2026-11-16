import type { ReactNode } from "react";
import { CircleUserRound, LogOut } from "lucide-react";

import { adminLogoutAction } from "@/modules/auth/controller/admin-auth.controller";
import type { OperatorSession } from "@/modules/auth/model/session.model";

import AdminMobileNav from "./components/AdminMobileNav";
import AdminSidebarContent from "./components/AdminSidebarContent";

export default function AdminShell({ session, children }: { session: OperatorSession; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-800 bg-slate-950 lg:flex lg:flex-col">
        <AdminSidebarContent />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center">
            <AdminMobileNav />
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-500">Verified Kitchen platform</p>
              <h1 className="truncate text-lg font-semibold text-slate-900">Administration</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CircleUserRound className="h-9 w-9 text-slate-400" />
              <div className="hidden sm:block">
                <p className="max-w-56 truncate text-sm font-medium text-slate-900">
                  {session.fullName ?? "Administrator"}
                </p>
                <p className="max-w-56 truncate text-xs text-slate-500">{session.email}</p>
              </div>
            </div>
            <form action={adminLogoutAction}>
              <button
                type="submit"
                title="Sign out"
                aria-label="Sign out"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
