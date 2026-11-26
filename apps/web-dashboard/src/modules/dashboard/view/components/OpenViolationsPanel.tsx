import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import ViolationSeverityBadge from "@/modules/violations/view/components/ViolationSeverityBadge";
import EmptyState from "@/shared/components/ui/EmptyState";
import { Panel, PanelHeader } from "@/shared/components/ui/Panel";
import { formatRelative } from "@/shared/utils/time";

import type { ViolationSummary } from "../../model/dashboard.model";

interface OpenViolationsPanelProps {
  violations: ViolationSummary[];
  total: number;
  generatedAt: string;
}

/** The open problems on the Overview, newest first, with a link to the full list. */
export default function OpenViolationsPanel({ violations, total, generatedAt }: OpenViolationsPanelProps) {
  return (
    <Panel>
      <PanelHeader
        title="Needs attention"
        description={total === 0 ? "No open violations." : `${total} open violation${total === 1 ? "" : "s"}.`}
        aside={
          <Link
            href="/dashboard/violations"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
          >
            All violations
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />

      {violations.length === 0 ? (
        <EmptyState icon={ShieldCheck} tone="positive" title="Everything is compliant" compact className="mt-2">
          No hygiene problems are open right now.
        </EmptyState>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {violations.map((v) => (
            <li key={v.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3 py-3">
              {/* Fixed-width badge column, so every title starts at the same position. */}
              <div className="pt-0.5">
                <ViolationSeverityBadge severity={v.severity} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{v.title}</p>
                <p className="text-xs text-slate-500">
                  {formatRelative(v.occurredAt, generatedAt)}
                  {v.status === "acknowledged" && " · acknowledged"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
