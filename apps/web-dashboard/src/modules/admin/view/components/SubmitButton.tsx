"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

const TONES = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  dark: "bg-slate-900 text-white hover:bg-slate-800",
  danger: "bg-red-600 text-white hover:bg-red-700",
  outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  "outline-danger": "border border-red-200 bg-white text-red-700 hover:bg-red-50",
} as const;

export default function SubmitButton({
  children,
  pendingText,
  tone = "primary",
  name,
  value,
  disabled,
  className = "",
}: {
  children: ReactNode;
  pendingText?: string;
  tone?: keyof typeof TONES;
  name?: string;
  value?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${TONES[tone]} ${className}`}
    >
      {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
