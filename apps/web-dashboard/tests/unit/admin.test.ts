import { describe, expect, it, vi } from "vitest";

import { activitySummary, actionLabel } from "@/modules/admin-activity/model/activity.model";
import {
  accountStatus,
  parseInviteForm,
  setupLinkUrl,
  toStaffAccount,
  type AccountRow,
} from "@/modules/admin-accounts/model/accounts.model";
import type { AccountsRepository } from "@/modules/admin-accounts/repository/accounts.repository";
import { AccountsService } from "@/modules/admin-accounts/service/accounts.service";
import {
  deviceSetup,
  formatHours,
  isReporting,
  parseListingForm,
  readyToPublish,
} from "@/modules/admin-kitchens/model/kitchens.model";
import { explainedMessage } from "@/modules/admin/model/admin.model";
import { isAdminNavActive } from "@/modules/admin/view/components/admin-navigation";
import {
  ADMIN_SESSION_MAX_AGE_MS,
  adminLoginMessage,
  expiredSessionRedirect,
  isAdminPath,
  isSignInPage,
  loginMessage,
  sessionStillValid,
} from "@/modules/auth/model/auth.model";
import { isKitchenRole } from "@/modules/auth/model/session.model";
import { parseSetupLink, passwordProblem } from "@/modules/auth/model/setup.model";

function form(values: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

const KITCHEN = "3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b";
const USER = "6f1c2b9e-0d4a-4b8e-9b1a-2f3c4d5e6f70";

describe("admin site routing and sessions", () => {
  it("separates the admin site from the kitchen console", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/kitchens/x")).toBe(true);
    expect(isAdminPath("/administrator")).toBe(false);
    expect(isAdminPath("/dashboard")).toBe(false);
    expect(expiredSessionRedirect("/admin/accounts")).toBe("/admin/login?error=expired");
    expect(expiredSessionRedirect("/dashboard/orders")).toBe("/login?error=expired");
  });

  it("lets the sign-in pages and the set-up link page render without a session", () => {
    expect(["/login", "/admin/login", "/account/setup"].every(isSignInPage)).toBe(true);
    expect(isSignInPage("/admin")).toBe(false);
    expect(isSignInPage("/login-help")).toBe(false);
  });

  it("ends an admin session after 4 hours, a console session after 12", () => {
    const now = Date.UTC(2026, 10, 16, 12);
    const fiveHoursAgo = String(now - 5 * 60 * 60 * 1000);
    expect(sessionStillValid(fiveHoursAgo, now)).toBe(true);
    expect(sessionStillValid(fiveHoursAgo, now, ADMIN_SESSION_MAX_AGE_MS)).toBe(false);
    expect(sessionStillValid(String(now - 60 * 60 * 1000), now, ADMIN_SESSION_MAX_AGE_MS)).toBe(true);
  });

  it("keeps administrators and customers out of the kitchen console", () => {
    expect(isKitchenRole("operator")).toBe(true);
    expect(isKitchenRole("phi")).toBe(true);
    expect(isKitchenRole("admin")).toBe(false);
    expect(isKitchenRole("customer")).toBe(false);
    expect(loginMessage("admin")).toMatch(/\/admin\/login/);
    expect(loginMessage("disabled")).toMatch(/disabled/);
    expect(adminLoginMessage("not_admin")).toMatch(/not an administrator/);
    expect(adminLoginMessage("<script>")).toBeUndefined();
  });

  it("highlights the right admin menu item", () => {
    expect(isAdminNavActive("/admin", "/admin")).toBe(true);
    expect(isAdminNavActive("/admin/kitchens", "/admin")).toBe(false);
    expect(isAdminNavActive("/admin/kitchens/abc", "/admin/kitchens")).toBe(true);
  });
});

