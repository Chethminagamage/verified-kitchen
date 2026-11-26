import { describe, expect, it } from "vitest";

import { normalizePhone, parsePasswordForm, parseProfileForm } from "@/modules/account/model/account.model";
import { DEFAULT_ALERT_PREFS, alertHeading, parseAlertPrefs, shouldAlert } from "@/modules/alerts/model/alerts.model";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

describe("normalizePhone", () => {
  it("accepts common ways of writing a number and tidies spacing", () => {
    expect(normalizePhone("+94 77 123 4567")).toBe("+94 77 123 4567");
    expect(normalizePhone("  077-123-4567 ")).toBe("077-123-4567");
    expect(normalizePhone("(081)  222 3344")).toBe("(081) 222 3344");
  });

  it("treats an empty field as 'no number'", () => {
    expect(normalizePhone("   ")).toBeNull();
  });

  it("rejects letters and numbers with too few or too many digits", () => {
    expect(normalizePhone("call me")).toBeUndefined();
    expect(normalizePhone("12345")).toBeUndefined();
    expect(normalizePhone("1234567890123456")).toBeUndefined();
  });
});

describe("parseProfileForm", () => {
  it("returns the tidied name and phone", () => {
    expect(parseProfileForm(form({ fullName: "  Nimal   Perera ", phone: "+94 77 123 4567" }))).toEqual({
      ok: true,
      value: { fullName: "Nimal Perera", phone: "+94 77 123 4567" },
    });
  });

  it("allows clearing the phone number", () => {
    expect(parseProfileForm(form({ fullName: "Nimal", phone: "" }))).toEqual({ ok: true, value: { fullName: "Nimal", phone: null } });
  });

  it("explains each invalid field", () => {
    const result = parseProfileForm(form({ fullName: "N", phone: "abc" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.fieldErrors).sort()).toEqual(["fullName", "phone"]);
  });
});

describe("parsePasswordForm", () => {
  const strong = "correct horse battery";

  it("accepts a valid change and reads the 'sign out others' choice", () => {
    expect(
      parsePasswordForm(form({ currentPassword: "old-password-1", newPassword: strong, confirmPassword: strong, signOutOthers: "on" })),
    ).toEqual({ ok: true, value: { currentPassword: "old-password-1", newPassword: strong, signOutOthers: true } });
  });

  it("requires the current password", () => {
    const r = parsePasswordForm(form({ currentPassword: "", newPassword: strong, confirmPassword: strong }));
    expect(!r.ok && r.fieldErrors.currentPassword).toBeTruthy();
  });

  it("puts strength problems on the new password and a mismatch on the confirmation", () => {
    const short = parsePasswordForm(form({ currentPassword: "x", newPassword: "short", confirmPassword: "short" }));
    expect(!short.ok && short.fieldErrors.newPassword).toBeTruthy();
    const mismatch = parsePasswordForm(form({ currentPassword: "x", newPassword: strong, confirmPassword: `${strong}!` }));
    expect(!mismatch.ok && mismatch.fieldErrors.confirmPassword).toBe("The two passwords do not match.");
  });

  it("refuses reusing the current password", () => {
    const r = parsePasswordForm(form({ currentPassword: strong, newPassword: strong, confirmPassword: strong }));
    expect(!r.ok && r.fieldErrors.newPassword).toMatch(/different/);
  });
});

describe("desktop alert preferences", () => {
  it("falls back to the defaults for missing or corrupt saved values", () => {
    expect(parseAlertPrefs(null)).toEqual(DEFAULT_ALERT_PREFS);
    expect(parseAlertPrefs("{not json")).toEqual(DEFAULT_ALERT_PREFS);
    expect(parseAlertPrefs('"text"')).toEqual(DEFAULT_ALERT_PREFS);
    expect(parseAlertPrefs('{"enabled":"yes","sound":false}')).toEqual({ ...DEFAULT_ALERT_PREFS, sound: false });
  });

  it("alerts for critical always and high only when chosen, never when off", () => {
    const on = { enabled: true, includeHigh: false, sound: true };
    expect(shouldAlert(on, "critical")).toBe(true);
    expect(shouldAlert(on, "high")).toBe(false);
    expect(shouldAlert({ ...on, includeHigh: true }, "high")).toBe(true);
    expect(shouldAlert({ ...on, includeHigh: true }, "medium")).toBe(false);
    expect(shouldAlert({ ...on, enabled: false }, "critical")).toBe(false);
  });

  it("names the alert by severity", () => {
    expect(alertHeading("critical")).toBe("Critical hygiene problem");
    expect(alertHeading("high")).toBe("High-severity hygiene problem");
  });
});
