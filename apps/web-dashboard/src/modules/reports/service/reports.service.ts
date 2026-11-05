import type { KitchenSummary } from "@/modules/auth/model/session.model";

import type { ReportsData } from "../model/reports.model";
import { ReportsRepository } from "../repository/reports.repository";

const ENVIRONMENT_PERIOD_DAYS = 7;

export class ReportsService {
  constructor(
    private readonly reportsRepository = new ReportsRepository()
  ) {}

  async getReportsData(kitchen: KitchenSummary, now = new Date()): Promise<ReportsData> {
    const from = new Date(now.getTime() - ENVIRONMENT_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const [data, environmentalSummary] = await Promise.all([
      this.reportsRepository.getReportsData(),
      this.reportsRepository.environmentalSummary(kitchen.id, from, now),
    ]);

    return { ...data, environmentalSummary };
  }
}