describe("account set-up links", () => {
  it("accepts only invite and recovery links with a plausible token", () => {
    expect(parseSetupLink("a".repeat(56), "invite")).toEqual({ tokenHash: "a".repeat(56), type: "invite" });
    expect(parseSetupLink("b".repeat(56), "recovery")?.type).toBe("recovery");
    expect(parseSetupLink("b".repeat(56), "signup")).toBeNull();
    expect(parseSetupLink("short", "invite")).toBeNull();
    expect(parseSetupLink("abc'; drop table--xxxxxxxx", "invite")).toBeNull();
    expect(parseSetupLink(undefined, undefined)).toBeNull();
  });

  it("builds the link to this site's set-up page", () => {
    expect(setupLinkUrl("https://vk.example", "a".repeat(20), "invite")).toBe(
      `https://vk.example/account/setup?token_hash=${"a".repeat(20)}&type=invite`
    );
  });

  it("asks for a reasonable password", () => {
    expect(passwordProblem("short", "short")).toMatch(/10 characters/);
    expect(passwordProblem("aaaaaaaaaaaa", "aaaaaaaaaaaa")).toMatch(/harder to guess/);
    expect(passwordProblem("kitchen lights 42", "kitchen lights 43")).toMatch(/do not match/);
    expect(passwordProblem("😀".repeat(19), "😀".repeat(19))).toMatch(/too long/); // 76 bytes > bcrypt's 72
    expect(passwordProblem("kitchen lights 42", "kitchen lights 42")).toBeNull();
  });
});

describe("kitchen listing form", () => {
  const valid = {
    name: "Lake View Kitchen",
    location: "Kandy",
    timezone: "Asia/Colombo",
    cuisine: "Sri Lankan",
    description: "Rice and curry.",
    emoji: "🍛",
    delivery_fee_lkr: "250",
    prep_minutes: "25",
    opens_at: "09:00",
    closes_at: "21:00",
  };

  it("accepts a complete listing", () => {
    const parsed = parseListingForm(form(valid));
    expect(parsed.ok && parsed.value).toMatchObject({ name: "Lake View Kitchen", deliveryFeeLkr: 250, prepMinutes: 25 });
  });

  it("applies the same limits as the database", () => {
    const parsed = parseListingForm(
      form({ ...valid, name: "X", timezone: "Mars/Olympus", delivery_fee_lkr: "99999", prep_minutes: "2.5", opens_at: "25:00" })
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(Object.keys(parsed.fieldErrors).sort()).toEqual(
        ["delivery_fee_lkr", "name", "opens_at", "prep_minutes", "timezone"].sort()
      );
    }
  });

  it("describes opening hours like the app does", () => {
    expect(formatHours("08:00:00", "22:00:00")).toBe("08:00–22:00");
    expect(formatHours("00:00", "00:00")).toBe("Open 24 hours");
    expect(formatHours("18:00", "02:00")).toBe("18:00–02:00 (overnight)");
  });
});

describe("devices and go-live", () => {
  it("treats a device as reporting for 15 minutes after its last message", () => {
    const now = new Date("2026-11-16T12:00:00Z");
    expect(isReporting("2026-11-16T11:50:00Z", now)).toBe(true);
    expect(isReporting("2026-11-16T11:40:00Z", now)).toBe(false);
    expect(isReporting(null, now)).toBe(false);
  });

  it("gives the technician the exact IDs and topics", () => {
    const env = deviceSetup("kitchen-002", { id: "vk-env-02", type: "env_node" });
    expect(env.topics).toEqual(["vk/kitchen-002/vk-env-02/telemetry", "vk/kitchen-002/vk-env-02/status"]);
    expect(env.files[0].lines).toContain('#define KITCHEN_CODE "kitchen-002"');
    expect(env.files[1].lines).toContain("ENV_DEVICE_ID=vk-env-02");
    const cam = deviceSetup("kitchen-002", { id: "vk-cam-02", type: "camera" });
    expect(cam.files).toHaveLength(1);
    expect(cam.files[0].lines).toEqual(["KITCHEN_CODE=kitchen-002", "CAMERA_DEVICE_ID=vk-cam-02"]);
  });

  it("is ready only when every blocking check passes (warnings do not block)", () => {
    const item = (ok: boolean, blocking: boolean) => ({ item: "x", label: "x", ok, blocking, detail: "" });
    expect(readyToPublish([item(true, true), item(false, false)])).toBe(true);
    expect(readyToPublish([item(true, true), item(false, true)])).toBe(false);
    expect(readyToPublish([])).toBe(false);
  });
});

