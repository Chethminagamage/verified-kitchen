import { describe, expect, it } from "vitest";

import { NOTIFICATIONS_SHOWN, notificationHref } from "@/modules/system-status/model/system-status.model";
import { PAGE_SIZE } from "@/modules/violations/model/violation.model";

describe("notification centre", () => {
  it("links each notification to its row on the Violations page", () => {
    expect(notificationHref("3f2a")).toBe("/dashboard/violations#violation-3f2a");
  });

  it("never lists more than fit on the Violations page's first page, so every row can be scrolled to", () => {
    // Both lists show open violations newest first; the header shows the first NOTIFICATIONS_SHOWN.
    expect(NOTIFICATIONS_SHOWN).toBeLessThanOrEqual(PAGE_SIZE);
  });
});
