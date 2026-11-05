import type { KitchenSummary } from "@/modules/auth/model/session.model";

import { parseRange } from "../model/environment.model";
import { EnvironmentService } from "../service/environment.service";

const environmentService = new EnvironmentService();

export async function getEnvironmentPage(
  kitchen: KitchenSummary,
  searchParams: Record<string, string | string[] | undefined>
) {
  return environmentService.getPage(kitchen.id, kitchen.timezone, parseRange(searchParams.range));
}
