/**
 * One status colour system for the whole console.
 *
 * Every status the console shows (a check, a sensor, a severity, a device...)
 * is mapped to one of six tones, and each tone has one set of classes. Pages
 * never pick colours themselves, so the same meaning always looks the same.
 */

/** "serious" sits between warning and critical (e.g. a high-severity violation). */
export type Tone = "positive" | "warning" | "serious" | "critical" | "neutral" | "info";

export interface ToneClasses {
  /** Pill / badge background, text and inner ring. */
  pill: string;
  /** Small status dot. */
  dot: string;
  /** Progress / meter fill. */
  bar: string;
  /** Icon colour on a white surface. */
  icon: string;
  /** Tinted surface for icon tiles and notices. */
  soft: string;
  /** Border for tinted notices. */
  border: string;
  /** Body text on a tinted notice. */
  text: string;
}

export const TONES: Readonly<Record<Tone, ToneClasses>> = {
  positive: {
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    icon: "text-emerald-600",
    soft: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
  },
  warning: {
    pill: "bg-amber-50 text-amber-800 ring-amber-600/20",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    icon: "text-amber-600",
    soft: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-900",
  },
  serious: {
    pill: "bg-orange-50 text-orange-700 ring-orange-600/20",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
    icon: "text-orange-600",
    soft: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-900",
  },
  critical: {
    pill: "bg-red-50 text-red-700 ring-red-600/20",
    dot: "bg-red-500",
    bar: "bg-red-500",
    icon: "text-red-600",
    soft: "bg-red-50",
    border: "border-red-200",
    text: "text-red-900",
  },
  neutral: {
    pill: "bg-slate-100 text-slate-600 ring-slate-500/15",
    dot: "bg-slate-400",
    bar: "bg-slate-300",
    icon: "text-slate-500",
    soft: "bg-slate-100",
    border: "border-slate-200",
    text: "text-slate-700",
  },
  info: {
    pill: "bg-sky-50 text-sky-700 ring-sky-600/20",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
    icon: "text-sky-600",
    soft: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-900",
  },
};

/**
 * Tone of a status word used anywhere in the console. Unknown words are
 * neutral, so a new status can never look like good (or bad) news by accident.
 */
const STATUS_TONES: Readonly<Record<string, Tone>> = {
  // good
  compliant: "positive",
  safe: "positive",
  excellent: "positive",
  good: "positive",
  ok: "positive",
  online: "positive",
  reporting: "positive",
  secured: "positive",
  resolved: "positive",
  verified: "positive",
  receiving: "positive",
  // needs attention
  warning: "warning",
  moderate: "warning",
  acknowledged: "warning",
  pending: "warning",
  recorded: "warning",
  medium: "warning",
  high: "serious",
  // bad
  "non-compliant": "critical",
  critical: "critical",
  poor: "critical",
  error: "critical",
  failed: "critical",
  active: "critical",
  // no information
  "no evidence": "neutral",
  "no data": "neutral",
  "not in view": "neutral",
  offline: "neutral",
  unknown: "neutral",
  low: "neutral",
};

export function toneForStatus(status: string | null | undefined): Tone {
  if (!status) return "neutral";
  return STATUS_TONES[status.trim().toLowerCase()] ?? "neutral";
}

/**
 * Tone of a 0-100 hygiene score, using the same bands as the grade
 * (A >= 75 good, B >= 50 needs attention, below 50 poor). Null = no evidence.
 */
export function toneForScore(score: number | null | undefined): Tone {
  if (score === null || score === undefined || !Number.isFinite(score)) return "neutral";
  if (score >= 75) return "positive";
  if (score >= 50) return "warning";
  return "critical";
}
