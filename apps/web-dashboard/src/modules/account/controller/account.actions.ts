"use server";

import { refresh } from "next/cache";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";

import type { AccountActionState } from "../model/account.model";
import { AccountService } from "../service/account.service";

const accountService = new AccountService();

/** Saves the signed-in user's name and phone (form fields: fullName, phone). */
export async function updateProfileAction(_previous: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const result = await accountService.updateProfile(await getCurrentSession(), formData);
  // The header shows the name, so re-render the page with the saved values.
  if (result?.ok) refresh();
  return result;
}

/** Changes the password after re-checking the current one (currentPassword, newPassword, confirmPassword, signOutOthers). */
export async function changePasswordAction(_previous: AccountActionState, formData: FormData): Promise<AccountActionState> {
  return accountService.changePassword(await getCurrentSession(), formData);
}

/** Ends the user's sessions on every other device. */
export async function signOutOtherDevicesAction(): Promise<AccountActionState> {
  return accountService.signOutOtherDevices(await getCurrentSession());
}
