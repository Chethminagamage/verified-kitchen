import Link from "next/link";
import {
  Bell,
  CircleUserRound,
  LogOut,
} from "lucide-react";

import { logoutAction } from "@/modules/auth/controller/auth.controller";
import { ROLE_LABELS, type OperatorSession } from "@/modules/auth/model/session.model";
import { SystemStatusService } from "@/modules/system-status/service/system-status.service";
import SystemStatusBadge from "@/modules/system-status/view/SystemStatusBadge";

import MobileNav from "./MobileNav";

const systemStatusService = new SystemStatusService();

interface TopHeaderProps {
  session: OperatorSession;
}

export default async function TopHeader({
  session,
}: TopHeaderProps) {
  const { kitchen } = session;

  const status = kitchen
    ? await systemStatusService.getStatus(kitchen.id)
    : null;

  const activeViolations =
    status?.activeViolations ?? 0;

  const roleLabel = ROLE_LABELS[session.role];

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center">
        <MobileNav />

        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500">
            {kitchen?.location ?? "Kitchen Operations"}
          </p>

          <h1 className="truncate text-lg font-semibold text-slate-900">
            {kitchen?.name ?? "Monitoring Dashboard"}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {status && <SystemStatusBadge status={status} />}

        {/* Active violations */}
        <Link
          href="/dashboard/violations"
          aria-label={`${activeViolations} active violations`}
          title={`${activeViolations} active violations`}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        >
          <Bell className="h-5 w-5" />

          {activeViolations > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
              {activeViolations > 99 ? "99+" : activeViolations}
            </span>
          )}
        </Link>

        {/* Signed-in user */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <CircleUserRound className="h-9 w-9 text-slate-400" />

          <div className="hidden sm:block">
            <p className="max-w-48 truncate text-sm font-medium text-slate-900">
              {session.fullName ?? roleLabel}
            </p>

            <p className="max-w-48 truncate text-xs text-slate-500">
              {session.fullName
                ? `${roleLabel} · ${session.email}`
                : session.email}
            </p>
          </div>
        </div>

        {/* Logout */}
        <form action={logoutAction}>
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
  );
}
