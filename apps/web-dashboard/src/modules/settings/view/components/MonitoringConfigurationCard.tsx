import type { ComponentType } from "react";

import {
  BrainCircuit,
  Blocks,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  CircleCheck,
} from "lucide-react";

import type {
  MonitoringConfiguration,
} from "../../model/settings.model";

interface MonitoringConfigurationCardProps {
  configuration: MonitoringConfiguration;
}

interface StatusRowProps {
  label: string;
  enabled: boolean;
  icon: React.ComponentType<{
    className?: string;
  }>;
}

function StatusRow({
  label,
  enabled,
  icon: Icon,
}: StatusRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-slate-500" />

        <span className="text-sm font-medium text-slate-800">
          {label}
        </span>
      </div>

      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
          enabled
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-200 text-slate-600"
        }`}
      >
        {enabled && (
          <CircleCheck className="h-3.5 w-3.5" />
        )}

        {enabled ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}

export default function MonitoringConfigurationCard({
  configuration,
}: MonitoringConfigurationCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="font-semibold text-slate-950">
          Monitoring Configuration
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Current system monitoring configuration.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <StatusRow
          label="AI Monitoring"
          enabled={configuration.aiMonitoringEnabled}
          icon={BrainCircuit}
        />

        <StatusRow
          label="Environmental Monitoring"
          enabled={
            configuration.environmentalMonitoringEnabled
          }
          icon={RadioTower}
        />

        <StatusRow
          label="Blockchain Audit Logging"
          enabled={configuration.auditLoggingEnabled}
          icon={Blocks}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-slate-400" />

            <p className="text-xs font-medium text-slate-500">
              Score Refresh
            </p>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {configuration.scoreRefreshInterval}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400" />

            <p className="text-xs font-medium text-slate-500">
              Privacy Mode
            </p>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {configuration.privacyMode}
          </p>
        </div>
      </div>
    </section>
  );
}