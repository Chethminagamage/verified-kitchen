import { describe, expect, it } from "vitest";

import { SESSION_MAX_AGE_MS, loginMessage, sessionStillValid } from "@/modules/auth/model/auth.model";

describe("session policy", () => {
  const now = Date.parse("2026-11-13T08:00:00Z");

  it("accepts a sign-in within the shift", () => {
    expect(sessionStillValid(String(now - 60_000), now)).toBe(true);
    expect(sessionStillValid(String(now - SESSION_MAX_AGE_MS), now)).toBe(true);
  });

  it("ends the session after 12 hours", () => {
    expect(sessionStillValid(String(now - SESSION_MAX_AGE_MS - 1), now)).toBe(false);
  });

  it("treats a missing or malformed marker as signed out", () => {
    expect(sessionStillValid(undefined, now)).toBe(false); // browser was closed
    expect(sessionStillValid("", now)).toBe(false);
    expect(sessionStillValid("abc", now)).toBe(false);
    expect(sessionStillValid("-5", now)).toBe(false);
    expect(sessionStillValid("1e15", now)).toBe(false);
  });

  it("rejects a sign-in time far in the future (tampered cookie)", () => {
    expect(sessionStillValid(String(now + 60 * 60 * 1000), now)).toBe(false);
    expect(sessionStillValid(String(now + 30_000), now)).toBe(true); // small clock skew is fine
  });
});

describe("login messages", () => {
  it("shows only known messages, never text from the URL", () => {
    expect(loginMessage("invalid")).toBe("Invalid email or password.");
    expect(loginMessage("expired")).toMatch(/session has ended/);
    expect(loginMessage("Your account is locked, call 077…")).toBeUndefined();
    expect(loginMessage("toString")).toBeUndefined();
    expect(loginMessage(undefined)).toBeUndefined();
    expect(loginMessage(["expired", "invalid"])).toMatch(/session has ended/);
  });
});
