import {
  Activity,
  CircleCheckBig,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

import type {
  ViolationData,
} from "../model/violation.model";

import ViolationSummaryCard from "./components/ViolationSummaryCard";
import ViolationTable from "./components/ViolationTable";

interface ViolationsViewProps {
  data: ViolationData;
}

export default function ViolationsView({
  data,
}: ViolationsViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-600">
          Compliance Monitoring
        </p>

        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Violations
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Review detected hygiene violations across AI-based
          behavioural monitoring and environmental IoT
          sensing.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ViolationSummaryCard
          label="Total Violations"
          value={data.summary.total}
          icon={Activity}
          description="All recorded violations in the current monitoring history."
        />

        <ViolationSummaryCard
          label="Active"
          value={data.summary.active}
          icon={TriangleAlert}
          description="Violations that currently require operator attention."
        />

        <ViolationSummaryCard
          label="Resolved"
          value={data.summary.resolved}
          icon={CircleCheckBig}
          description="Violations that have been cleared or resolved."
        />

        <ViolationSummaryCard
          label="High Severity"
          value={data.summary.highSeverity}
          icon={ShieldAlert}
          description="High-priority hygiene issues requiring closer review."
        />
      </section>

      <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

          <div>
            <h3 className="font-semibold text-amber-950">
              Violation Processing
            </h3>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              Violations are generated from AI or sensor
              evidence. Their score impact and severity will
              eventually be determined by the validated hygiene
              scoring rules in the backend.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <ViolationTable
          violations={data.violations}
        />
      </div>
    </div>
  );
}