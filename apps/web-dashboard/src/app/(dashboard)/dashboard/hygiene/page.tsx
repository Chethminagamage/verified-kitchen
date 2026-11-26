import type { Metadata } from "next";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";
import { getHygienePage } from "@/modules/hygiene/controller/hygiene.controller";
import HygieneMonitoringView from "@/modules/hygiene/view/HygieneMonitoringView";

export const metadata: Metadata = {
  title: "Hygiene Monitoring",
};

export default async function HygieneMonitoringPage() {
  const session = await getCurrentSession();
  const kitchen = session?.kitchen;

  // The layout handles signed-out users and users without a kitchen.
  if (!kitchen) {
    return null;
  }

  const data = await getHygienePage(kitchen);

  return <HygieneMonitoringView data={data} kitchenId={kitchen.id} />;
}
