"use server";

import { refresh } from "next/cache";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";

import type { OrderActionState } from "../model/orders.model";
import { OrdersService } from "../service/orders.service";

const ordersService = new OrdersService();

/** Move an order forward (form fields: id, from, to). */
export async function changeOrderStatusAction(_previous: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const session = await getCurrentSession();
  const result = await ordersService.changeStatus(session, formData.get("id"), formData.get("from"), formData.get("to"));
  // Refresh on refusals too, so the kitchen sees the current state.
  refresh();
  return result;
}
