import type {
  SettingsData,
} from "../model/settings.model";

import KitchenProfileCard from "./components/KitchenProfileCard";
import MonitoringConfigurationCard from "./components/MonitoringConfigurationCard";
import NotificationPreferences from "./components/NotificationPreferences";
import SystemInformationCard from "./components/SystemInformationCard";

interface SettingsViewProps {
  data: SettingsData;
}

export default function SettingsView({
  data,
}: SettingsViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-600">
          System Configuration
        </p>

        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Settings
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Review kitchen information, monitoring
          configuration, notification preferences and system
          details.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <KitchenProfileCard
          profile={data.kitchenProfile}
        />

        <MonitoringConfigurationCard
          configuration={data.monitoring}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <NotificationPreferences
          initialSettings={data.notifications}
        />

        <SystemInformationCard
          system={data.system}
        />
      </div>
    </div>
  );
}