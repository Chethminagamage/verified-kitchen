import { TONES, type Tone } from "./tone";

interface MeterProps {
  /** 0-100; null draws an empty track. */
  value: number | null;
  tone: Tone;
  label: string;
  className?: string;
}

/** Progress bar for scores and compliance rates; the fill eases to new values. */
export default function Meter({ value, tone, label, className = "" }: MeterProps) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-slate-100 ${className}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : Math.round(pct)}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${TONES[tone].bar}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
