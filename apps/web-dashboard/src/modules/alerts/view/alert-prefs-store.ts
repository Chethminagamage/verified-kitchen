"use client";

import { useSyncExternalStore } from "react";

import { ALERT_PREFS_STORAGE_KEY, DEFAULT_ALERT_PREFS, parseAlertPrefs, type AlertPrefs } from "../model/alerts.model";

/*
 * Alert preferences live in this browser's localStorage (per device), shared
 * between the Settings card and the alert watcher through a small external
 * store. Storage can be unavailable (private mode, blocked site data), so every
 * access is guarded and the defaults are used instead.
 */

const CHANGE_EVENT = "vk:alert-prefs-change";
let cachedRaw: string | null | undefined;
let cachedPrefs: AlertPrefs = DEFAULT_ALERT_PREFS;
/** Used instead of localStorage when the browser blocks it; lasts until the page is closed. */
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(ALERT_PREFS_STORAGE_KEY);
  } catch {
    return memoryRaw;
  }
}

function snapshot(): AlertPrefs {
  const raw = readRaw();
  // Return the same object while nothing changed (useSyncExternalStore needs stable snapshots).
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedPrefs = parseAlertPrefs(raw);
  }
  return cachedPrefs;
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === ALERT_PREFS_STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage); // other tabs
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAlertPrefs(): AlertPrefs {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULT_ALERT_PREFS);
}

export function saveAlertPrefs(next: AlertPrefs): void {
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(ALERT_PREFS_STORAGE_KEY, raw);
  } catch {
    memoryRaw = raw; // storage blocked: keep it in memory instead
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Whether this browser can show notifications at all. */
export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** A short, gentle two-tone chime (no audio file needed). Silently skipped if audio is unavailable. */
export function playChime(): void {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.18;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.17);
    });
    setTimeout(() => void ctx.close(), 600);
  } catch {
    // Audio blocked or unsupported: the visual alert still appears.
  }
}
