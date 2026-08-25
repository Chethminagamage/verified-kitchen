import {
  Blocks,
  BrainCircuit,
  Database,
  Laptop,
  Package,
  RefreshCw,
} from "lucide-react";

import type {
  SystemInformation,
} from "../../model/settings.model";

interface SystemInformationCardProps {
  system: SystemInformation;
}

export default function SystemInformationCard({
  system,
}: SystemInformationCardProps) {
  const rows = [
    {
      label: "Application Version",
      value: system.applicationVersion,
      icon: Package,
    },
    {
      label: "AI Model",
      value: system.aiModel,
      icon: BrainCircuit,
    },
    {
      label: "Edge Device",
      value: system.edgeDevice,
      icon: Laptop,
    },
    {
      label: "Operational Database",
      value: system.database,
      icon: Database,
    },
    {
      label: "Blockchain Platform",
      value: system.blockchainPlatform,
      icon: Blocks,
    },
    {
      label: "Last Sync",
      value: system.lastSync,
      icon: RefreshCw,
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="font-semibold text-slate-950">
          System Information
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Current Verified Kitchen application and technology
          configuration.
        </p>
      </div>

      <div className="mt-6 divide-y divide-slate-100">
        {rows.map((row) => {
          const Icon = row.icon;

          return (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-slate-400" />

                <span className="text-sm text-slate-600">
                  {row.label}
                </span>
              </div>

              <span className="text-right text-sm font-medium text-slate-900">
                {row.value}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}