"use client";

import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import StatusPill from "@/shared/components/ui/StatusPill";
import type { Tone } from "@/shared/components/ui/tone";

const VISIBLE_MS = 4000;
const MAX_TOASTS = 3;

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

type ShowToast = (toast: Omit<Toast, "id">) => void;

const ToastContext = createContext<ShowToast | null>(null);

/** Shows short confirmations ("Violation acknowledged") in the corner of the console. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const show = useCallback<ShowToast>(
    ({ tone, message }) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, tone, message }].slice(-MAX_TOASTS));
      timers.current.set(id, setTimeout(() => dismiss(id), VISIBLE_MS));
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card-hover"
          >
            <StatusPill tone={t.tone}>{t.tone === "positive" ? "Done" : t.tone === "critical" ? "Failed" : "Note"}</StatusPill>
            <p className="flex-1 text-sm text-slate-700">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}

/**
 * Confirms a successful server action with a toast. Errors are not toasted:
 * the form shows them next to the control that failed, where they are useful.
 * `useActionState` returns a new object for every submission, so each result
 * is shown exactly once.
 */
export function useActionToast(state: { ok: boolean; message: string } | null): void {
  const show = useToast();
  useEffect(() => {
    if (state?.ok) show({ tone: "positive", message: state.message });
  }, [state, show]);
}
