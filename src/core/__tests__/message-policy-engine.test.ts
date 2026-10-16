import { DiscEngine } from '../DiscEngine';
import { HookContext } from '../HookContext';
import { PolicyStore } from '../../runtime/PolicyStore';
import { AuditLogger } from '../../runtime/AuditLogger';
import { FeatureKillSwitchDisc } from '../../discs/FeatureKillSwitchDisc';
import { ProfanityFilterDisc } from '../../discs/ProfanityFilterDisc';
import { SpamThrottleDisc } from '../../discs/SpamThrottleDisc';

describe('message policy engine', () => {
  it('allows a message when all policies pass', async () => {
    const engine = new DiscEngine();
    engine.register({
      id: 'feature-kill-switch',
      version: '1.0.0',
      priority: 10,
      supports: ['message.pre_publish'],
      execute: () => ({ allow: true, reasons: [], policyIds: ['feature-kill-switch'], actions: [] })
    });

    const decision = await engine.evaluate('message.pre_publish', new HookContext({
      hook: 'message.pre_publish',
      roomId: 'room-1',
      userId: 'user-1',
      roles: ['member'],
      payload: { text: 'hello world' }
    }));

    expect(decision.allow).toBe(true);
    expect(decision.reasons).toEqual([]);
  });

  it('preserves deny state when later discs allow', async () => {
    const engine = new DiscEngine();
    engine.register({
      id: 'deny-first',
      version: '1.0.0',
      priority: 10,
      supports: ['message.pre_publish'],
      execute: () => ({ allow: false, reasons: ['deny-first'], policyIds: ['deny-first'], actions: [{ type: 'deny', reason: 'first deny' }] })
    });
    engine.register({
      id: 'allow-second',
      version: '1.0.0',
      priority: 20,
      supports: ['message.pre_publish'],
      execute: () => ({ allow: true, reasons: [], policyIds: ['allow-second'], actions: [] })
    });

    const decision = await engine.evaluate('message.pre_publish', new HookContext({
      hook: 'message.pre_publish',
      payload: { text: 'abc' }
    }));

    expect(decision.allow).toBe(false);
    expect(decision.reasons).toContain('deny-first');
  });

  it('honors room and user policy toggles', () => {
    const store = new PolicyStore();
    store.setToggle({ discId: 'feature-kill-switch', enabled: false, scope: 'room', roomId: 'room-1' });
    expect(store.isEnabled('feature-kill-switch', { roomId: 'room-1', userId: 'user-1' })).toBe(false);

    store.setToggle({ discId: 'feature-kill-switch', enabled: true, scope: 'user', userId: 'user-1' });
    expect(store.isEnabled('feature-kill-switch', { roomId: 'room-2', userId: 'user-1' })).toBe(true);
  });

  it('logs decision metadata to the audit logger', () => {
    const logger = new AuditLogger();
    const entry = logger.logDecision({
      requestId: 'req-1',
      hook: 'message.pre_publish',
      roomId: 'room-1',
      userId: 'user-1',
      decision: { allow: false, reasons: ['blocked'], policyIds: ['spam-throttle'], actions: [{ type: 'deny', reason: 'too many messages' }] }
    });

    expect(entry.requestId).toBe('req-1');
    expect(logger.getAll()).toHaveLength(1);
  });

  it('blocks a message when a room disable is configured', () => {
    const disc = new FeatureKillSwitchDisc(({ roomId }) => roomId !== 'room-disabled');
    const decision = disc.execute({ hook: 'message.pre_publish', roomId: 'room-disabled', userId: 'user-1', payload: { text: 'hello' } });

    expect(decision.allow).toBe(false);
    expect(decision.actions[0].type).toBe('deny');
  });

  it('blocks profanity and redacts the text', () => {
    const disc = new ProfanityFilterDisc();
    const decision = disc.execute({ hook: 'message.pre_publish', roomId: 'room-1', userId: 'user-1', payload: { text: 'this has badword' } });

    expect(decision.allow).toBe(false);
    expect(decision.actions[0].type).toBe('redact');
  });

  it('blocks messages over the spam threshold', () => {
    const disc = new SpamThrottleDisc(60_000, 2);
    disc.execute({ hook: 'message.pre_publish', roomId: 'room-1', userId: 'user-1', payload: { text: 'one' } });
    disc.execute({ hook: 'message.pre_publish', roomId: 'room-1', userId: 'user-1', payload: { text: 'two' } });
    const decision = disc.execute({ hook: 'message.pre_publish', roomId: 'room-1', userId: 'user-1', payload: { text: 'three' } });

    expect(decision.allow).toBe(false);
    expect(decision.actions[0].type).toBe('deny');
  });
});
