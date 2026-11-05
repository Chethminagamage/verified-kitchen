import type { Database, Json } from "@/shared/types/database.types";

export type AuditStatus = Database["public"]["Enums"]["audit_status"];

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  verified: "Anchored",
  pending: "Pending anchor",
  failed: "Anchor failed",
};

export interface AuditRecordView {
  id: number;
  seq: number;
  createdAt: string;
  eventType: string;
  eventLabel: string;
  description: string;
  violationId: string | null;
  eventHash: string;
  prevHash: string;
  status: AuditStatus;
  fabricTxId: string | null;
  fabricBlock: number | null;
}

export interface ChainCheck {
  checkedAt: string;
  records: number;
  intact: boolean;
  /** First broken link, if any. */
  firstProblem: { seq: number; reason: string } | null;
}

export interface AuditPage {
  timezone: string;
  generatedAt: string;
  counts: Record<AuditStatus, number> & { total: number };
  records: AuditRecordView[];
  chain: ChainCheck;
}

export const RECORDS_SHOWN = 50;

const EVENT_LABELS: Record<string, string> = {
  violation_created: "Violation raised",
  violation_status_changed: "Violation status changed",
};

function record(value: Json): Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function str(value: Json | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export function eventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType.replace(/_/g, " ");
}

/** Human-readable summary of an audit record's payload (shown, never trusted for logic). */
export function describeEvent(eventType: string, payload: Json, currentUserId: string | null): string {
  const p = record(payload);

  if (eventType === "violation_created") {
    const title = str(p.title) ?? "Violation";
    const severity = str(p.severity);
    const value = typeof p.sensor_value === "number" ? ` (${p.sensor_value} ${str(p.sensor_unit) ?? ""})`.replace(" )", ")") : "";
    const confidence = typeof p.ai_confidence === "number" ? ` (${Math.round(p.ai_confidence * 100)}% confidence)` : "";
    return `${title}${value}${confidence}${severity ? ` · ${severity}` : ""}`;
  }

  if (eventType === "violation_status_changed") {
    const from = str(p.from) ?? "?";
    const to = str(p.to) ?? "?";
    const by = str(p.changed_by);
    const actor = by === null ? "by the system" : by === currentUserId ? "by you" : "by an operator";
    return `${from} → ${to} ${actor}`;
  }

  return "";
}

export function chainCheckFrom(
  rows: ReadonlyArray<{ chain_seq: number; ok: boolean; reason: string | null }>,
  checkedAt: string
): ChainCheck {
  const bad = rows.find((r) => !r.ok);
  return {
    checkedAt,
    records: rows.length,
    intact: bad === undefined,
    firstProblem: bad ? { seq: bad.chain_seq, reason: bad.reason ?? "unknown" } : null,
  };
}
