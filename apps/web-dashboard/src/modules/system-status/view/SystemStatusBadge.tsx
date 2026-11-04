import { Wifi, WifiOff } from "lucide-react";

import type {
  ConnectionState,
  SystemStatus,
} from "../model/system-status.model";

const STYLES: Record<
  ConnectionState,
  { label: string; className: string }
> = {
  online: {
    label: "System Online",
    className: "bg-emerald-50 text-emerald-700",
  },
  degraded: {
    label: "Partially Online",
    className: "bg-amber-50 text-amber-700",
  },
  offline: {
    label: "Devices Offline",
    className: "bg-slate-100 text-slate-600",
  },
};

interface SystemStatusBadgeProps {
  status: SystemStatus;
}

export default function SystemStatusBadge({
  status,
}: SystemStatusBadgeProps) {
  const style = STYLES[status.state];
  const Icon =
    status.state === "offline" ? WifiOff : Wifi;

  return (
    <div
      title={`${status.onlineDevices} of ${status.totalDevices} devices reporting`}
      className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium sm:flex ${style.className}`}
    >
      <Icon className="h-4 w-4" />
      {style.label}
    </div>
  );
}
