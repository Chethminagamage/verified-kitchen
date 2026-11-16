import { orderReference } from "@/modules/orders/model/orders.model";

import { PROBLEM_LABELS, REPORT_WINDOW_DAYS, type CustomerReport, type ReportFilter } from "../model/reports.model";
import { ReportsRepository } from "../repository/reports.repository";

export class ReportsService {
  constructor(private readonly repository = new ReportsRepository()) {}

  async list(filter: ReportFilter, now = new Date()): Promise<CustomerReport[]> {
    const from = new Date(now.getTime() - REPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const [rows, names] = await Promise.all([
      this.repository.since(from, filter === "hygiene"),
      this.repository.kitchenNames(),
    ]);
    return rows.map((r) => ({
      orderId: r.order_id,
      orderReference: orderReference(r.order_id),
      kitchenId: r.kitchen_id,
      kitchenName: names.get(r.kitchen_id) ?? "Unknown kitchen",
      rating: r.rating,
      problem: r.problem,
      problemLabel: r.problem ? (PROBLEM_LABELS[r.problem] ?? r.problem) : null,
      comment: r.comment,
      createdAt: r.created_at,
      isHygiene: r.problem === "hygiene_concern",
    }));
  }
}
