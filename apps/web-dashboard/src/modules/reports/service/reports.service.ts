import { ReportsRepository } from "../repository/reports.repository";

export class ReportsService {
  constructor(
    private readonly reportsRepository =
      new ReportsRepository()
  ) {}

  async getReportsData() {
    return this.reportsRepository.getReportsData();
  }
}