import { DashboardRepository } from "../repository/dashboard.repository";

export class DashboardService {
  constructor(
    private readonly dashboardRepository = new DashboardRepository()
  ) {}

  async getDashboardOverview() {
    return this.dashboardRepository.getOverview();
  }
}