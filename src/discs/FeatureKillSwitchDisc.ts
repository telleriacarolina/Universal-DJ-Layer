import { DiscDecision, DiscContext, DiscHook } from '../core/types';

export class FeatureKillSwitchDisc {
  public readonly id = 'feature-kill-switch';
  public readonly version = '1.0.0';
  public readonly priority = 10;
  public readonly supports: DiscHook[] = ['message.pre_publish'];

  constructor(private readonly isEnabled: (context: Pick<DiscContext, 'roomId' | 'userId'>) => boolean = () => true) {}

  execute(context: DiscContext): DiscDecision {
    if (!this.isEnabled({ roomId: context.roomId, userId: context.userId })) {
      return {
        allow: false,
        reasons: ['room or user policy disabled this disc'],
        policyIds: ['feature-kill-switch'],
        actions: [{ type: 'deny', reason: 'feature kill switch active' }]
      };
    }

    return {
      allow: true,
      reasons: [],
      policyIds: ['feature-kill-switch'],
      actions: []
    };
  }
}
