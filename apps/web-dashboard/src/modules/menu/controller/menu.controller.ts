import "server-only";

import type { KitchenSummary, OperatorSession } from "@/modules/auth/model/session.model";

import type { MenuPage } from "../model/menu.model";
import { MenuService } from "../service/menu.service";

const menuService = new MenuService();

export async function getMenuPage(session: OperatorSession, kitchen: KitchenSummary): Promise<MenuPage> {
  return menuService.getPage(session, kitchen.id);
}
