import { ScanLine, Wifi, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import LiveAge from "@/shared/components/feedback/LiveAge";
import { Panel, PanelHeader } from "@/shared/components/ui/Panel";
import StatusPill from "@/shared/components/ui/StatusPill";
import type { Tone } from "@/shared/components/ui/tone";
import { formatDateTime } from "@/shared/utils/time";

import type { CameraView } from "../../model/ai-monitoring.model";

const PICTURE_STATE: Record<string, { label: string; tone: Tone }> = {
  ok: { label: "Receiving", tone: "positive" },
  error: { label: "No picture from the camera", tone: "critical" },
  stopped: { label: "Stopped", tone: "neutral" },
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

interface AISystemStatusCardProps {
  camera: CameraView;
  timezone: string;
  generatedAt: string;
}

/** Connection and picture state of the kitchen's hygiene camera. */
export default function AISystemStatusCard({ camera, timezone, generatedAt }: AISystemStatusCardProps) {
  const picture = camera.online && camera.camera ? PICTURE_STATE[camera.camera] : undefined;

  return (
    <Panel>
      <PanelHeader
        icon={ScanLine}
        tone={camera.online ? "positive" : "neutral"}
        title="Hygiene camera"
        description="Checks protective wear and the preparation area"
        aside={
          <StatusPill tone={camera.online ? "positive" : "neutral"} icon={camera.online ? Wifi : WifiOff}>
            {camera.online ? "Online" : camera.installed ? "Offline" : "Not connected"}
          </StatusPill>
        }
      />

      <dl className="mt-4 divide-y divide-slate-100 text-sm">
        <Row label="Last update">
          {camera.lastSeenAt ? (
            <>
              <LiveAge iso={camera.lastSeenAt} serverNow={generatedAt} />
              <span className="ml-1 text-xs font-normal text-slate-500">({formatDateTime(camera.lastSeenAt, timezone)})</span>
            </>
          ) : (
            "Never"
          )}
        </Row>
        <Row label="Camera picture">
          {picture ? <StatusPill tone={picture.tone}>{picture.label}</StatusPill> : <span className="text-slate-400">—</span>}
        </Row>
      </dl>
    </Panel>
  );
}
