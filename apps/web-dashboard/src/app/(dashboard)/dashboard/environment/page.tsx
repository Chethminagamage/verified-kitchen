import type { Metadata } from "next";

import { getEnvironmentalMonitoringData } from "@/modules/environment/controller/environment.controller";
import EnvironmentalMonitoringView from "@/modules/environment/view/EnvironmentalMonitoringView";

export const metadata: Metadata = {
  title: "Environmental Monitoring",
};

export default async function EnvironmentalMonitoringPage() {
  const data = await getEnvironmentalMonitoringData();

  return (
    <EnvironmentalMonitoringView
      data={data}
    />
  );
}