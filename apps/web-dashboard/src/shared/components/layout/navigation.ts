import type { UserRole } from "@/modules/auth/model/session.model";
import {
  Blocks,
  FileChartColumn,
  LayoutDashboard,
  ReceiptText,
  ScanLine,
  Settings,
  ShieldCheck,
  Thermometer,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

export const MONITORING_NAV: readonly NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Hygiene Monitoring", href: "/dashboard/hygiene", icon: ShieldCheck },
  { name: "Environment", href: "/dashboard/environment", icon: Thermometer },
  { name: "AI Monitoring", href: "/dashboard/ai-monitoring", icon: ScanLine },
  { name: "Violations", href: "/dashboard/violations", icon: TriangleAlert },
  { name: "Audit Trail", href: "/dashboard/audit", icon: Blocks },
  { name: "Reports", href: "/dashboard/reports", icon: FileChartColumn },
];

export const ORDERS_NAV: NavItem = { name: "Orders", href: "/dashboard/orders", icon: ReceiptText };

/**
 * Whether a role may open the Orders page. Customer orders are not part of a
 * hygiene inspection, so inspectors (PHI) do not see them.
 */
export function canSeeOrders(role: UserRole): boolean {
  return role === "operator" || role === "admin";
}

/** Sidebar sections for a role: hygiene monitoring first, kitchen operations apart. */
export function navGroupsFor(role: UserRole): NavGroup[] {
  const groups: NavGroup[] = [{ label: "Monitoring", items: MONITORING_NAV }];
  if (canSeeOrders(role)) groups.push({ label: "Kitchen", items: [ORDERS_NAV] });
  return groups;
}

export const SETTINGS_NAV: NavItem = {
  name: "Settings",
  href: "/dashboard/settings",
  icon: Settings,
};

/**
 * Whether a nav item is the current page. "/dashboard" only matches itself;
 * other items also match their sub-pages, but not look-alike prefixes
 * ("/dashboard/audit" does not match "/dashboard/auditors").
 */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
