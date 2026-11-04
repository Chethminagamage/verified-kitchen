import { describe, expect, it } from "vitest";

import {
  MONITORING_NAV,
  SETTINGS_NAV,
  isActive,
} from "@/shared/components/layout/navigation";

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
    for (const item of [...MONITORING_NAV, SETTINGS_NAV]) {
      const active = [...MONITORING_NAV, SETTINGS_NAV].filter((i) => isActive(item.href, i.href));
      expect(active.map((i) => i.href)).toEqual([item.href]);
    }
  });

  it("keeps every route under /dashboard", () => {
    for (const item of [...MONITORING_NAV, SETTINGS_NAV]) {
      expect(item.href === "/dashboard" || item.href.startsWith("/dashboard/")).toBe(true);
    }
  });
});
