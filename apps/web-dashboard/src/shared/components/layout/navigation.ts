import {
  Blocks,
  FileChartColumn,
  LayoutDashboard,
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

export const MONITORING_NAV: readonly NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Hygiene Monitoring", href: "/dashboard/hygiene", icon: ShieldCheck },
  { name: "Environment", href: "/dashboard/environment", icon: Thermometer },
  { name: "AI Monitoring", href: "/dashboard/ai-monitoring", icon: ScanLine },
  { name: "Violations", href: "/dashboard/violations", icon: TriangleAlert },
  { name: "Audit Trail", href: "/dashboard/audit", icon: Blocks },
  { name: "Reports", href: "/dashboard/reports", icon: FileChartColumn },
];

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
