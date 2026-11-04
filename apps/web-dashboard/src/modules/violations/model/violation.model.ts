import type { Database } from "@/shared/types/database.types";

type Enums = Database["public"]["Enums"];

export type ViolationSeverity = Enums["violation_severity"];
export type ViolationStatus = Enums["violation_status"];
export type EvidenceSource = Enums["evidence_source"];
export type PillarId = Enums["hygiene_pillar"];
export type AuditStatus = Enums["audit_status"];

export const SEVERITIES: readonly ViolationSeverity[] = ["critical", "high", "medium", "low"];
export const SOURCES: readonly EvidenceSource[] = ["ai", "sensor", "system"];
export const PILLARS: readonly PillarId[] = ["personal", "food_prep", "environmental"];

export const STATUS_FILTERS = ["open", "active", "acknowledged", "resolved", "all"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const PILLAR_LABELS: Record<PillarId, string> = {
  personal: "Personal Hygiene",
  food_prep: "Food Preparation",
  environmental: "Environmental",
};

export const SOURCE_LABELS: Record<EvidenceSource, string> = {
  ai: "AI",
  sensor: "Sensor",
  system: "System",
};

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  open: "Open (active + acknowledged)",
  active: "Active",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
  all: "All",
};

export const PAGE_SIZE = 25;

export interface ViolationFilters {
  status: StatusFilter;
  severity: ViolationSeverity | null;
  source: EvidenceSource | null;
  pillar: PillarId | null;
  page: number;
}

export interface ViolationRecord {
  id: string;
  occurredAt: string;
  pillar: PillarId;
  source: EvidenceSource;
  title: string;
  description: string | null;
  severity: ViolationSeverity;
  status: ViolationStatus;
  scoreImpact: number | null;
  aiConfidence: number | null;
  sensorValue: number | null;
  sensorUnit: string | null;
  acknowledgedAt: string | null;
  acknowledgedByMe: boolean;
  resolvedAt: string | null;
  /** Status of the "violation_created" audit record (null if none). */
  auditStatus: AuditStatus | null;
}

export interface ViolationCounts {
  active: number;
  acknowledged: number;
  resolved: number;
  openHighSeverity: number;
}

export interface ViolationPage {
  timezone: string;
  generatedAt: string;
  counts: ViolationCounts;
  filters: ViolationFilters;
  rows: ViolationRecord[];
  totalRows: number;
  pageCount: number;
  /** Operators and admins may acknowledge / resolve; PHIs are read-only. */
  canManage: boolean;
}

/** Status changes an operator can request (the database enforces the same rules). */
export type TargetStatus = Extract<ViolationStatus, "acknowledged" | "resolved">;

export function allowedTransitions(status: ViolationStatus): TargetStatus[] {
  if (status === "active") return ["acknowledged", "resolved"];
  if (status === "acknowledged") return ["resolved"];
  return [];
}

export type ViolationActionState =
  | { ok: true; message: string }
  | { ok: false; message: string }
  | null;

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | null {
  return allowed.includes(value as T) ? (value as T) : null;
}

/** Parses URL search params; anything unknown falls back to the default. */
export function parseFilters(params: SearchParams): ViolationFilters {
  const page = Number.parseInt(one(params.page) ?? "1", 10);

  return {
    status: pick(one(params.status), STATUS_FILTERS) ?? "open",
    severity: pick(one(params.severity), SEVERITIES),
    source: pick(one(params.source), SOURCES),
    pillar: pick(one(params.pillar), PILLARS),
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

export function filtersToQuery(filters: ViolationFilters, overrides: Partial<ViolationFilters> = {}): string {
  const f = { ...filters, ...overrides };
  const q = new URLSearchParams();

  if (f.status !== "open") q.set("status", f.status);
  if (f.severity) q.set("severity", f.severity);
  if (f.source) q.set("source", f.source);
  if (f.pillar) q.set("pillar", f.pillar);
  if (f.page > 1) q.set("page", String(f.page));

  const s = q.toString();
  return s ? `?${s}` : "";
}
