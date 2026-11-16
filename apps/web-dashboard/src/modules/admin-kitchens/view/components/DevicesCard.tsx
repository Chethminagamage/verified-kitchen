import { Camera, Cpu } from "lucide-react";

import { PLATFORM_TIMEZONE } from "@/modules/admin/model/admin.model";
import ConfirmAction from "@/modules/admin/view/components/ConfirmAction";
import { Card, EmptyState, Pill } from "@/modules/admin/view/components/ui";
import LiveAge from "@/shared/components/feedback/LiveAge";
import { formatDateTime } from "@/shared/utils/time";

import { removeDeviceAction } from "../../controller/kitchens.actions";
import { DEVICE_TYPE_LABELS, deviceSetup, type KitchenDevice } from "../../model/kitchens.model";

import RegisterDeviceForm from "./RegisterDeviceForm";
import RenameDeviceForm from "./RenameDeviceForm";

export default function DevicesCard({
  kitchenId,
  kitchenCode,
  devices,
  generatedAt,
}: {
  kitchenId: string;
  kitchenCode: string;
  devices: KitchenDevice[];
  generatedAt: string;
}) {
  return (
    <Card title="Monitoring devices" description="A kitchen needs one environmental sensor and one hygiene camera.">
      {devices.length === 0 ? (
        <EmptyState>No devices registered yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100">
          {devices.map((d) => {
            const Icon = d.type === "camera" ? Camera : Cpu;
            const setup = deviceSetup(kitchenCode, d);
            return (
              <li key={d.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <Icon className="h-5 w-5 text-slate-600" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{d.name}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">{d.id}</span> · {DEVICE_TYPE_LABELS[d.type]}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {d.lastSeenAt ? (
                          <>
                            Last heard <LiveAge iso={d.lastSeenAt} serverNow={generatedAt} />
                            <span className="sr-only"> ({formatDateTime(d.lastSeenAt, PLATFORM_TIMEZONE)})</span>
                          </>
                        ) : (
                          "Never connected"
                        )}
                      </p>
                    </div>
                  </div>
                  <Pill tone={d.reporting ? "green" : d.lastSeenAt ? "amber" : "slate"}>
                    {d.reporting ? "Reporting" : d.lastSeenAt ? "Silent" : "Not connected"}
                  </Pill>
                </div>

                <details className="group mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <summary className="cursor-pointer select-none font-medium text-slate-700">Setup details and options</summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="font-medium text-slate-700">1. Broker account (on the kitchen&apos;s edge computer)</p>
                      <code className="mt-1 block overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono">{setup.brokerAccount}</code>
                    </div>
                    {setup.files.map((f, i) => (
                      <div key={f.file}>
                        <p className="font-medium text-slate-700">
                          {i + 2}. Set in <span className="font-mono">{f.file}</span>
                        </p>
                        <code className="mt-1 block overflow-x-auto whitespace-pre rounded-lg bg-white px-3 py-2 font-mono">
                          {f.lines.join("\n")}
                        </code>
                      </div>
                    ))}
                    <p>
                      Publishes to <span className="font-mono">{setup.topics.join(", ")}</span>
                    </p>
                    <div className="border-t border-slate-200 pt-3">
                      <RenameDeviceForm deviceId={d.id} name={d.name} />
                    </div>
                    <ConfirmAction
                      action={removeDeviceAction}
                      fields={{ device_id: d.id }}
                      label="Remove device"
                      confirm={`Remove ${d.id}?`}
                      confirmLabel="Remove"
                      tone="outline-danger"
                      pendingText="Removing..."
                      small
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-5">
        <RegisterDeviceForm kitchenId={kitchenId} />
      </div>
    </Card>
  );
}
