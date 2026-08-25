import {
  Bell,
  CircleUserRound,
  Wifi,
} from "lucide-react";

export default function TopHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm text-slate-500">
          Kitchen Operations
        </p>

        <h1 className="text-lg font-semibold text-slate-900">
          Monitoring Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 sm:flex">
          <Wifi className="h-4 w-4" />
          System Online
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        >
          <Bell className="h-5 w-5" />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <CircleUserRound className="h-9 w-9 text-slate-400" />

          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-900">
              Kitchen Operator
            </p>

            <p className="text-xs text-slate-500">
              Operator
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}