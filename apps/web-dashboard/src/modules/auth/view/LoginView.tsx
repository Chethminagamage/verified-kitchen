import {
  ChefHat,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { loginAction } from "../controller/auth.controller";

import LoginSubmitButton from "./components/LoginSubmitButton";

interface LoginViewProps {
  error?: string;
}

export default function LoginView({
  error,
}: LoginViewProps) {
  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500">
            <ChefHat className="h-6 w-6" />
          </div>

          <div>
            <p className="font-semibold">
              Verified Kitchen
            </p>

            <p className="text-xs text-slate-400">
              Hygiene Intelligence Platform
            </p>
          </div>
        </div>

        <div className="max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Operator Console
          </p>

          <h1 className="mt-4 text-4xl font-bold leading-tight">
            Real-time hygiene monitoring
            built for accountable kitchens.
          </h1>

          <p className="mt-5 leading-7 text-slate-400">
            Monitor AI hygiene evidence,
            environmental conditions,
            violations and tamper-aware audit
            records from one secure dashboard.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Three-pillar hygiene monitoring
            </div>

            <div className="flex items-center gap-3 text-sm text-slate-300">
              <EyeOff className="h-5 w-5 text-emerald-400" />
              Privacy-preserving edge AI
            </div>

            <div className="flex items-center gap-3 text-sm text-slate-300">
              <LockKeyhole className="h-5 w-5 text-emerald-400" />
              Secured operator access
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600">
          Verified Kitchen Prototype
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <ChefHat className="h-5 w-5" />
              </div>

              <p className="font-semibold text-slate-950">
                Verified Kitchen
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-emerald-600">
              Welcome back
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Sign in to your dashboard
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter your authorised operator
              account credentials.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form
            action={loginAction}
            className="mt-8 space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-700"
              >
                Email address
              </label>

              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="operator@example.com"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <div className="relative mt-2">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </div>

            <LoginSubmitButton />
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Access is restricted to authorised
            Verified Kitchen operators.
          </p>
        </div>
      </section>
    </main>
  );
}