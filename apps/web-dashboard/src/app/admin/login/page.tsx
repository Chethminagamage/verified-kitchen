import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/modules/admin/controller/admin.query";
import { adminLoginMessage } from "@/modules/auth/model/auth.model";
import AdminLoginView from "@/modules/auth/view/AdminLoginView";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getAdminSession()) {
    redirect("/admin");
  }
  const { error } = await searchParams;
  return <AdminLoginView error={adminLoginMessage(error)} />;
}
