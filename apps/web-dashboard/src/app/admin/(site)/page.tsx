import type { Metadata } from "next";

import { OverviewService } from "@/modules/admin/service/overview.service";
import AdminOverviewView from "@/modules/admin/view/AdminOverviewView";

export const metadata: Metadata = {
  title: "Overview",
};

export default async function AdminOverviewPage() {
  const data = await new OverviewService().get();
  return <AdminOverviewView data={data} />;
}
