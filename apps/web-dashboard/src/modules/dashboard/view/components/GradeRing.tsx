import type { Tone } from "@/shared/components/ui/tone";

/** Ring colours per tone (SVG strokes need colour values, not classes). */
const RING_STROKE: Record<Tone, string> = {
  positive: "#10b981",
  warning: "#f59e0b",
  serious: "#f97316",
  critical: "#ef4444",
  neutral: "#cbd5e1",
  info: "#0ea5e9",
};

const SIZE = 136;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface GradeRingProps {
  /** 0-100, or null when there is no score. */
  score: number | null;
  grade: string | null;
  tone: Tone;
}

/** Circular gauge of the hygiene score with the grade letter in the middle. */
export default function GradeRing({ score, grade, tone }: GradeRingProps) {
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
  const offset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        role="img"
        aria-label={grade ? `Grade ${grade}, score ${Math.round(pct)} out of 100` : "No score yet"}
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={RING_STROKE[tone]}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Grade</span>
        <span className="text-5xl font-semibold leading-none tracking-tight text-slate-950">{grade ?? "–"}</span>
      </div>
    </div>
  );
}
