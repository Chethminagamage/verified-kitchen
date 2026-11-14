import type { Metadata } from "next";

import { getAIMonitoringPage } from "@/modules/ai-monitoring/controller/ai-monitoring.controller";
import AIMonitoringView from "@/modules/ai-monitoring/view/AIMonitoringView";
import { getCurrentSession } from "@/modules/auth/controller/auth.query";

export const metadata: Metadata = {
  title: "AI Monitoring",
};

export default async function AIMonitoringPage() {
  const session = await getCurrentSession();
  const kitchen = session?.kitchen;

  // The layout handles signed-out users and users without a kitchen.
  if (!kitchen) {
    return null;
  }

  const data = await getAIMonitoringPage(kitchen);

  return <AIMonitoringView data={data} kitchenId={kitchen.id} />;
}
