import { getCurrentSession } from "@/modules/auth/controller/auth.query";
import { getDashboardOverview } from "@/modules/dashboard/controller/dashboard.controller";
import DashboardView from "@/modules/dashboard/view/DashboardView";

export default async function DashboardPage() {
  // The layout has already redirected signed-out users and handled
  // users without a kitchen, so both are present here.
  const session = await getCurrentSession();
  const kitchen = session?.kitchen;

  if (!kitchen) {
    return null;
  }

  const data = await getDashboardOverview(kitchen);

  return (
    <DashboardView
      data={data}
      kitchenId={kitchen.id}
    />
  );
}
