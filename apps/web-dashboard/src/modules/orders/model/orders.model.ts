import type { Database } from "@/shared/types/database.types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  on_the_way: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** What the kitchen can do next. Same transitions as public.update_order_status(). */
export interface OrderAction {
  to: OrderStatus;
  label: string;
  tone: "primary" | "danger";
}

export function nextActions(status: OrderStatus): OrderAction[] {
  switch (status) {
    case "placed":
      return [
        { to: "accepted", label: "Accept", tone: "primary" },
        { to: "cancelled", label: "Reject", tone: "danger" },
      ];
    case "accepted":
      return [
        { to: "preparing", label: "Start preparing", tone: "primary" },
        { to: "cancelled", label: "Cancel", tone: "danger" },
      ];
    case "preparing":
      return [{ to: "on_the_way", label: "Out for delivery", tone: "primary" }];
    case "on_the_way":
      return [{ to: "delivered", label: "Mark delivered", tone: "primary" }];
    default:
      return [];
  }
}

export function isActiveOrder(status: OrderStatus): boolean {
  return status !== "delivered" && status !== "cancelled";
}

/** Short reference shared with the customer's app (#A1B2C3). */
export function orderReference(id: string): string {
  return `#${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export interface OrderLine {
  name: string;
  quantity: number;
  lineTotal: number;
}

export interface KitchenOrder {
  id: string;
  reference: string;
  status: OrderStatus;
  customerName: string | null;
  contactPhone: string;
  deliveryAddress: string;
  note: string | null;
  totalLkr: number;
  placedAt: string;
  updatedAt: string;
  cancelledBy: string | null;
  lines: OrderLine[];
}

export interface OrdersPage {
  timezone: string;
  generatedAt: string;
  active: KitchenOrder[];
  recent: KitchenOrder[];
  canManage: boolean;
  counts: Record<"new" | "inProgress" | "deliveredToday", number>;
}

export type OrderActionState = { ok: boolean; message: string } | null;

export { formatLkr } from "@/shared/utils/money";
