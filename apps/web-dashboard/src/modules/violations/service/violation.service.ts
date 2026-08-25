import { ViolationRepository } from "../repository/violation.repository";

export class ViolationService {
  constructor(
    private readonly violationRepository =
      new ViolationRepository()
  ) {}

  async getViolationData() {
    return this.violationRepository.getViolationData();
  }
}