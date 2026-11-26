/*
 * One look for every button in the console: the same height, radius, type and
 * focus ring, in a few tones. Used by <SubmitButton> and by plain buttons/links.
 */

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60";

const TONES = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  dark: "bg-slate-900 text-white hover:bg-slate-800",
  danger: "bg-red-600 text-white hover:bg-red-700",
  outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  "outline-danger": "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  ghost: "text-slate-600 hover:bg-slate-100",
} as const;

const SIZES = {
  md: "h-10 px-4 text-sm",
  sm: "h-9 px-3 text-sm",
} as const;

export type ButtonTone = keyof typeof TONES;

export function buttonClass(tone: ButtonTone = "primary", size: keyof typeof SIZES = "md"): string {
  return `${BASE} ${SIZES[size]} ${TONES[tone]}`;
}
