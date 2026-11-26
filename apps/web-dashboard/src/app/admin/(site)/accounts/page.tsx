import type { Metadata } from "next";

import { getAdminSession } from "@/modules/admin/controller/admin.query";
import { AccountsService } from "@/modules/admin-accounts/service/accounts.service";
import AccountsView from "@/modules/admin-accounts/view/AccountsView";

export const metadata: Metadata = {
  title: "Staff accounts",
};

export default async function AdminAccountsPage() {
  const session = await getAdminSession();
  if (!session) return null; // the layout redirects
  const accounts = await new AccountsService().list();
  return <AccountsView accounts={accounts} currentUserId={session.userId} />;
}
