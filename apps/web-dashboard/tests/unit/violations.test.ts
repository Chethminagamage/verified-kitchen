import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OperatorSession } from "@/modules/auth/model/session.model";
import {
  allowedTransitions,
  filtersToQuery,
  parseFilters,
} from "@/modules/violations/model/violation.model";
import type { UpdateOutcome } from "@/modules/violations/repository/violation.repository";

// The service must never reach Supabase in unit tests.
vi.mock("@/infrastructure/supabase/server", () => ({
  createClient: () => {
    throw new Error("Supabase must not be called in unit tests");
  },
}));

const { ViolationService } = await import("@/modules/violations/service/violation.service");

describe("parseFilters", () => {
  it("defaults to open violations, page 1", () => {
    expect(parseFilters({})).toEqual({ status: "open", severity: null, source: null, pillar: null, page: 1 });
  });

  it("accepts valid values", () => {
    expect(
      parseFilters({ status: "resolved", severity: "high", source: "sensor", pillar: "environmental", page: "3" })
    ).toEqual({ status: "resolved", severity: "high", source: "sensor", pillar: "environmental", page: 3 });
  });

  it("ignores unknown or hostile values instead of passing them to the database", () => {
    expect(
      parseFilters({ status: "drop table", severity: "urgent", source: ["ai", "x"], pillar: "x", page: "-4" })
    ).toEqual({ status: "open", severity: null, source: "ai", pillar: null, page: 1 });
    expect(parseFilters({ page: "abc" }).page).toBe(1);
    expect(parseFilters({ page: "999999999" }).page).toBe(10_000);
  });

  it("round-trips through the URL", () => {
    const f = parseFilters({ status: "all", severity: "critical", page: "2" });
    const query = new URLSearchParams(filtersToQuery(f).slice(1));
    expect(parseFilters(Object.fromEntries(query))).toEqual(f);
  });

  it("keeps the default view's URL clean", () => {
    expect(filtersToQuery(parseFilters({}))).toBe("");
    expect(filtersToQuery(parseFilters({}), { page: 2 })).toBe("?page=2");
  });
});

describe("allowedTransitions (mirrors the database workflow trigger)", () => {
  it("only moves forward", () => {
    expect(allowedTransitions("active")).toEqual(["acknowledged", "resolved"]);
    expect(allowedTransitions("acknowledged")).toEqual(["resolved"]);
    expect(allowedTransitions("resolved")).toEqual([]);
  });
});

describe("ViolationService.changeStatus", () => {
  const ID = "6f1c2b9e-0d4a-4b8e-9b1a-2f3c4d5e6f70";
  const session = (role: OperatorSession["role"]): OperatorSession => ({
    userId: "u1",
    email: "op@example.com",
    fullName: null,
    role,
    kitchen: null,
    kitchens: [],
  });

  let outcome: UpdateOutcome;
  const updateStatus = vi.fn(async () => outcome);
  const service = new ViolationService({ updateStatus } as never);

  beforeEach(() => {
    updateStatus.mockClear();
    outcome = { kind: "updated" };
  });

  it("acknowledges and resolves for operators and admins", async () => {
    expect(await service.changeStatus(session("operator"), ID, "acknowledged")).toEqual({
      ok: true,
      message: "Violation acknowledged.",
    });
    expect(await service.changeStatus(session("admin"), ID, "resolved")).toMatchObject({ ok: true });
    expect(updateStatus).toHaveBeenCalledWith(ID, "resolved");
  });

  it("keeps PHIs read-only without touching the database", async () => {
    expect(await service.changeStatus(session("phi"), ID, "resolved")).toMatchObject({ ok: false });
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("rejects an expired session", async () => {
    expect(await service.changeStatus(null, ID, "resolved")).toMatchObject({ ok: false });
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("validates input before it reaches the database", async () => {
    for (const [id, status] of [
      ["not-a-uuid", "resolved"],
      [ID, "active"],
      [ID, "deleted"],
      [42, "resolved"],
    ] as const) {
      expect(await service.changeStatus(session("operator"), id, status)).toMatchObject({ ok: false });
    }
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("explains database refusals in plain language", async () => {
    outcome = { kind: "invalid_transition" };
    expect(await service.changeStatus(session("operator"), ID, "acknowledged")).toEqual({
      ok: false,
      message: "This violation was already handled. The list has been refreshed.",
    });

    outcome = { kind: "not_found_or_forbidden" };
    expect((await service.changeStatus(session("operator"), ID, "resolved"))?.message).toMatch(/access/);
  });

  it("does not leak raw database errors to the user", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    outcome = { kind: "error", message: "connection to 10.0.0.5 refused" };
    const result = await service.changeStatus(session("operator"), ID, "resolved");
    expect(result).toEqual({ ok: false, message: "Could not save the change. Please try again." });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
