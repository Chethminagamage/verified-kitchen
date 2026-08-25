import { HygieneRepository } from "../repository/hygiene.repository";

export class HygieneService {
  constructor(
    private readonly hygieneRepository = new HygieneRepository()
  ) {}

  async getMonitoringData() {
    return this.hygieneRepository.getHygieneMonitoringData();
  }
}