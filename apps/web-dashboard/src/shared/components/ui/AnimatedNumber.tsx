"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 700;

/** Ease-out cubic: fast start, gentle stop. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}

/** Value shown at `progress` (0-1) of an animation from `from` to `to`. */
export function interpolate(from: number, to: number, progress: number): number {
  return from + (to - from) * easeOutCubic(progress);
}

interface AnimatedNumberProps {
  value: number;
  /** Decimal places shown (default 0). */
  decimals?: number;
  className?: string;
}

/**
 * Counts smoothly from the previous value to a new one when live data changes.
 * The first render shows the real value (no counting from 0, no hydration
 * mismatch), and "reduce motion" users get the new value immediately.
 */
export default function AnimatedNumber({ value, decimals = 0, className }: AnimatedNumberProps) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return;

    // "Reduce motion": jump to the new value on the next frame.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : DURATION_MS;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = duration === 0 ? 1 : (now - start) / duration;
      setShown(progress >= 1 ? value : interpolate(from, value, progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className={`tabular-nums ${className ?? ""}`}>{shown.toFixed(decimals)}</span>;
}
