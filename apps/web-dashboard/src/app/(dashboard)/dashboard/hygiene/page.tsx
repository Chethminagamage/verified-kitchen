import type { Metadata } from "next";

import { getHygieneMonitoringData } from "@/modules/hygiene/controller/hygiene.controller";
import HygieneMonitoringView from "@/modules/hygiene/view/HygieneMonitoringView";

export const metadata: Metadata = {
  title: "Hygiene Monitoring",
};

export default async function HygieneMonitoringPage() {
  const data = await getHygieneMonitoringData();

  return <HygieneMonitoringView data={data} />;
}