"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/shared/components/ui/Brand";

import {
  MONITORING_NAV,
  SETTINGS_NAV,
  isActive,
  type NavItem,
} from "./navigation";

interface SidebarContentProps {
  /** Called after a link is chosen (the mobile drawer closes itself). */
  onNavigate?: () => void;
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
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
}

export default function SidebarContent({
  onNavigate,
}: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-20 shrink-0 flex-col justify-center gap-1 border-b border-slate-800 px-6">
        <BrandLogo tone="dark" compact height={34} />
        <p className="text-xs text-slate-400">Operator Console</p>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Monitoring
        </p>

        {MONITORING_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <NavLink item={SETTINGS_NAV} pathname={pathname} onNavigate={onNavigate} />
      </div>
    </>
  );
}
