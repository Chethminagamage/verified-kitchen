import type {
  KitchenSummary,
  OperatorSession,
} from "@/modules/auth/model/session.model";

import { parseFilters } from "../model/violation.model";
import { ViolationService } from "../service/violation.service";

const violationService = new ViolationService();

export async function getViolationPage(
  session: OperatorSession,
  kitchen: KitchenSummary,
  searchParams: Record<string, string | string[] | undefined>
) {
  return violationService.getPage(
    session,
    kitchen.id,
    kitchen.timezone,
    parseFilters(searchParams)
  );
}
