import { Disc, DiscContext, DiscDecision } from './types';
import { DiscRegistry } from './DiscRegistry';

export class DiscEngine {
  private readonly registry: DiscRegistry;

  constructor(registry: DiscRegistry = new DiscRegistry()) {
    this.registry = registry;
  }

  register(disc: Disc): void {
    this.registry.register(disc);
  }

  async evaluate(hook: string, context: DiscContext): Promise<DiscDecision> {
    const merged: DiscDecision = {
      allow: true,
      reasons: [],
      policyIds: [],
      actions: []
    };

    const candidates = this.registry.getForHook(hook);

    for (const disc of candidates) {
      const decision = await disc.execute({ ...context, hook });

      if (!decision) {
        continue;
      }

      if (decision.allow === false) {
        merged.allow = false;
      }

      if (decision.reasons.length > 0) {
        merged.reasons.push(...decision.reasons);
      }

      if (decision.policyIds.length > 0) {
        merged.policyIds.push(...decision.policyIds);
      }

      if (decision.actions.length > 0) {
        merged.actions.push(...decision.actions);
      }
    }

    merged.reasons = Array.from(new Set(merged.reasons));
    merged.policyIds = Array.from(new Set(merged.policyIds));

    return merged;
  }
}
