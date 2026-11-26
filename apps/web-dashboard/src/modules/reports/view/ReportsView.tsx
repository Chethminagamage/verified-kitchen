import { CalendarRange, ChartNoAxesCombined, CircleCheckBig, ShieldCheck, TriangleAlert } from "lucide-react";

import PageHeader from "@/shared/components/ui/PageHeader";
import StatTile from "@/shared/components/ui/StatTile";
import { toneForScore } from "@/shared/components/ui/tone";

import type { ReportsData } from "../model/reports.model";

import HygieneScoreTrendChart from "./components/HygieneScoreTrendChart";
import PillarPerformanceChart from "./components/PillarPerformanceChart";
import ViolationBreakdownChart from "./components/ViolationBreakdownChart";
import EnvironmentalSummaryTable from "./components/EnvironmentalSummaryTable";

interface ReportsViewProps {
  data: ReportsData;
}

export default function ReportsView({
  data,
}: ReportsViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Historical analytics"
        title="Reports"
        description="Hygiene performance, compliance trends, violations and environmental statistics over the reporting period."
        aside={
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-card">
            <CalendarRange className="h-4 w-4 text-slate-400" aria-hidden />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Reporting period</p>
              <p className="text-sm font-semibold text-slate-900">{data.period}</p>
            </div>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Average hygiene score"
          value={data.summary.averageHygieneScore === null ? "—" : `${data.summary.averageHygieneScore}/100`}
          icon={ChartNoAxesCombined}
          tone={toneForScore(data.summary.averageHygieneScore)}
          description={`Mean of ${data.summary.scoredSamples.toLocaleString("en-GB")} stored scores (one per minute) in the period.`}
        />

        <StatTile
          label="Compliance rate"
          value={data.summary.complianceRate === null ? "—" : `${data.summary.complianceRate}%`}
          icon={CircleCheckBig}
          tone={toneForScore(data.summary.complianceRate)}
          description="Share of scored minutes rated Good or better (score 75 or above)."
        />

        <StatTile
          label="Total violations"
          value={data.summary.totalViolations}
          icon={TriangleAlert}
          tone={data.summary.totalViolations > 0 ? "warning" : "positive"}
          description="Problems detected automatically during the period."
        />

        <StatTile
          label="Secured audit records"
          value={data.summary.verifiedAuditRecords}
          icon={ShieldCheck}
          tone="info"
          description={`Records confirmed in the independent ledger (${data.summary.pendingAuditRecords} waiting to be secured).`}
        />
      </section>

      <section className="mt-8">
        <HygieneScoreTrendChart
          data={data.hygieneTrend}
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <PillarPerformanceChart
          data={data.pillarPerformance}
        />

        <ViolationBreakdownChart
          data={data.violationBreakdown}
        />
      </section>

      <section className="mt-8">
        <EnvironmentalSummaryTable
          data={data.environmentalSummary}
        />
      </section>

    </div>
  );
}