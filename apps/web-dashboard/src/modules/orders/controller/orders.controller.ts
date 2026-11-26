import type { KitchenSummary, OperatorSession } from "@/modules/auth/model/session.model";

import { OrdersService } from "../service/orders.service";

const ordersService = new OrdersService();

export async function getOrdersPage(session: OperatorSession, kitchen: KitchenSummary) {
  return ordersService.getPage(session, kitchen.id, kitchen.timezone);
}
