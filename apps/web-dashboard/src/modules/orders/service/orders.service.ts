import type { OperatorSession } from "@/modules/auth/model/session.model";

import {
  isActiveOrder,
  nextActions,
  orderReference,
  type KitchenOrder,
  type OrderActionState,
  type OrdersPage,
  type OrderStatus,
} from "../model/orders.model";
import { OrdersRepository, type OrderRow } from "../repository/orders.repository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES: readonly OrderStatus[] = ["placed", "accepted", "preparing", "on_the_way", "delivered", "cancelled"];

function toOrder(r: OrderRow): KitchenOrder {
  return {
    id: r.id,
    reference: orderReference(r.id),
    status: r.status,
    customerName: r.customer_name,
    contactPhone: r.contact_phone,
    deliveryAddress: r.delivery_address,
    note: r.note,
    totalLkr: Number(r.total_lkr),
    placedAt: r.placed_at,
    updatedAt: r.updated_at,
    cancelledBy: r.cancelled_by,
    lines: r.order_items.map((i) => ({ name: i.name, quantity: i.quantity, lineTotal: Number(i.line_total_lkr ?? 0) })),
  };
}

export function canManageOrders(session: OperatorSession): boolean {
  return session.role === "operator" || session.role === "admin";
}

export class OrdersService {
  constructor(private readonly repository = new OrdersRepository()) {}

  async getPage(session: OperatorSession, kitchenId: string, timezone: string, now = new Date()): Promise<OrdersPage> {
    const startOfDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [active, finished] = await Promise.all([
      this.repository.active(kitchenId),
      this.repository.finishedSince(kitchenId, startOfDay),
    ]);
    const activeOrders = active.map(toOrder).filter((o) => isActiveOrder(o.status));
    return {
      timezone,
      generatedAt: now.toISOString(),
      active: activeOrders,
      recent: finished.map(toOrder),
      canManage: canManageOrders(session),
      counts: {
        new: activeOrders.filter((o) => o.status === "placed").length,
        inProgress: activeOrders.filter((o) => o.status !== "placed").length,
        deliveredToday: finished.filter((o) => o.status === "delivered").length,
      },
    };
  }

  async changeStatus(
    session: OperatorSession | null,
    id: unknown,
    from: unknown,
    to: unknown
  ): Promise<OrderActionState> {
    if (!session) return { ok: false, message: "Your session has expired. Please sign in again." };
    if (!canManageOrders(session)) return { ok: false, message: "Your role can view orders but not change them." };
    if (typeof id !== "string" || !UUID.test(id)) return { ok: false, message: "Unknown order." };
    if (!STATUSES.includes(from as OrderStatus) || !STATUSES.includes(to as OrderStatus)) {
      return { ok: false, message: "Unsupported action." };
    }
    if (!nextActions(from as OrderStatus).some((a) => a.to === to)) {
      return { ok: false, message: "This order has already moved on. The list has been refreshed." };
    }
    const outcome = await this.repository.updateStatus(id, to as OrderStatus);
    if (outcome.kind === "updated") return { ok: true, message: "Order updated." };
    if (outcome.message.startsWith("cannot change an order")) {
      return { ok: false, message: "This order has already moved on. The list has been refreshed." };
    }
    console.error("order status update failed:", outcome.message);
    return { ok: false, message: "Could not update the order. Please try again." };
  }
}
