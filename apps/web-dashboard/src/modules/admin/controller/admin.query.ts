import { cache } from "react";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";
import { ADMIN_SESSION_MAX_AGE_MS, sessionStillValid } from "@/modules/auth/model/auth.model";
import type { OperatorSession } from "@/modules/auth/model/session.model";

/**
 * The signed-in administrator, or null for anyone else (signed out, other
 * roles, disabled, or past the 4-hour admin session). Checked by the admin
 * layout AND again by every admin Server Action; the database checks a
 * third time inside each admin function.
 */
export const getAdminSession = cache(async (): Promise<OperatorSession | null> => {
  const session = await getCurrentSession();
  if (!session || session.disabled || session.role !== "admin") return null;
  if (!sessionStillValid(String(session.signedInAt), Date.now(), ADMIN_SESSION_MAX_AGE_MS)) return null;
  return session;
});
