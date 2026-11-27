import { describe, expect, it } from "vitest";

import {
  MONITORING_NAV,
  ORDERS_NAV,
  SETTINGS_NAV,
  canSeeKitchenPages,
  MENU_NAV,
  isActive,
  navGroupsFor,
} from "@/shared/components/layout/navigation";

const ALL_ITEMS = [...MONITORING_NAV, ORDERS_NAV, SETTINGS_NAV];

describe("isActive", () => {
  it("matches Overview only on /dashboard itself", () => {
    expect(isActive("/dashboard", "/dashboard")).toBe(true);
    expect(isActive("/dashboard/", "/dashboard")).toBe(true);
    expect(isActive("/dashboard/violations", "/dashboard")).toBe(false);
  });

  it("matches a section and its sub-pages", () => {
    expect(isActive("/dashboard/violations", "/dashboard/violations")).toBe(true);
    expect(isActive("/dashboard/violations/123", "/dashboard/violations")).toBe(true);
  });

  it("does not match look-alike prefixes", () => {
    expect(isActive("/dashboard/auditors", "/dashboard/audit")).toBe(false);
  });

  it("highlights exactly one item for every route", () => {
    for (const item of ALL_ITEMS) {
      const active = ALL_ITEMS.filter((i) => isActive(item.href, i.href));
      expect(active.map((i) => i.href)).toEqual([item.href]);
    }
  });

  it("keeps every route under /dashboard", () => {
    for (const item of ALL_ITEMS) {
      expect(item.href === "/dashboard" || item.href.startsWith("/dashboard/")).toBe(true);
    }
  });
});

describe("navGroupsFor", () => {
  it("shows operators the monitoring pages, then Menu and Orders in a separate Kitchen group", () => {
    const groups = navGroupsFor("operator");
    expect(groups.map((g) => g.label)).toEqual(["Monitoring", "Kitchen"]);
    expect(groups[0].items.map((i) => i.name)).not.toContain("Orders");
    expect(groups[1].items).toEqual([MENU_NAV, ORDERS_NAV]);
  });

  it("never shows the menu or customer orders to an inspector (PHI)", () => {
    expect(canSeeKitchenPages("phi")).toBe(false);
    const items = navGroupsFor("phi").flatMap((g) => g.items);
    expect(items.map((i) => i.href)).not.toContain(ORDERS_NAV.href);
    expect(items.map((i) => i.href)).not.toContain(MENU_NAV.href);
    expect(items).toHaveLength(MONITORING_NAV.length);
  });
});
