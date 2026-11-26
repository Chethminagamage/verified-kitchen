import {
  Building2,
  LayoutDashboard,
  MessageSquareWarning,
  ScrollText,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Kitchens", href: "/admin/kitchens", icon: Building2 },
  { name: "Staff accounts", href: "/admin/accounts", icon: UsersRound },
  { name: "Customer reports", href: "/admin/reports", icon: MessageSquareWarning },
  { name: "Activity log", href: "/admin/activity", icon: ScrollText },
];

/** "/admin" matches only itself; other items also match their sub-pages. */
export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
