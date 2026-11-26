import type { KitchenSummary } from "@/modules/auth/model/session.model";

import { HygieneService } from "../service/hygiene.service";

const hygieneService = new HygieneService();

export async function getHygienePage(kitchen: KitchenSummary) {
  return hygieneService.getPage(kitchen.id, kitchen.timezone);
}
