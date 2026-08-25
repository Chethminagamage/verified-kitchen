import type { Metadata } from "next";

import { getViolationData } from "@/modules/violations/controller/violation.controller";
import ViolationsView from "@/modules/violations/view/ViolationsView";

export const metadata: Metadata = {
  title: "Violations",
};

export default async function ViolationsPage() {
  const data = await getViolationData();

  return <ViolationsView data={data} />;
}