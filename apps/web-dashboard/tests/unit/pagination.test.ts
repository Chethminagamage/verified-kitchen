import { describe, expect, it } from "vitest";

import { paginate, parsePage } from "@/shared/utils/pagination";

const items = Array.from({ length: 32 }, (_, i) => i + 1); // 1..32

describe("paginate", () => {
  it("cuts the requested page and describes it", () => {
    expect(paginate(items, 1, 15)).toEqual({
      items: items.slice(0, 15),
      page: 1,
      pageCount: 3,
      total: 32,
      first: 1,
      last: 15,
    });
    const third = paginate(items, 3, 15);
    expect(third.items).toEqual([31, 32]);
    expect([third.first, third.last]).toEqual([31, 32]);
  });

  it("shows the last page when asked for one past the end (e.g. after the list shrank)", () => {
    const page = paginate(items, 9, 15);
    expect(page.page).toBe(3);
    expect(page.items).toEqual([31, 32]);
  });

  it("treats page numbers below 1 as page 1", () => {
    expect(paginate(items, 0, 15).page).toBe(1);
    expect(paginate(items, -4, 15).page).toBe(1);
  });

  it("describes an empty list as one empty page", () => {
    expect(paginate([], 1, 15)).toEqual({ items: [], page: 1, pageCount: 1, total: 0, first: 0, last: 0 });
  });

  it("refuses a page size below 1", () => {
    expect(() => paginate(items, 1, 0)).toThrow();
  });
});

describe("parsePage", () => {
  it("reads a positive whole number from the address", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["2", "5"])).toBe(2);
  });

  it("falls back to page 1 for missing or invalid values", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
  });

  it("caps absurdly large values", () => {
    expect(parsePage("99999999")).toBe(10_000);
  });
});
