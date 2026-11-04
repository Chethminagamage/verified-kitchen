import {
  CircleCheckBig,
  Eye,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

import LiveRefresh from "@/shared/components/feedback/LiveRefresh";

import type { ViolationPage } from "../model/violation.model";

import ViolationFiltersBar from "./components/ViolationFiltersBar";
import ViolationSummaryCard from "./components/ViolationSummaryCard";
import ViolationTable from "./components/ViolationTable";

interface ViolationsViewProps {
  page: ViolationPage;
  kitchenId: string;
}

export default function ViolationsView({
  page,
  kitchenId,
}: ViolationsViewProps) {
  const { counts } = page;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-600">
            Compliance Monitoring
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Violations
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Incidents raised by the edge service from AI and sensor evidence.
            Every new violation and every status change is written to the
            tamper-evident audit trail.
          </p>
        </div>

        <LiveRefresh kitchenId={kitchenId} tables={["violations"]} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ViolationSummaryCard
          label="Active"
          value={counts.active}
          icon={TriangleAlert}
          description="Need an operator to acknowledge or resolve them."
        />
        <ViolationSummaryCard
          label="Acknowledged"
          value={counts.acknowledged}
          icon={Eye}
          description="Seen by an operator, not yet resolved."
        />
        <ViolationSummaryCard
          label="Resolved"
          value={counts.resolved}
          icon={CircleCheckBig}
          description="Closed incidents in the monitoring history."
        />
        <ViolationSummaryCard
          label="Open High / Critical"
          value={counts.openHighSeverity}
          icon={ShieldAlert}
          description="Open incidents with high or critical severity."
        />
      </section>

      {!page.canManage && (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          You have read-only access to violations.
        </p>
      )}

      <div className="mb-4 mt-8">
        <ViolationFiltersBar filters={page.filters} />
      </div>

      <ViolationTable page={page} />
    </div>
  );
}
