"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { UserRole } from "@/modules/auth/model/session.model";
import { BrandLogo } from "@/shared/components/ui/Brand";

import {
  SETTINGS_NAV,
  isActive,
  navGroupsFor,
  type NavItem,
} from "./navigation";

interface SidebarContentProps {
  role: UserRole;
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
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-emerald-500/10 text-emerald-300"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-emerald-400" aria-hidden />}
      <Icon className={`h-[18px] w-[18px] ${active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"}`} />
      {item.name}
    </Link>
  );
}

export default function SidebarContent({
  role,
  onNavigate,
}: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-20 shrink-0 flex-col justify-center gap-1 border-b border-slate-800 px-6">
        <BrandLogo tone="dark" compact height={34} />
        <p className="text-xs text-slate-400">Operator Console</p>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
        {navGroupsFor(role).map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {group.label}
            </p>
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <NavLink item={SETTINGS_NAV} pathname={pathname} onNavigate={onNavigate} />
      </div>
    </>
  );
}
