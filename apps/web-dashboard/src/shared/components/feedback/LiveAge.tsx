"use client";

import { useEffect, useState } from "react";

import { formatRelative } from "@/shared/utils/time";

interface LiveAgeProps {
  iso: string;
  /** Server render time, so the first client render matches the server HTML. */
  serverNow: string;
  className?: string;
}

/** "12 s ago" that keeps counting in the browser between page refreshes. */
export default function LiveAge({ iso, serverNow, className }: LiveAgeProps) {
  const [now, setNow] = useState<string>(serverNow);

  useEffect(() => {
    const tick = () => setNow(new Date().toISOString());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <time dateTime={iso} className={className}>
      {formatRelative(iso, now)}
    </time>
  );
}
