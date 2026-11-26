import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";

import ActivityList from "@/modules/admin-activity/view/ActivityList";
import { displayName } from "@/modules/admin-accounts/model/accounts.model";
import { PLATFORM_TIMEZONE } from "@/modules/admin/model/admin.model";
import type { AdminOverview } from "@/modules/admin/service/overview.service";
import { formatDateTime } from "@/shared/utils/time";

import { Card, PageHeader, Pill, StatTile } from "./components/ui";

export default function AdminOverviewView({ data }: { data: AdminOverview }) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Platform"
        title="Overview"
        description="Kitchens on the platform, the people who run them and whether their monitoring is running."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Live kitchens" value={data.kitchens.live} hint={`${data.kitchens.hidden} hidden or being set up`} />
        <StatTile
          label="Devices reporting"
          value={`${data.devices.reporting}/${data.devices.total}`}
          hint="Heard from in the last 15 minutes"
          tone={data.devices.reporting < data.devices.total ? "amber" : "slate"}
        />
        <StatTile
          label="Staff accounts"
          value={data.staff.active}
          hint={`${data.staff.invited} invited, not yet signed in · ${data.staff.disabled} disabled`}
        />
        <StatTile
          label="Hygiene concerns (7 days)"
          value={data.hygieneReports7d}
          hint="Reported by customers"
          tone={data.hygieneReports7d > 0 ? "red" : "slate"}
        />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Needs attention" description="Kitchens being set up, and live kitchens whose monitoring is not complete.">
          {data.attention.length === 0 ? (
            <p className="text-sm text-slate-500">All live kitchens are fully monitored.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.attention.map(({ kitchen, reason }) => (
                <li key={kitchen.id}>
                  <Link href={`/admin/kitchens/${kitchen.id}`} className="group flex items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900 group-hover:text-emerald-700">
                        {kitchen.emoji ?? "🍽️"} {kitchen.name}
                      </span>
                      <span className="text-xs text-slate-500">{reason}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-emerald-600" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {data.pendingInvites.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-900">Invitations not yet accepted</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {data.pendingInvites.map((a) => (
                  <li key={a.userId}>
                    {displayName(a)} <span className="text-slate-400">· {a.kitchens.map((k) => k.name).join(", ") || "admin"}</span>
                  </li>
                ))}
              </ul>
              <Link href="/admin/accounts" className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:underline">
                Send a new link
              </Link>
            </div>
          )}
        </Card>

        <Card
          title="Latest hygiene concerns"
          actions={<Link href="/admin/reports" className="text-sm font-medium text-emerald-700 hover:underline">All reports</Link>}
        >
          {data.latestReports.length === 0 ? (
            <p className="text-sm text-slate-500">No hygiene concerns in the last 30 days.</p>
          ) : (
            <ul className="space-y-3">
              {data.latestReports.map((r) => (
                <li key={r.orderId} className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-slate-900">
                      {r.kitchenName} <span className="font-mono text-xs font-normal text-slate-400">{r.orderReference}</span>
                    </p>
                    {r.comment && <p className="truncate text-slate-600">“{r.comment}”</p>}
                    <p className="text-xs text-slate-400">{formatDateTime(r.createdAt, PLATFORM_TIMEZONE)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title="Recent admin activity"
        className="mt-6"
        actions={<Link href="/admin/activity" className="text-sm font-medium text-emerald-700 hover:underline">Full log</Link>}
      >
        <ActivityList entries={data.activity} />
      </Card>

      <p className="mt-6 text-xs text-slate-400">
        <Pill tone="slate">Updated {formatDateTime(data.generatedAt, PLATFORM_TIMEZONE)}</Pill>
      </p>
    </div>
  );
}
