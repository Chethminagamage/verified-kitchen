import type { Metadata } from "next";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";
import { getViolationPage } from "@/modules/violations/controller/violation.controller";
import ViolationsView from "@/modules/violations/view/ViolationsView";

export const metadata: Metadata = {
  title: "Violations",
};

interface ViolationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ViolationsPage({
  searchParams,
}: ViolationsPageProps) {
  const session = await getCurrentSession();
  const kitchen = session?.kitchen;

  // The layout handles signed-out users and users without a kitchen.
  if (!session || !kitchen) {
    return null;
  }

  const page = await getViolationPage(session, kitchen, await searchParams);

  return <ViolationsView page={page} kitchenId={kitchen.id} />;
}
