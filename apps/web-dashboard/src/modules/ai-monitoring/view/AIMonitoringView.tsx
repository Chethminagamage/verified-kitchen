import { CircleDashed, EyeOff, LockKeyhole, WifiOff } from "lucide-react";

import LiveRefresh from "@/shared/components/feedback/LiveRefresh";
import { formatDateTime } from "@/shared/utils/time";

import { FOOD_PREP_PLANNED, type AIMonitoringPage } from "../model/ai-monitoring.model";

import AIDetectionCard from "./components/AIDetectionCard";
import AISystemStatusCard from "./components/AISystemStatusCard";
import DetectionEventTable from "./components/DetectionEventTable";

interface AIMonitoringViewProps {
  data: AIMonitoringPage;
  kitchenId: string;
}

export default function AIMonitoringView({ data, kitchenId }: AIMonitoringViewProps) {
  const { camera } = data;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-600">Edge AI</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">AI Monitoring</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            PPE compliance detected by the camera on the edge computer. Only aggregated results reach this page;
            video never leaves the kitchen.
            {data.personalScore !== null && (
              <> Personal hygiene score {Math.round(data.personalScore)}/100.</>
            )}
          </p>
        </div>
        {/* A camera window arrives every 5 s; refresh at most every 3 s. */}
        <LiveRefresh kitchenId={kitchenId} tables={["ai_detections", "devices"]} minIntervalMs={3000} fallbackMs={15000} />
      </div>

      {!camera.online && (
        <p className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {camera.installed && camera.lastSeenAt
              ? `The camera process is offline (last message ${formatDateTime(camera.lastSeenAt, data.timezone)}). `
              : "The camera process has not connected yet. "}
            Start it with <code className="rounded bg-amber-100 px-1">./dev.sh --vision</code>. While it is offline the
            personal-hygiene pillar has no evidence and is left out of the hygiene score (never counted as 100).
          </span>
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AISystemStatusCard
          camera={camera}
          timezone={data.timezone}
          generatedAt={data.generatedAt}
          meanInferenceMs={data.meanInferenceMs}
        />

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
              <LockKeyhole className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-950">Privacy-Preserving Edge Processing</h3>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Frames are analysed in memory on the edge computer and discarded. No image or video is stored or sent
                anywhere, and no face recognition is performed. The system keeps only one result per item per
                5-second window: compliant or not, confidence, frame counts and the exact model that produced it.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-800">
                <EyeOff className="h-4 w-4" />
                {camera.online && camera.privacy ? `Camera reports: ${camera.privacy}` : "No video displayed or retained"}
              </div>
              <p className="mt-3 text-xs text-emerald-700">
                {data.windowsLastHour} windows analysed in the last hour.
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Pillar 1</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">Personal Hygiene</h3>
          <p className="mt-1 text-sm text-slate-500">
            An item counts only when the model explicitly sees it worn or not worn. When nobody is in view it is
            &ldquo;Not in view&rdquo;, never a violation.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {data.indicators.map((i) => (
            <AIDetectionCard key={i.id} indicator={i} generatedAt={data.generatedAt} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Pillar 2</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">Food Preparation Hygiene</h3>
          <p className="mt-1 text-sm text-slate-500">
            The surface, spill and waste models are not trained yet, so this pillar has no evidence and is left out of
            the hygiene score.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FOOD_PREP_PLANNED.map((i) => (
            <article key={i.id} className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
              <h4 className="font-medium text-slate-700">{i.name}</h4>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <CircleDashed className="h-3.5 w-3.5" />
                Model in development
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <DetectionEventTable events={data.events} timezone={data.timezone} />
      </div>
    </div>
  );
}
