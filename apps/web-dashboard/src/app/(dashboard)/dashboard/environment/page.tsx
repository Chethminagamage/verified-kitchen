import type { Metadata } from "next";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";
import { getEnvironmentPage } from "@/modules/environment/controller/environment.controller";
import EnvironmentalMonitoringView from "@/modules/environment/view/EnvironmentalMonitoringView";

export const metadata: Metadata = {
  title: "Environmental Monitoring",
};

interface EnvironmentPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EnvironmentalMonitoringPage({
  searchParams,
}: EnvironmentPageProps) {
  const session = await getCurrentSession();
  const kitchen = session?.kitchen;

  // The layout handles signed-out users and users without a kitchen.
  if (!kitchen) {
    return null;
  }

  const data = await getEnvironmentPage(kitchen, await searchParams);

  return <EnvironmentalMonitoringView data={data} kitchenId={kitchen.id} />;
}
