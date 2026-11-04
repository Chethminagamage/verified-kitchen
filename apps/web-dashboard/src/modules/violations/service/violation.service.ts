import type { OperatorSession } from "@/modules/auth/model/session.model";

import {
  PAGE_SIZE,
  type TargetStatus,
  type ViolationActionState,
  type ViolationFilters,
  type ViolationPage,
} from "../model/violation.model";
import { ViolationRepository } from "../repository/violation.repository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function canManageViolations(session: OperatorSession): boolean {
  return session.role === "operator" || session.role === "admin";
}

export class ViolationService {
  constructor(
    private readonly repository = new ViolationRepository()
  ) {}

  async getPage(
    session: OperatorSession,
    kitchenId: string,
    timezone: string,
    filters: ViolationFilters,
    now = new Date()
  ): Promise<ViolationPage> {
    const [{ rows, total }, counts] = await Promise.all([
      this.repository.list(kitchenId, filters),
      this.repository.counts(kitchenId),
    ]);

    return {
      timezone,
      generatedAt: now.toISOString(),
      counts,
      filters,
      totalRows: total,
      pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      canManage: canManageViolations(session),
      rows: rows.map((r) => ({
        id: r.id,
        occurredAt: r.occurred_at,
        pillar: r.pillar,
        source: r.source,
        title: r.title,
        description: r.description,
        severity: r.severity,
        status: r.status,
        scoreImpact: r.score_impact,
        aiConfidence: r.ai_confidence,
        sensorValue: r.sensor_value,
        sensorUnit: r.sensor_unit,
        acknowledgedAt: r.acknowledged_at,
        acknowledgedByMe: r.acknowledged_by === session.userId,
        resolvedAt: r.resolved_at,
        auditStatus:
          r.audit_records.find((a) => a.event_type === "violation_created")?.status ?? null,
      })),
    };
  }

  async changeStatus(
    session: OperatorSession | null,
    id: unknown,
    target: unknown
  ): Promise<ViolationActionState> {
    if (!session) {
      return { ok: false, message: "Your session has expired. Please sign in again." };
    }

    if (!canManageViolations(session)) {
      return { ok: false, message: "Your role can view violations but not change them." };
    }

    if (typeof id !== "string" || !UUID.test(id)) {
      return { ok: false, message: "Unknown violation." };
    }

    if (target !== "acknowledged" && target !== "resolved") {
      return { ok: false, message: "Unsupported action." };
    }

    const outcome = await this.repository.updateStatus(id, target as TargetStatus);

    switch (outcome.kind) {
      case "updated":
        return {
          ok: true,
          message: target === "acknowledged" ? "Violation acknowledged." : "Violation resolved.",
        };
      case "invalid_transition":
        return { ok: false, message: "This violation was already handled. The list has been refreshed." };
      case "not_found_or_forbidden":
        return { ok: false, message: "You do not have access to this violation." };
      default:
        console.error("violation status update failed:", outcome.message);
        return { ok: false, message: "Could not save the change. Please try again." };
    }
  }
}
