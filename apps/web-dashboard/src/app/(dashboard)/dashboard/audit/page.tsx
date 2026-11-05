import type { Metadata } from "next";

import { getAuditPage } from "@/modules/audit/controller/audit.controller";
import { getCurrentSession } from "@/modules/auth/controller/auth.query";
import AuditTrailView from "@/modules/audit/view/AuditTrailView";

export const metadata: Metadata = {
  title: "Audit Trail",
};

export default async function AuditTrailPage() {
  const session = await getCurrentSession();
  const kitchen = session?.kitchen;

  // The layout handles signed-out users and users without a kitchen.
  if (!session || !kitchen) {
    return null;
  }

  const data = await getAuditPage(session, kitchen);

  return <AuditTrailView data={data} kitchenId={kitchen.id} />;
}
