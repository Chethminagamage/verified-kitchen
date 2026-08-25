import {
  ChartNoAxesCombined,
  CircleCheckBig,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import type {
  ReportsData,
} from "../model/reports.model";

import ReportSummaryCard from "./components/ReportSummaryCard";
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
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-600">
            Historical Analytics
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Reports
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Review historical hygiene performance,
            compliance trends, violations and environmental
            monitoring statistics.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Reporting Period
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {data.period}
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportSummaryCard
          title="Average Hygiene Score"
          value={`${data.summary.averageHygieneScore}/100`}
          icon={ChartNoAxesCombined}
          description="Average overall hygiene score during the selected period."
        />

        <ReportSummaryCard
          title="Compliance Rate"
          value={`${data.summary.complianceRate}%`}
          icon={CircleCheckBig}
          description="Overall proportion of compliant monitoring outcomes."
        />

        <ReportSummaryCard
          title="Total Violations"
          value={`${data.summary.totalViolations}`}
          icon={TriangleAlert}
          description="Total recorded hygiene violations during the reporting period."
        />

        <ReportSummaryCard
          title="Verified Audit Records"
          value={`${data.summary.verifiedAuditRecords}`}
          icon={ShieldCheck}
          description="Important events confirmed by the audit layer."
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

      <p className="mt-6 text-xs text-slate-400">
        Report data shown during development is mock
        historical information and will later be generated
        from stored operational records.
      </p>
    </div>
  );
}