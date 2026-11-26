"use client";

import { BellRing } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { buttonClass } from "@/shared/components/form/button-styles";
import { Panel, PanelFooter, PanelHeader } from "@/shared/components/ui/Panel";
import StatusPill from "@/shared/components/ui/StatusPill";

import { alertHeading } from "../model/alerts.model";
import { notificationsSupported, playChime, saveAlertPrefs, useAlertPrefs } from "./alert-prefs-store";

type Permission = NotificationPermission | "unsupported";

const noop = () => () => {};
const readPermission = (): Permission => (notificationsSupported() ? Notification.permission : "unsupported");

function Switch({
  id,
  checked,
  disabled,
  onChange,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className={`text-sm font-medium ${disabled ? "text-slate-400" : "text-slate-900"}`}>
          {label}
        </label>
        <p id={`${id}-desc`} className="mt-0.5 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-desc`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-emerald-500" : "bg-slate-200"
        }`}
      >
        <span
          aria-hidden
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

/** Settings card: turn desktop alerts on for this device, choose what alerts, and send a test. */
export default function DesktopAlertsCard() {
  const prefs = useAlertPrefs();
  // The permission can change when the user answers the browser's prompt, so it is re-read after asking.
  const initialPermission = useSyncExternalStore(noop, readPermission, () => "default" as Permission);
  const [asked, setAsked] = useState<Permission | null>(null);
  const permission = asked ?? initialPermission;

  async function enable() {
    if (permission === "unsupported") return;
    const result = permission === "granted" ? "granted" : await Notification.requestPermission();
    setAsked(result);
    if (result === "granted") saveAlertPrefs({ ...prefs, enabled: true });
  }

  function sendTest() {
    if (prefs.sound) playChime();
    if (permission === "granted") {
      new Notification(alertHeading("critical"), { body: "This is a test alert from Verified Kitchen.", icon: "/icon.png", tag: "test" });
    }
  }

  const on = prefs.enabled && permission === "granted";

  return (
    <Panel>
      <PanelHeader
        icon={BellRing}
        tone={on ? "positive" : "neutral"}
        title="Desktop alerts"
        description="A pop-up and a chime when a serious problem is raised, while the console is open on this device."
        aside={
          <StatusPill tone={on ? "positive" : permission === "denied" ? "critical" : "neutral"}>
            {on ? "On" : permission === "denied" ? "Blocked" : "Off"}
          </StatusPill>
        }
      />

      <div className="mt-4">
        {permission === "unsupported" && (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">This browser cannot show desktop notifications.</p>
        )}

        {permission === "denied" && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
            Notifications are blocked for this site. Allow them in your browser&apos;s site settings (the icon next to
            the address), then reload this page.
          </p>
        )}

        {permission !== "unsupported" && permission !== "denied" && !on && (
          <p className="text-sm leading-6 text-slate-500">
            Turn on to get a pop-up when a critical problem is raised, even while you are on another tab.
          </p>
        )}

        {on && (
          <div className="divide-y divide-slate-100">
            <Switch
              id="alerts-enabled"
              checked={prefs.enabled}
              onChange={(enabled) => saveAlertPrefs({ ...prefs, enabled })}
              label="Alert for critical problems"
              description="For example, the refrigerator staying above 8 °C."
            />
            <Switch
              id="alerts-high"
              checked={prefs.includeHigh}
              onChange={(includeHigh) => saveAlertPrefs({ ...prefs, includeHigh })}
              label="Also alert for high-severity problems"
              description="For example, gloves not worn for a sustained period."
            />
            <Switch
              id="alerts-sound"
              checked={prefs.sound}
              onChange={(sound) => saveAlertPrefs({ ...prefs, sound })}
              label="Play a chime"
              description="A short sound with each alert."
            />
          </div>
        )}
      </div>

      {(on || (permission !== "unsupported" && permission !== "denied")) && (
        <PanelFooter>
          {on && <span className="mr-auto text-xs text-slate-500">Saved on this device.</span>}
          {on ? (
            <button type="button" onClick={sendTest} className={buttonClass("outline")}>
              Send a test alert
            </button>
          ) : (
            <button type="button" onClick={enable} className={buttonClass("primary")}>
              <BellRing className="h-4 w-4" aria-hidden /> Turn on desktop alerts
            </button>
          )}
        </PanelFooter>
      )}
    </Panel>
  );
}
