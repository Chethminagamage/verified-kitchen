import { toActivity } from "@/modules/admin-kitchens/service/kitchens.service";

import type { ActivityEntry } from "../model/activity.model";
import { ActivityRepository } from "../repository/activity.repository";

export class ActivityService {
  constructor(private readonly repository = new ActivityRepository()) {}

  async latest(limit = 200): Promise<ActivityEntry[]> {
    return (await this.repository.latest(limit)).map(toActivity);
  }
}
