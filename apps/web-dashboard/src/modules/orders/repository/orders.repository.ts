import { createClient } from "@/infrastructure/supabase/server";

import type { OrderStatus } from "../model/orders.model";

export interface OrderRow {
  id: string;
  status: OrderStatus;
  customer_name: string | null;
  contact_phone: string;
  delivery_address: string;
  note: string | null;
  total_lkr: number;
  placed_at: string;
  updated_at: string;
  cancelled_by: string | null;
  order_items: { name: string; quantity: number; line_total_lkr: number | null }[];
}

export type UpdateOutcome = { kind: "updated" } | { kind: "refused"; message: string };

function fail(what: string, message: string): never {
  throw new Error(`Could not load ${what}: ${message}`);
}

const SELECT =
  "id, status, customer_name, contact_phone, delivery_address, note, total_lkr, placed_at, updated_at, cancelled_by, " +
  "order_items(name, quantity, line_total_lkr)";

/** Orders of the operator's kitchen. Row Level Security limits rows to kitchens the user has access to. */
export class OrdersRepository {
  async active(kitchenId: string): Promise<OrderRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(SELECT)
      .eq("kitchen_id", kitchenId)
      .not("status", "in", "(delivered,cancelled)")
      .order("placed_at", { ascending: true }) // oldest first: work the queue in order
      .limit(200);
    if (error) fail("orders", error.message);
    return data as unknown as OrderRow[];
  }

  async finishedSince(kitchenId: string, since: Date): Promise<OrderRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(SELECT)
      .eq("kitchen_id", kitchenId)
      .in("status", ["delivered", "cancelled"])
      .gte("updated_at", since.toISOString())
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) fail("recent orders", error.message);
    return data as unknown as OrderRow[];
  }

  /** Server-side function enforces kitchen access and the allowed transitions. */
  async updateStatus(id: string, status: OrderStatus): Promise<UpdateOutcome> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_order_status", { p_order: id, p_status: status });
    if (!error) return { kind: "updated" };
    return { kind: "refused", message: error.message };
  }
}
