import type { Metadata } from "next";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";
import { getReportsData } from "@/modules/reports/controller/reports.controller";
import ReportsView from "@/modules/reports/view/ReportsView";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function ReportsPage() {
  const session = await getCurrentSession();
  const kitchen = session?.kitchen;

  // The layout handles signed-out users and users without a kitchen.
  if (!kitchen) {
    return null;
  }

  const data = await getReportsData(kitchen);

  return <ReportsView data={data} />;
}
