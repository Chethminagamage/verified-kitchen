import type { Metadata } from "next";

import { getAIMonitoringData } from "@/modules/ai-monitoring/controller/ai-monitoring.controller";
import AIMonitoringView from "@/modules/ai-monitoring/view/AIMonitoringView";

export const metadata: Metadata = {
  title: "AI Monitoring",
};

export default async function AIMonitoringPage() {
  const data = await getAIMonitoringData();

  return <AIMonitoringView data={data} />;
}