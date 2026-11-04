import Link from "next/link";
import { ArrowRight, CircleCheckBig } from "lucide-react";

import { formatRelative } from "@/shared/utils/time";

import type {
  ViolationSeverity,
  ViolationSummary,
} from "../../model/dashboard.model";

const SEVERITY_STYLES: Record<ViolationSeverity, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-700",
};

interface OpenViolationsPanelProps {
  violations: ViolationSummary[];
  total: number;
  generatedAt: string;
}

export default function OpenViolationsPanel({
  violations,
  total,
  generatedAt,
}: OpenViolationsPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">
            Needs Attention
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {total === 0
              ? "No open violations."
              : `${total} open violation${total === 1 ? "" : "s"}.`}
          </p>
        </div>

        <Link
          href="/dashboard/violations"
          className="flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          All violations
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {violations.length === 0 ? (
        <div className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CircleCheckBig className="h-4 w-4" />
          Everything is compliant right now.
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {violations.map((v) => (
            <li key={v.id} className="flex items-center gap-3 py-3">
              <span
                className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold capitalize ${SEVERITY_STYLES[v.severity]}`}
              >
                {v.severity}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {v.title}
                </p>

                <p className="text-xs text-slate-500">
                  {formatRelative(v.occurredAt, generatedAt)}
                  {v.status === "acknowledged" && " · acknowledged"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
