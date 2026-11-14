import { Camera, Cpu, Gauge, ScanLine, Wifi, WifiOff } from "lucide-react";

import LiveAge from "@/shared/components/feedback/LiveAge";
import { formatDateTime } from "@/shared/utils/time";

import { splitModelVersion, type CameraView } from "../../model/ai-monitoring.model";

interface AISystemStatusCardProps {
  camera: CameraView;
  timezone: string;
  generatedAt: string;
  meanInferenceMs: number | null;
}

const CAMERA_STATE: Record<string, { label: string; className: string }> = {
  ok: { label: "Frames arriving", className: "text-emerald-700" },
  error: { label: "No frames", className: "text-red-700" },
  stopped: { label: "Stopped", className: "text-slate-500" },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export default function AISystemStatusCard({ camera, timezone, generatedAt, meanInferenceMs }: AISystemStatusCardProps) {
  const model = splitModelVersion(camera.modelVersion);
  const state = camera.online && camera.camera ? CAMERA_STATE[camera.camera] : undefined;
  const inference = camera.online ? (camera.inferenceMs ?? meanInferenceMs) : meanInferenceMs;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
            <ScanLine className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-950">Edge AI Camera</h3>
            <p className="text-xs text-slate-500">PPE detection on the edge computer</p>
          </div>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            camera.online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {camera.online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {camera.online ? "Online" : camera.installed ? "Offline" : "Not connected"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Gauge className="h-4 w-4" />
            Inference time
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums text-slate-900">
            {inference === null ? "—" : inference.toFixed(1)}
            {inference !== null && <span className="ml-1 text-sm font-medium text-slate-500">ms / frame</span>}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Camera className="h-4 w-4" />
            Analysed
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums text-slate-900">
            {camera.online && camera.fps !== null ? camera.fps.toFixed(1) : "—"}
            {camera.online && camera.fps !== null && (
              <span className="ml-1 text-sm font-medium text-slate-500">frames / s</span>
            )}
          </p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-slate-100 text-sm">
        <Row label="Last message">
          {camera.lastSeenAt ? (
            <>
              <LiveAge iso={camera.lastSeenAt} serverNow={generatedAt} />
              <span className="ml-1 text-xs font-normal text-slate-500">
                ({formatDateTime(camera.lastSeenAt, timezone)})
              </span>
            </>
          ) : (
            "Never"
          )}
        </Row>
        <Row label="Camera">
          {state ? <span className={state.className}>{state.label}</span> : <span className="text-slate-400">—</span>}
        </Row>
        <Row label="Source">{camera.source ?? "—"}</Row>
        <Row label="Worker region">{camera.region ?? "—"}</Row>
        <Row label="Model">
          {model ? (
            <span className="flex items-center justify-end gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-slate-400" />
              {model.name}
              {model.hash && (
                <span className="font-mono text-xs font-normal text-slate-500" title="SHA-256 of the weights">
                  @{model.hash}
                </span>
              )}
            </span>
          ) : (
            "—"
          )}
        </Row>
      </dl>
    </section>
  );
}
