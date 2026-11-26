"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { createClient } from "@/infrastructure/supabase/client";
import { notificationHref } from "@/modules/system-status/model/system-status.model";
import { useToast } from "@/shared/components/feedback/Toaster";

import { alertHeading, shouldAlert } from "../model/alerts.model";
import { notificationsSupported, playChime, useAlertPrefs } from "./alert-prefs-store";

interface RaisedViolation {
  id: string;
  title: string;
  severity: string;
}

function isRaisedViolation(row: unknown): row is RaisedViolation {
  const r = row as Partial<RaisedViolation> | null;
  return typeof r?.id === "string" && typeof r.title === "string" && typeof r.severity === "string";
}

/**
 * Mounted once in the console shell. Listens for newly raised violations of
 * this kitchen (Row Level Security applies to the realtime feed) and, if the
 * user turned desktop alerts on, shows a browser notification, a toast and an
 * optional chime. Clicking the notification opens that violation's row.
 */
export default function CriticalAlertWatcher({ kitchenId }: { kitchenId: string }) {
  const prefs = useAlertPrefs();
  const toast = useToast();
  const router = useRouter();
  // The subscription is created once per kitchen; read the latest values through refs.
  const latest = useRef({ prefs, toast, router });
  useEffect(() => {
    latest.current = { prefs, toast, router };
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`alerts:${kitchenId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "violations", filter: `kitchen_id=eq.${kitchenId}` },
        (payload) => {
          const violation = payload.new;
          const { prefs, toast, router } = latest.current;
          if (!isRaisedViolation(violation) || !shouldAlert(prefs, violation.severity)) return;

          const heading = alertHeading(violation.severity);
          toast({ tone: violation.severity === "critical" ? "critical" : "serious", message: `${heading}: ${violation.title}` });
          if (prefs.sound) playChime();

          if (notificationsSupported() && Notification.permission === "granted") {
            const note = new Notification(heading, {
              body: violation.title,
              tag: `violation-${violation.id}`, // one notification per violation, even with several tabs open
              icon: "/icon.png",
            });
            note.onclick = () => {
              window.focus();
              router.push(notificationHref(violation.id));
              note.close();
            };
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [kitchenId]);

  return null;
}
