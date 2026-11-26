/** Same codes and wording as the customer app (OrderProblem). */
export const PROBLEM_LABELS: Record<string, string> = {
  late: "Arrived late",
  cold: "Food was cold",
  wrong_items: "Wrong items",
  missing_items: "Missing items",
  hygiene_concern: "Hygiene concern",
  other: "Something else",
};

export type ReportFilter = "hygiene" | "all";

export function parseReportFilter(value: unknown): ReportFilter {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "all" ? "all" : "hygiene";
}

/** A customer report: a problem, or a low (1–2 star) rating. */
export interface CustomerReport {
  orderId: string;
  orderReference: string;
  kitchenId: string;
  kitchenName: string;
  rating: number | null;
  problem: string | null;
  problemLabel: string | null;
  comment: string | null;
  createdAt: string;
  isHygiene: boolean;
}

export const REPORT_WINDOW_DAYS = 30;
