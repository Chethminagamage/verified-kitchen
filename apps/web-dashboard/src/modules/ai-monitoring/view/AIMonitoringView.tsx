import { EyeOff, LockKeyhole, WifiOff } from "lucide-react";

import LiveRefresh from "@/shared/components/feedback/LiveRefresh";
import Notice from "@/shared/components/ui/Notice";
import PageHeader from "@/shared/components/ui/PageHeader";
import { IconTile } from "@/shared/components/ui/Panel";
import SectionHeader from "@/shared/components/ui/SectionHeader";
import StatusPill from "@/shared/components/ui/StatusPill";
import { formatDateTime } from "@/shared/utils/time";

import type { AIMonitoringPage } from "../model/ai-monitoring.model";

import AIDetectionCard from "./components/AIDetectionCard";
import AISystemStatusCard from "./components/AISystemStatusCard";
import DetectionEventTable from "./components/DetectionEventTable";

interface AIMonitoringViewProps {
  data: AIMonitoringPage;
  kitchenId: string;
}

const score = (value: number | null) => (value === null ? undefined : `${Math.round(value)}/100`);

export default function AIMonitoringView({ data, kitchenId }: AIMonitoringViewProps) {
  const { camera } = data;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Camera checks"
        title="AI Monitoring"
        description="Protective wear and the preparation area, checked automatically by the kitchen camera. Only the results are kept; video never leaves the kitchen."
        aside={
          // A camera window arrives every 5 s; refresh at most every 3 s.
          <LiveRefresh kitchenId={kitchenId} tables={["ai_detections", "devices"]} minIntervalMs={3000} fallbackMs={15000} />
        }
      />

      {!camera.online && (
        <Notice
          tone="warning"
          icon={WifiOff}
          className="mb-6"
          title={
            camera.installed && camera.lastSeenAt
              ? `The hygiene camera is offline (last update ${formatDateTime(camera.lastSeenAt, data.timezone)})`
              : "The hygiene camera has not connected yet"
          }
        >
          Check that the camera and the monitoring system are switched on. While the camera is offline, personal
          hygiene and food preparation are left out of the hygiene score (they are never counted as 100).
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <AISystemStatusCard camera={camera} timezone={data.timezone} generatedAt={data.generatedAt} />

        <section className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-card">
          <div className="flex items-start gap-4">
            <IconTile icon={LockKeyhole} tone="positive" />
            <div>
              <h3 className="font-semibold tracking-tight text-emerald-950">Privacy-preserving processing</h3>
              <p className="mt-2 text-sm leading-6 text-emerald-900/80">
                The camera picture is checked on a computer inside the kitchen and immediately discarded. No image or
                video is stored or sent anywhere, and no face recognition is performed. Only the result of each check
                is kept: whether the item was compliant, and when.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <StatusPill tone="positive" icon={EyeOff}>
                  No video displayed or retained
                </StatusPill>
                <span className="text-xs text-emerald-800">{data.windowsLastHour} checks in the last hour</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-10">
        <SectionHeader
          eyebrow="Pillar 1"
          title="Personal Hygiene"
          meta={score(data.personalScore)}
          description={
            <>
              An item counts only when the camera clearly sees it worn or not worn. When nobody is in view it is
              &ldquo;Not in view&rdquo;, never a violation.
            </>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          {data.indicators.map((i) => (
            <AIDetectionCard key={i.id} indicator={i} generatedAt={data.generatedAt} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader
          eyebrow="Pillar 2"
          title="Food Preparation Hygiene"
          meta={score(data.foodPrepScore)}
          description={
            <>
              The camera checks the preparation surface and scraps left on it. &ldquo;No waste&rdquo; counts only while
              a surface is visible; when the view is blocked the item is &ldquo;Not in view&rdquo;.
            </>
          }
        />
        <div className="grid gap-4 md:grid-cols-2">
          {data.foodPrep.map((i) => (
            <AIDetectionCard key={i.id} indicator={i} generatedAt={data.generatedAt} />
          ))}
        </div>
      </section>

      <div className="mt-10">
        <DetectionEventTable events={data.events} pagination={data.eventsPagination} timezone={data.timezone} />
      </div>
    </div>
  );
}
