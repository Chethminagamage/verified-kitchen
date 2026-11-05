import {
  chainCheckFrom,
  describeEvent,
  eventLabel,
  type AuditPage,
  type ChainCheck,
} from "../model/audit.model";
import { AuditRepository } from "../repository/audit.repository";

export class AuditService {
  constructor(private readonly repository = new AuditRepository()) {}

  async getPage(kitchenId: string, timezone: string, userId: string, now = new Date()): Promise<AuditPage> {
    const [rows, counts, chain] = await Promise.all([
      this.repository.latest(kitchenId),
      this.repository.counts(kitchenId),
      this.verify(kitchenId, now),
    ]);

    return {
      timezone,
      generatedAt: now.toISOString(),
      counts: { ...counts, total: counts.verified + counts.pending + counts.failed },
      chain,
      records: rows.map((r) => ({
        id: r.id,
        seq: r.chain_seq,
        createdAt: r.created_at,
        eventType: r.event_type,
        eventLabel: eventLabel(r.event_type),
        description: describeEvent(r.event_type, r.event_payload, userId),
        violationId: r.violation_id,
        eventHash: r.event_hash,
        prevHash: r.prev_hash,
        status: r.status,
        fabricTxId: r.fabric_tx_id,
        fabricBlock: r.fabric_block,
      })),
    };
  }

  async verify(kitchenId: string, now = new Date()): Promise<ChainCheck> {
    return chainCheckFrom(await this.repository.verifyChain(kitchenId), now.toISOString());
  }
}
