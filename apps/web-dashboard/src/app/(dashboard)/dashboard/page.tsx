import { getDashboardOverview } from "@/modules/dashboard/controller/dashboard.controller";
import DashboardView from "@/modules/dashboard/view/DashboardView";

export default async function DashboardPage() {
  const data = await getDashboardOverview();

  return <DashboardView data={data} />;
}