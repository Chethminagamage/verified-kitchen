import type { Metadata } from "next";

import { getAuditTrailData } from "@/modules/audit/controller/audit.controller";
import AuditTrailView from "@/modules/audit/view/AuditTrailView";

export const metadata: Metadata = {
  title: "Audit Trail",
};

export default async function AuditTrailPage() {
  const data = await getAuditTrailData();

  return <AuditTrailView data={data} />;
}