describe("staff accounts", () => {
  it("validates invitations", () => {
    expect(parseInviteForm(form({ email: " Ops@Kitchen.lk ", full_name: "Nimal Perera", role: "operator", kitchen_id: KITCHEN })))
      .toEqual({ ok: true, value: { email: "ops@kitchen.lk", fullName: "Nimal Perera", role: "operator", kitchenId: KITCHEN } });
    const missingKitchen = parseInviteForm(form({ email: "a@b.lk", full_name: "Nimal", role: "phi" }));
    expect(!missingKitchen.ok && missingKitchen.fieldErrors.kitchen_id).toBeTruthy();
    const admin = parseInviteForm(form({ email: "a@b.lk", full_name: "Nimal", role: "admin", kitchen_id: KITCHEN }));
    expect(admin.ok && admin.value.kitchenId).toBeNull();
    const bad = parseInviteForm(form({ email: "not-an-email", full_name: "N", role: "customer" }));
    expect(!bad.ok && Object.keys(bad.fieldErrors).sort()).toEqual(["email", "full_name", "kitchen_id", "role"]);
  });

  it("derives the account status", () => {
    expect(accountStatus({ disabled_at: "2026-11-16", email_confirmed_at: "x", last_sign_in_at: "x" })).toBe("disabled");
    expect(accountStatus({ disabled_at: null, email_confirmed_at: null, last_sign_in_at: null })).toBe("invited");
    expect(accountStatus({ disabled_at: null, email_confirmed_at: "x", last_sign_in_at: null })).toBe("active");
  });

  it("never lists customers and reads kitchen access defensively", () => {
    const row: AccountRow = {
      user_id: USER, email: "a@b.lk", full_name: null, role: "operator", disabled_at: null, invited_at: null,
      email_confirmed_at: "x", last_sign_in_at: null, created_at: "2026-11-16",
      kitchens: [{ id: KITCHEN, code: "kitchen-001", name: "K" }, "junk", null],
    };
    expect(toStaffAccount(row)?.kitchens).toEqual([{ id: KITCHEN, code: "kitchen-001", name: "K" }]);
    expect(toStaffAccount({ ...row, role: "customer" })).toBeNull();
  });
});

