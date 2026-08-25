"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  ShieldCheck,
  Thermometer,
  ScanLine,
  TriangleAlert,
  Blocks,
  FileChartColumn,
  Settings,
  ChefHat,
} from "lucide-react";

const navigation = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Hygiene Monitoring",
    href: "/dashboard/hygiene",
    icon: ShieldCheck,
  },
  {
    name: "Environment",
    href: "/dashboard/environment",
    icon: Thermometer,
  },
  {
    name: "AI Monitoring",
    href: "/dashboard/ai-monitoring",
    icon: ScanLine,
  },
  {
    name: "Violations",
    href: "/dashboard/violations",
    icon: TriangleAlert,
  },
  {
    name: "Audit Trail",
    href: "/dashboard/audit",
    icon: Blocks,
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: FileChartColumn,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-800 bg-slate-950 lg:flex lg:flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
          <ChefHat className="h-6 w-6 text-white" />
        </div>

        <div>
          <p className="font-semibold tracking-tight text-white">
            Verified Kitchen
          </p>
          <p className="text-xs text-slate-400">
            Operator Console
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Monitoring
        </p>

        {navigation.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </aside>
  );
}