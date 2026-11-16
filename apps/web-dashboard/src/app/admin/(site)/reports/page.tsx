import type { Metadata } from "next";

import { parseReportFilter } from "@/modules/admin-reports/model/reports.model";
import { ReportsService } from "@/modules/admin-reports/service/reports.service";
import ReportsView from "@/modules/admin-reports/view/ReportsView";

export const metadata: Metadata = {
  title: "Customer reports",
};

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const filter = parseReportFilter((await searchParams).filter);
  const reports = await new ReportsService().list(filter);
  return <ReportsView reports={reports} filter={filter} />;
}
