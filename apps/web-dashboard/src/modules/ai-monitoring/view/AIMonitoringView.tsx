import {
  EyeOff,
  LockKeyhole,
} from "lucide-react";

import type {
  AIMonitoringData,
} from "../model/ai-monitoring.model";

import AISystemStatusCard from "./components/AISystemStatusCard";
import AIDetectionCard from "./components/AIDetectionCard";
import DetectionEventTable from "./components/DetectionEventTable";

interface AIMonitoringViewProps {
  data: AIMonitoringData;
}

export default function AIMonitoringView({
  data,
}: AIMonitoringViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-600">
          Edge AI
        </p>

        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          AI Monitoring
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Monitor AI-generated hygiene compliance metadata
          from the local computer vision system.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <AISystemStatusCard system={data.system} />

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white">
              <LockKeyhole className="h-5 w-5 text-emerald-700" />
            </div>

            <div>
              <h3 className="font-semibold text-emerald-950">
                Privacy-Preserving Edge Processing
              </h3>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-800">
                Video is analysed locally by the edge AI
                system. The dashboard receives structured
                detection metadata rather than continuous raw
                surveillance footage.
              </p>

              <div className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-800">
                <EyeOff className="h-4 w-4" />
                No raw video displayed or retained
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Pillar 1
          </p>

          <h3 className="mt-1 text-lg font-semibold text-slate-950">
            Personal Hygiene
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            AI monitoring of hairnet, mask and glove
            compliance.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {data.personalHygieneDetections.map(
            (detection) => (
              <AIDetectionCard
                key={detection.id}
                detection={detection}
              />
            )
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Pillar 2
          </p>

          <h3 className="mt-1 text-lg font-semibold text-slate-950">
            Food Preparation Hygiene
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            AI monitoring of preparation surface cleanliness,
            food spills, food waste and dirty surfaces.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.foodPreparationDetections.map(
            (detection) => (
              <AIDetectionCard
                key={detection.id}
                detection={detection}
              />
            )
          )}
        </div>
      </section>

      <div className="mt-8">
        <DetectionEventTable
          events={data.recentEvents}
        />
      </div>
    </div>
  );
}