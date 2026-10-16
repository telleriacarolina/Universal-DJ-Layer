import { AuditDecisionEntry, DiscDecision, DiscHook } from '../core/types';

export class AuditLogger {
  private readonly entries: AuditDecisionEntry[] = [];

  logDecision(input: {
    requestId: string;
    hook: DiscHook;
    roomId?: string;
    userId?: string;
    decision: DiscDecision;
  }): AuditDecisionEntry {
    const entry: AuditDecisionEntry = {
      timestamp: new Date().toISOString(),
      requestId: input.requestId,
      hook: input.hook,
      roomId: input.roomId,
      userId: input.userId,
      decision: input.decision
    };

    this.entries.push(entry);
    return entry;
  }

  getAll(): AuditDecisionEntry[] {
    return [...this.entries];
  }

  getByRequestId(requestId: string): AuditDecisionEntry[] {
    return this.entries.filter(entry => entry.requestId === requestId);
  }
}
