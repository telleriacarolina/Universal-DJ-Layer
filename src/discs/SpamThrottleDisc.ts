import { DiscContext, DiscDecision, DiscHook } from '../core/types';

export class SpamThrottleDisc {
  public readonly id = 'spam-throttle';
  public readonly version = '1.0.0';
  public readonly priority = 30;
  public readonly supports: DiscHook[] = ['message.pre_publish'];

  private readonly timestamps = new Map<string, number[]>();

  constructor(private readonly windowMs = 60_000, private readonly maxMessages = 5) {}

  execute(context: DiscContext): DiscDecision {
    const userId = context.userId ?? 'anonymous';
    const now = Date.now();
    const recent = this.timestamps.get(userId) ?? [];
    const trimmed = recent.filter(timestamp => now - timestamp < this.windowMs);
    trimmed.push(now);
    this.timestamps.set(userId, trimmed);

    if (trimmed.length > this.maxMessages) {
      return {
        allow: false,
        reasons: ['spam throttle exceeded'],
        policyIds: [this.id],
        actions: [{ type: 'deny', reason: 'rate limit exceeded' }]
      };
    }

    return { allow: true, reasons: [], policyIds: [this.id], actions: [] };
  }
}
