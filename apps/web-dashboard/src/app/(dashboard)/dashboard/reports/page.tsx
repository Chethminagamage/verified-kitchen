import type { Metadata } from "next";

import { getReportsData } from "@/modules/reports/controller/reports.controller";
import ReportsView from "@/modules/reports/view/ReportsView";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function ReportsPage() {
  const data = await getReportsData();

  return <ReportsView data={data} />;
}