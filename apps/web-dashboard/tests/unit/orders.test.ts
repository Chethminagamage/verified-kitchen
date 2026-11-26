import { describe, expect, it } from "vitest";

import { loginMessage } from "@/modules/auth/model/auth.model";
import { isStaffRole, type OperatorSession } from "@/modules/auth/model/session.model";
import { isActiveOrder, nextActions, orderReference } from "@/modules/orders/model/orders.model";
import type { OrdersRepository, UpdateOutcome } from "@/modules/orders/repository/orders.repository";
import { OrdersService } from "@/modules/orders/service/orders.service";

const ID = "3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b";

function session(role: OperatorSession["role"]): OperatorSession {
  return { userId: "u", email: "op@test", fullName: null, role, disabled: false, signedInAt: Date.now(), kitchen: null, kitchens: [] };
}

function service(outcome: UpdateOutcome = { kind: "updated" }) {
  const calls: unknown[] = [];
  const repo = {
    updateStatus: async (...args: unknown[]) => {
      calls.push(args);
      return outcome;
    },
  } as unknown as OrdersRepository;
  return { svc: new OrdersService(repo), calls };
}

describe("order workflow (same transitions as the database)", () => {
  it("offers the next step, and cancel only before preparing", () => {
    expect(nextActions("placed").map((a) => a.to)).toEqual(["accepted", "cancelled"]);
    expect(nextActions("accepted").map((a) => a.to)).toEqual(["preparing", "cancelled"]);
    expect(nextActions("preparing").map((a) => a.to)).toEqual(["on_the_way"]);
    expect(nextActions("on_the_way").map((a) => a.to)).toEqual(["delivered"]);
    expect(nextActions("delivered")).toEqual([]);
    expect(nextActions("cancelled")).toEqual([]);
  });

  it("knows which orders are still active and shares the app's reference", () => {
    expect(isActiveOrder("preparing")).toBe(true);
    expect(isActiveOrder("delivered")).toBe(false);
    expect(orderReference(ID)).toBe("#3F2B8C");
  });
});

describe("changing an order's status", () => {
  it("lets an operator move an order forward", async () => {
    const { svc, calls } = service();
    expect(await svc.changeStatus(session("operator"), ID, "placed", "accepted")).toEqual({ ok: true, message: "Order updated." });
    expect(calls).toEqual([[ID, "accepted"]]);
  });

  it("refuses PHIs, skipped steps, bad ids and missing sessions before calling the database", async () => {
    const { svc, calls } = service();
    expect((await svc.changeStatus(session("phi"), ID, "placed", "accepted"))?.ok).toBe(false);
    expect((await svc.changeStatus(session("operator"), ID, "placed", "delivered"))?.ok).toBe(false);
    expect((await svc.changeStatus(session("operator"), "1; drop table", "placed", "accepted"))?.ok).toBe(false);
    expect((await svc.changeStatus(null, ID, "placed", "accepted"))?.ok).toBe(false);
    expect(calls).toEqual([]);
  });

  it("explains a race with another tab or the customer cancelling", async () => {
    const { svc } = service({ kind: "refused", message: "cannot change an order from cancelled to accepted" });
    expect(await svc.changeStatus(session("operator"), ID, "placed", "accepted")).toEqual({
      ok: false,
      message: "This order has already moved on. The list has been refreshed.",
    });
  });
});

describe("customer accounts and the operator console", () => {
  it("only staff roles may use the console", () => {
    expect(isStaffRole("operator")).toBe(true);
    expect(isStaffRole("phi")).toBe(true);
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("customer")).toBe(false);
  });

  it("tells a customer to use the app", () => {
    expect(loginMessage("customer")).toMatch(/kitchen staff/);
  });
});
