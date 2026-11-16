import Link from "next/link";
import { ShieldAlert, Star } from "lucide-react";

import { PLATFORM_TIMEZONE } from "@/modules/admin/model/admin.model";
import { EmptyState, PageHeader, Pill } from "@/modules/admin/view/components/ui";
import { formatDateTime } from "@/shared/utils/time";

import { REPORT_WINDOW_DAYS, type CustomerReport, type ReportFilter } from "../model/reports.model";

const TABS: { value: ReportFilter; label: string }[] = [
  { value: "hygiene", label: "Hygiene concerns" },
  { value: "all", label: "All problems and low ratings" },
];

export default function ReportsView({ reports, filter }: { reports: CustomerReport[]; filter: ReportFilter }) {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Customers"
        title="Customer reports"
        description={`What customers reported after delivery in the last ${REPORT_WINDOW_DAYS} days. Reports are private (the kitchen sees its own) and never change a public grade: grades come only from monitored evidence. Repeated hygiene concerns are a reason to check a kitchen's monitoring.`}
      />

      <nav aria-label="Filter" className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === "hygiene" ? "/admin/reports" : "/admin/reports?filter=all"}
            aria-current={filter === t.value ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === t.value ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {reports.length === 0 ? (
        <EmptyState>{filter === "hygiene" ? "No hygiene concerns reported." : "No problems reported."}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.orderId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.isHygiene ? "bg-red-50" : "bg-slate-100"}`}>
                    {r.isHygiene ? <ShieldAlert className="h-5 w-5 text-red-600" /> : <Star className="h-5 w-5 text-slate-500" />}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">
                      <Link href={`/admin/kitchens/${r.kitchenId}`} className="hover:text-emerald-700">{r.kitchenName}</Link>
                      <span className="ml-2 font-mono text-xs font-normal text-slate-400">{r.orderReference}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {r.problemLabel && <Pill tone={r.isHygiene ? "red" : "amber"}>{r.problemLabel}</Pill>}
                      {r.rating !== null && (
                        <span className="text-xs text-slate-500" aria-label={`Rated ${r.rating} out of 5`}>
                          {"★".repeat(r.rating)}
                          <span className="text-slate-300">{"★".repeat(5 - r.rating)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <time dateTime={r.createdAt} className="text-xs text-slate-400">
                  {formatDateTime(r.createdAt, PLATFORM_TIMEZONE)}
                </time>
              </div>
              {r.comment && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">“{r.comment}”</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
