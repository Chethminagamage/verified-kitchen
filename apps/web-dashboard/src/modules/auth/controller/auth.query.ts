import { cache } from "react";

import { SessionRepository } from "../repository/session.repository";

const sessionRepository = new SessionRepository();

/**
 * The current operator session, de-duplicated per request so the layout,
 * header and pages can all call it without extra round trips.
 */
export const getCurrentSession = cache(() =>
  sessionRepository.getSession()
);
