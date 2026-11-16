import { LockKeyhole, Mail } from "lucide-react";

import { BrandLogo } from "@/shared/components/ui/Brand";

import { adminLoginAction } from "../controller/admin-auth.controller";

import LoginSubmitButton from "./components/LoginSubmitButton";

interface AdminLoginViewProps {
  error?: string;
}

/** Sign-in page of the admin site: the console's look, reduced to a centred form. */
export default function AdminLoginView({ error }: AdminLoginViewProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandLogo tone="light" height={60} />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-emerald-600">Admin Console</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm text-slate-500">For platform administrators.</p>

          {error && (
            <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <form action={adminLoginAction} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative mt-2">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <LoginSubmitButton />
          </form>
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          Kitchen staff sign in at{" "}
          <a href="/login" className="font-medium text-slate-600 hover:text-slate-900">
            /login
          </a>
        </p>
      </div>
    </main>
  );
}
