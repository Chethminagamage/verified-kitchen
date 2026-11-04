"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/infrastructure/supabase/client";

type WatchedTable =
  | "hygiene_scores"
  | "sensor_readings"
  | "ai_detections"
  | "violations"
  | "devices"
  | "audit_records";

interface LiveRefreshProps {
  kitchenId: string;
  tables: WatchedTable[];
  /** At most one refresh per this many milliseconds (evidence arrives every few seconds). */
  minIntervalMs?: number;
  /** Fallback refresh if no realtime event arrives (e.g. to age "updated x ago"). */
  fallbackMs?: number;
}

/**
 * Re-renders the current server page when matching rows change in Supabase.
 * Row Level Security still applies to realtime events.
 */
export default function LiveRefresh({
  kitchenId,
  tables,
  minIntervalMs = 5000,
  fallbackMs = 60000,
}: LiveRefreshProps) {
  const router = useRouter();
  const lastRefresh = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const tableKey = tables.join(",");

  useEffect(() => {
    const supabase = createClient();

    const refresh = () => {
      const wait = lastRefresh.current + minIntervalMs - Date.now();

      if (wait <= 0) {
        lastRefresh.current = Date.now();
        router.refresh();
      } else if (!pending.current) {
        pending.current = setTimeout(() => {
          pending.current = null;
          lastRefresh.current = Date.now();
          router.refresh();
        }, wait);
      }
    };

    let channel = supabase.channel(`live:${kitchenId}:${tableKey}`);

    for (const table of tableKey.split(",")) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `kitchen_id=eq.${kitchenId}`,
        },
        refresh
      );
    }

    channel.subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
    });

    const fallback = setInterval(refresh, fallbackMs);

    return () => {
      clearInterval(fallback);
      if (pending.current) {
        clearTimeout(pending.current);
        pending.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [kitchenId, tableKey, minIntervalMs, fallbackMs, router]);

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-slate-500"
      title={connected ? "Receiving live updates" : "Connecting to live updates…"}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          connected ? "animate-pulse bg-emerald-500" : "bg-slate-300"
        }`}
      />
      {connected ? "Live" : "Connecting…"}
    </span>
  );
}
