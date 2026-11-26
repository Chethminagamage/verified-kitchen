import { ShieldX } from "lucide-react";

import { logoutAction } from "@/modules/auth/controller/auth.controller";

interface StaffOnlyProps {
  email: string;
  /** Why this account may not use the page. */
  reason: "customer" | "disabled" | "not_admin";
}

const TEXT: Record<StaffOnlyProps["reason"], { title: string; body: (email: string) => string }> = {
  customer: {
    title: "This console is for kitchen staff",
    body: (email) =>
      `${email} is a customer account. Use the Verified Kitchen mobile app to browse kitchens and order food.`,
  },
  disabled: {
    title: "This account has been disabled",
    body: (email) => `${email} can no longer sign in. Contact your Verified Kitchen administrator.`,
  },
  not_admin: {
    title: "Administrators only",
    body: (email) => `${email} is not an administrator account. Kitchen staff use the kitchen console.`,
  },
};

/** Shown instead of a page when the signed-in account may not use it. */
export default function StaffOnly({ email, reason }: StaffOnlyProps) {
  const text = TEXT[reason];
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <ShieldX className="h-6 w-6 text-slate-500" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">{text.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{text.body(email)}</p>
        <form action={logoutAction} className="mt-6">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
