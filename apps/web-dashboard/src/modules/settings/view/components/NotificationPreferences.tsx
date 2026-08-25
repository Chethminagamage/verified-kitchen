"use client";

import { useState } from "react";

import {
  Bell,
  BellRing,
  Mail,
  RadioTower,
} from "lucide-react";

import type {
  NotificationSettings,
} from "../../model/settings.model";

interface NotificationPreferencesProps {
  initialSettings: NotificationSettings;
}

interface ToggleRowProps {
  title: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
  icon: React.ComponentType<{
    className?: string;
  }>;
}

function ToggleRow({
  title,
  description,
  enabled,
  onChange,
  icon: Icon,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-0">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-900">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled
            ? "bg-emerald-500"
            : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            enabled
              ? "left-[22px]"
              : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function NotificationPreferences({
  initialSettings,
}: NotificationPreferencesProps) {
  const [settings, setSettings] =
    useState(initialSettings);

  function toggle(
    key: keyof NotificationSettings
  ) {
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="font-semibold text-slate-950">
          Notification Preferences
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Configure which monitoring events should generate
          notifications.
        </p>
      </div>

      <div className="mt-4">
        <ToggleRow
          title="Violation Alerts"
          description="Receive notifications when a hygiene violation is generated."
          enabled={settings.violationAlerts}
          onChange={() =>
            toggle("violationAlerts")
          }
          icon={Bell}
        />

        <ToggleRow
          title="Critical Alerts"
          description="Receive priority notifications for critical hygiene events."
          enabled={settings.criticalAlerts}
          onChange={() =>
            toggle("criticalAlerts")
          }
          icon={BellRing}
        />

        <ToggleRow
          title="Sensor Warnings"
          description="Receive notifications when environmental monitoring requires attention."
          enabled={settings.sensorWarnings}
          onChange={() =>
            toggle("sensorWarnings")
          }
          icon={RadioTower}
        />

        <ToggleRow
          title="Daily Summary"
          description="Receive a daily monitoring summary."
          enabled={settings.dailySummary}
          onChange={() =>
            toggle("dailySummary")
          }
          icon={Mail}
        />
      </div>

      <div className="mt-5 rounded-xl bg-amber-50 p-4">
        <p className="text-xs leading-5 text-amber-800">
          These controls are currently interface-only.
          Notification preferences will be persisted once the
          authentication and backend data layer are connected.
        </p>
      </div>
    </section>
  );
}