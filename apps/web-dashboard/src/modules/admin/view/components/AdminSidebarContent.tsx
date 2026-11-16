"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/shared/components/ui/Brand";

import { ADMIN_NAV, isAdminNavActive } from "./admin-navigation";

export default function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <div className="flex h-20 shrink-0 flex-col justify-center gap-1 border-b border-slate-800 px-6">
        <BrandLogo tone="dark" compact height={34} />
        <p className="text-xs text-slate-400">Admin Console</p>
      </div>

      <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const active = isAdminNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-emerald-500/15 text-emerald-400" : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <p className="border-t border-slate-800 px-6 py-4 text-xs leading-5 text-slate-500">
        Changes here are recorded in the activity log.
      </p>
    </>
  );
}
