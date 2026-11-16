import { TriangleAlert } from "lucide-react";

import { BrandLogo } from "@/shared/components/ui/Brand";

import { SETUP_MESSAGES, type SetupLink } from "../model/setup.model";

import SetupPasswordForm from "./components/SetupPasswordForm";

/** Landing page of an invitation or password-reset link. */
export default function AccountSetupView({ link }: { link: SetupLink | null }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <BrandLogo tone="light" height={52} />
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {link ? (
            <>
              <p className="text-sm font-medium text-emerald-600">
                {link.type === "invite" ? "Welcome to Verified Kitchen" : "Verified Kitchen account"}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                {link.type === "invite" ? "Set up your account" : "Choose a new password"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose the password you will use to sign in. This link works once.
              </p>
              <SetupPasswordForm link={link} />
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                <TriangleAlert className="h-6 w-6 text-amber-600" />
              </div>
              <h1 className="mt-4 text-lg font-semibold text-slate-900">Link not valid</h1>
              <p className="mt-2 text-sm text-slate-600">{SETUP_MESSAGES.invalidLink}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
