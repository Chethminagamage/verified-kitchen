"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Bell, BellOff } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import ViolationSeverityBadge from "@/modules/violations/view/components/ViolationSeverityBadge";
import LiveAge from "@/shared/components/feedback/LiveAge";
import EmptyState from "@/shared/components/ui/EmptyState";

import { notificationHref, type NotificationItem } from "../model/system-status.model";

interface NotificationCenterProps {
  items: NotificationItem[];
  /** Violations still waiting for an operator (the badge count). */
  activeCount: number;
  generatedAt: string;
}

/**
 * The header bell. Opens a panel with the newest open violations; choosing one
 * goes to its row on the Violations page, which scrolls to it and highlights it.
 */
export default function NotificationCenter({ items, activeCount, generatedAt }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pathname = usePathname();

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }, []);

  // Close when the page changes (e.g. after choosing a notification).
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const label =
    activeCount === 0 ? "Notifications, nothing needs action" : `Notifications, ${activeCount} need action`;

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border text-slate-600 transition ${
          open ? "border-slate-300 bg-slate-100" : "border-slate-200 hover:bg-slate-50"
        }`}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {activeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white ring-2 ring-white">
            {activeCount > 99 ? "99+" : activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-50 w-[min(28rem,calc(100vw_-_2rem))] animate-toast-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-hover"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-950">Notifications</p>
            <p className="whitespace-nowrap text-xs text-slate-500">
              {activeCount === 0 ? "Nothing needs action" : `${activeCount} need${activeCount === 1 ? "s" : ""} action`}
            </p>
          </div>

          {items.length === 0 ? (
            <EmptyState icon={BellOff} tone="positive" title="You're all caught up" compact>
              No open hygiene problems.
            </EmptyState>
          ) : (
            <ul className="max-h-[min(60vh,28rem)] divide-y divide-slate-100 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={notificationHref(n.id)}
                    onClick={() => setOpen(false)}
                    className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-start gap-3 px-4 py-2.5 transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                  >
                    <span className="pt-0.5">
                      <ViolationSeverityBadge severity={n.severity} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-start gap-1.5">
                        {n.status === "active" && (
                          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />
                        )}
                        <span
                          className={`line-clamp-2 text-[13px] leading-5 ${n.status === "active" ? "font-semibold text-slate-900" : "font-medium text-slate-600"}`}
                        >
                          {n.title}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                        <LiveAge iso={n.occurredAt} serverNow={generatedAt} />
                        {n.status === "acknowledged" ? " · acknowledged" : " · needs action"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/dashboard/violations"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t border-slate-100 px-4 py-2.5 text-[13px] font-medium text-emerald-700 transition hover:bg-emerald-50"
          >
            View all violations <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