describe("AccountsService", () => {
  function repo(overrides: Partial<Record<keyof AccountsRepository, unknown>> = {}) {
    const calls: string[] = [];
    const base = {
      createInvitation: vi.fn(async () => ({ ok: true, userId: USER, tokenHash: "t".repeat(56) })),
      onboard: vi.fn(async () => ({ ok: true, value: undefined })),
      deleteLogin: vi.fn(async () => calls.push("deleteLogin")),
      list: vi.fn(async () => []),
      createPasswordLink: vi.fn(async () => ({ ok: true, userId: USER, tokenHash: "r".repeat(56) })),
      noteEvent: vi.fn(async (_u: string, a: string) => calls.push(a)),
      setDisabled: vi.fn(async () => ({ ok: true, value: undefined })),
      setLoginBanned: vi.fn(async () => true),
      ...overrides,
    };
    return { repository: base as unknown as AccountsRepository, base, calls };
  }
  const input = { email: "ops@kitchen.lk", fullName: "Nimal", role: "operator" as const, kitchenId: KITCHEN };

  it("invites: login, role and kitchen, then a one-time link to this site", async () => {
    const { repository, base } = repo();
    const result = await new AccountsService(repository, () => "https://vk.example").invite(input);
    expect(result?.ok).toBe(true);
    expect(result?.link?.url).toBe(`https://vk.example/account/setup?token_hash=${"t".repeat(56)}&type=invite`);
    expect(base.onboard).toHaveBeenCalledWith(USER, "operator", KITCHEN);
  });

  it("removes the new login again if its role cannot be set", async () => {
    const { repository, calls } = repo({ onboard: vi.fn(async () => ({ ok: false, message: "Kitchen not found." })) });
    const result = await new AccountsService(repository, () => "https://vk.example").invite(input);
    expect(result).toMatchObject({ ok: false, message: "Kitchen not found." });
    expect(calls).toContain("deleteLogin");
  });

  it("does not reuse an existing account (e.g. a customer's)", async () => {
    const { repository, base } = repo({
      createInvitation: vi.fn(async () => ({ ok: false, reason: "exists", message: "An account with this email address already exists." })),
    });
    const result = await new AccountsService(repository, () => "https://vk.example").invite(input);
    expect(result?.ok).toBe(false);
    expect(result?.fieldErrors?.email).toBeTruthy();
    expect(base.onboard).not.toHaveBeenCalled();
  });

  it("reports a missing SITE_URL before creating anything", async () => {
    const { AdminConfigError } = await import("@/config/server-env");
    const { repository, base } = repo();
    const result = await new AccountsService(repository, () => {
      throw new AdminConfigError("SITE_URL is not set.");
    }).invite(input);
    expect(result).toEqual({ ok: false, message: "SITE_URL is not set." });
    expect(base.createInvitation).not.toHaveBeenCalled();
  });

  it("issues reset links only for enabled staff and logs them", async () => {
    const row = (disabled: boolean): AccountRow => ({
      user_id: USER, email: "a@b.lk", full_name: "Nimal", role: "operator", disabled_at: disabled ? "x" : null,
      invited_at: null, email_confirmed_at: "x", last_sign_in_at: "x", created_at: "x", kitchens: [],
    });
    const enabled = repo({ list: vi.fn(async () => [row(false)]) });
    const ok = await new AccountsService(enabled.repository, () => "https://vk.example").issueLink(USER);
    expect(ok?.link?.purpose).toBe("reset");
    expect(ok?.link?.url).toContain("type=recovery");
    expect(enabled.calls).toContain("account.reset_link_issued");

    const disabled = repo({ list: vi.fn(async () => [row(true)]) });
    const refused = await new AccountsService(disabled.repository, () => "https://vk.example").issueLink(USER);
    expect(refused?.ok).toBe(false);
    expect(disabled.base.createPasswordLink).not.toHaveBeenCalled();
  });

  it("says so when the login could not be blocked (data access is already gone)", async () => {
    const { repository, calls } = repo({ setLoginBanned: vi.fn(async () => false) });
    const result = await new AccountsService(repository, () => "https://vk.example").setDisabled(USER, true);
    expect(result?.ok).toBe(true);
    expect(result?.message).toMatch(/could not be blocked/);
    expect(calls).toContain("account.login_ban_failed");
  });
});

describe("database messages and the activity log", () => {
  it("shows the database's own explanation only for deliberate refusals", () => {
    expect(explainedMessage({ code: "23514", message: "not ready to go live: Menu" })).toBe("Not ready to go live: Menu.");
    expect(explainedMessage({ code: "42501", message: "you cannot disable your own account" })).toBe(
      "You cannot disable your own account."
    );
    expect(explainedMessage({ code: "XX000", message: "internal stack trace" })).toBeNull();
    expect(explainedMessage({ message: "fetch failed" })).toBeNull();
  });

  it("summarises log entries in plain words", () => {
    const entry = (action: string, details: Record<string, unknown>) => ({
      id: 1, action, actorEmail: "a@b.lk", targetType: "kitchen", targetId: "x", targetLabel: "K", details, createdAt: "x",
    });
    expect(actionLabel("kitchen.published")).toBe("Put kitchen live");
    expect(activitySummary(entry("kitchen.updated", { opens_at: {}, delivery_fee_lkr: {} }))).toBe(
      "Changed opening time, delivery fee"
    );
    expect(activitySummary(entry("account.role_changed", { from: "operator", to: "phi" }))).toBe("operator → inspector");
    expect(activitySummary(entry("account.invited", { role: "operator", kitchen: "kitchen-002" }))).toBe(
      "operator at kitchen-002"
    );
  });
});
