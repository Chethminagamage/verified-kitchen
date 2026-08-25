import {
  Camera,
  Cpu,
  Gauge,
  ScanLine,
  CircleCheck,
} from "lucide-react";

import type {
  AISystemStatus,
} from "../../model/ai-monitoring.model";

interface AISystemStatusCardProps {
  system: AISystemStatus;
}

export default function AISystemStatusCard({
  system,
}: AISystemStatusCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600">
            Edge AI Engine
          </p>

          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            {system.modelName}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {system.modelVersion}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
          <ScanLine className="h-6 w-6 text-emerald-600" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ScanLine className="h-4 w-4" />
            AI Model
          </div>

          <div className="mt-2 flex items-center gap-2">
            <CircleCheck className="h-4 w-4 text-emerald-500" />

            <span className="text-sm font-semibold text-slate-900">
              {system.modelStatus}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Camera className="h-4 w-4" />
            Camera
          </div>

          <div className="mt-2 flex items-center gap-2">
            <CircleCheck className="h-4 w-4 text-emerald-500" />

            <span className="text-sm font-semibold text-slate-900">
              {system.cameraStatus}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Cpu className="h-4 w-4" />
            Edge Device
          </div>

          <div className="mt-2 flex items-center gap-2">
            <CircleCheck className="h-4 w-4 text-emerald-500" />

            <span className="text-sm font-semibold text-slate-900">
              {system.edgeDeviceStatus}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Gauge className="h-4 w-4" />
            Inference Latency
          </div>

          <p className="mt-2 text-lg font-bold text-slate-900">
            {system.inferenceLatency}
            <span className="ml-1 text-sm font-medium text-slate-500">
              ms
            </span>
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Last inference: {system.lastInference}
      </p>
    </section>
  );
}