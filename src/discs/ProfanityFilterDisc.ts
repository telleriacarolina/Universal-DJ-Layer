import { DiscAction, DiscContext, DiscDecision, DiscHook } from '../core/types';

const PROFANITY_PATTERNS = ['badword', 'curse', 'profanity'];

export class ProfanityFilterDisc {
  public readonly id = 'profanity-filter';
  public readonly version = '1.0.0';
  public readonly priority = 20;
  public readonly supports: DiscHook[] = ['message.pre_publish'];

  execute(context: DiscContext): DiscDecision {
    const payloadText = this.extractText(context.payload);
    if (!payloadText) {
      return { allow: true, reasons: [], policyIds: [this.id], actions: [] };
    }

    const normalized = payloadText.toLowerCase();
    const matches = PROFANITY_PATTERNS.filter(pattern => normalized.includes(pattern));

    if (matches.length > 0) {
      const action: DiscAction = {
        type: 'redact',
        reason: 'profanity detected',
        payload: { sanitizedText: '[filtered]' }
      };

      return {
        allow: false,
        reasons: [`profanity detected: ${matches.join(', ')}`],
        policyIds: [this.id],
        actions: [action]
      };
    }

    return { allow: true, reasons: [], policyIds: [this.id], actions: [] };
  }

  private extractText(payload: Record<string, unknown>): string {
    if (typeof payload.text === 'string') {
      return payload.text;
    }
    if (typeof payload.message === 'string') {
      return payload.message;
    }
    return '';
  }
}
