"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

import SidebarContent from "./SidebarContent";

/** Menu button + slide-in drawer for screens narrower than the `lg` breakpoint. */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    openButton.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    // Lock page scroll and move focus into the drawer.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawer.current?.querySelector<HTMLElement>("a, button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={openButton}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden
            onClick={close}
            className="absolute inset-0 bg-slate-950/60"
          />

          <div
            ref={drawer}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-slate-950 shadow-xl"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close navigation menu"
              className="absolute right-3 top-6 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
