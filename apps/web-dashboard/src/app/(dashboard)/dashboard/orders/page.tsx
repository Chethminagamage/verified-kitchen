import type { Metadata } from "next";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";
import { getOrdersPage } from "@/modules/orders/controller/orders.controller";
import OrdersView from "@/modules/orders/view/OrdersView";

export const metadata: Metadata = {
  title: "Orders",
};

export default async function OrdersPage() {
  const session = await getCurrentSession();
  const kitchen = session?.kitchen;

  // The layout handles signed-out users, customers and users without a kitchen.
  if (!session || !kitchen) {
    return null;
  }

  const data = await getOrdersPage(session, kitchen);

  return <OrdersView data={data} kitchenId={kitchen.id} />;
}
