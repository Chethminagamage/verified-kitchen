"use server";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";

import type { ChainCheck } from "../model/audit.model";
import { AuditService } from "../service/audit.service";

const auditService = new AuditService();

export type VerifyChainState = { ok: true; check: ChainCheck } | { ok: false; message: string } | null;

/** Re-runs the tamper check on demand (any signed-in user with kitchen access). */
export async function verifyChainAction(): Promise<VerifyChainState> {
  const session = await getCurrentSession();
  if (!session?.kitchen) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  try {
    return { ok: true, check: await auditService.verify(session.kitchen.id) };
  } catch (error) {
    console.error("chain verification failed:", error);
    return { ok: false, message: "Could not run the check. Please try again." };
  }
}
