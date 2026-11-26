"use server";

import { refresh } from "next/cache";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";

import type { ViolationActionState } from "../model/violation.model";
import { ViolationService } from "../service/violation.service";

const violationService = new ViolationService();

/** Acknowledge or resolve a violation (form fields: id, status). */
export async function changeViolationStatusAction(
  _previous: ViolationActionState,
  formData: FormData
): Promise<ViolationActionState> {
  const session = await getCurrentSession();

  const result = await violationService.changeStatus(
    session,
    formData.get("id"),
    formData.get("status")
  );

  // Refresh on conflicts too, so the user sees the current state.
  refresh();

  return result;
}
