"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

import { buttonClass, type ButtonTone } from "./button-styles";

/** A form's submit button: shows a spinner (and optional text) while the form is being sent. */
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
  tone?: ButtonTone;
  name?: string;
  value?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending || disabled} className={`${buttonClass(tone)} ${className}`}>
      {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
