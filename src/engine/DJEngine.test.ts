import { DJEngine } from './DJEngine';
import { Role, Scope, Disc } from '../types';

describe('DJEngine', () => {
  let engine: DJEngine;
  let sampleDisc: Disc;

  beforeEach(() => {
    engine = new DJEngine('TestUser', Role.Creator);

    sampleDisc = {
      name: 'TestDisc',
      description: 'A test disc',
      scope: Scope.Local,
      allowedRoles: [Role.Creator, Role.Admin],
      isTemporary: true,
      execute: jest.fn(),
    };
  });

  describe('Engine Initialization', () => {
    it('should initialize with empty disc collections', () => {
      expect(engine.getRegisteredDiscs()).toHaveLength(0);
      expect(engine.getActiveDiscs()).toHaveLength(0);
    });

    it('should create initial log entry', () => {
      const log = engine.getEventLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0].event).toBe('EngineInitialized');
    });

    it('should initialize with provided actor and role', () => {
      const log = engine.getEventLog();
      expect(log[0].actor).toBe('TestUser');
      expect(log[0].role).toBe(Role.Creator);
    });
  });

  describe('Disc Registration', () => {
    it('should register a valid disc', () => {
      engine.registerDisc(sampleDisc);

      expect(engine.getRegisteredDiscs()).toHaveLength(1);
      expect(engine.getDisc('TestDisc')).toBeDefined();
      expect(engine.getDisc('TestDisc')?.name).toBe('TestDisc');
    });

    it('should log disc registration event', () => {
      engine.registerDisc(sampleDisc);

      const log = engine.getEventLog();
      const registrationEvent = log.find((e) => e.event === 'DiscRegistered');

      expect(registrationEvent).toBeDefined();
      expect(registrationEvent?.discName).toBe('TestDisc');
    });

    it('should throw error for disc without name', () => {
      const invalidDisc = { ...sampleDisc, name: '' };

      expect(() => engine.registerDisc(invalidDisc)).toThrow('Disc name is required');
    });

    it('should throw error for disc without scope', () => {
      const invalidDisc = { ...sampleDisc, scope: undefined as any };

      expect(() => engine.registerDisc(invalidDisc)).toThrow('Disc scope is required');
    });

    it('should throw error for disc without allowed roles', () => {
      const invalidDisc = { ...sampleDisc, allowedRoles: [] };

      expect(() => engine.registerDisc(invalidDisc)).toThrow(
        'Disc must have at least one allowed role'
      );
    });

    it('should throw error for disc without isTemporary flag', () => {
      const invalidDisc = { ...sampleDisc, isTemporary: undefined as any };

      expect(() => engine.registerDisc(invalidDisc)).toThrow('Disc isTemporary flag is required');
    });

    it('should throw error when registering duplicate disc', () => {
      engine.registerDisc(sampleDisc);

      expect(() => engine.registerDisc(sampleDisc)).toThrow(
        'Disc "TestDisc" is already registered'
      );
    });
  });

  describe('Disc Activation', () => {
    beforeEach(() => {
      engine.registerDisc(sampleDisc);
    });

    it('should activate a registered disc', () => {
      engine.activateDisc('TestDisc');

      expect(engine.isDiscActive('TestDisc')).toBe(true);
      expect(engine.getActiveDiscs()).toContain('TestDisc');
    });

    it('should log disc activation event', () => {
      engine.activateDisc('TestDisc');

      const log = engine.getEventLog();
      const activationEvent = log.find((e) => e.event === 'DiscActivated');

      expect(activationEvent).toBeDefined();
      expect(activationEvent?.discName).toBe('TestDisc');
    });

    it('should execute disc function on activation', () => {
      engine.activateDisc('TestDisc');

      expect(sampleDisc.execute).toHaveBeenCalled();
    });

    it('should throw error when activating non-existent disc', () => {
      expect(() => engine.activateDisc('NonExistent')).toThrow(
        'Disc "NonExistent" is not registered'
      );
    });

    it('should throw error when activating already active disc', () => {
      engine.activateDisc('TestDisc');

      expect(() => engine.activateDisc('TestDisc')).toThrow('Disc "TestDisc" is already active');
    });

    it('should throw error when role lacks permission', () => {
      engine.setActor('RegularUser', Role.User);

      expect(() => engine.activateDisc('TestDisc')).toThrow(
        'Role "User" does not have permission to activate disc "TestDisc"'
      );
    });
  });

  describe('Disc Deactivation', () => {
    beforeEach(() => {
      engine.registerDisc(sampleDisc);
      engine.activateDisc('TestDisc');
    });

    it('should deactivate an active disc', () => {
      engine.deactivateDisc('TestDisc');

      expect(engine.isDiscActive('TestDisc')).toBe(false);
      expect(engine.getActiveDiscs()).not.toContain('TestDisc');
    });

    it('should log disc deactivation event', () => {
      engine.deactivateDisc('TestDisc');

      const log = engine.getEventLog();
      const deactivationEvent = log.find((e) => e.event === 'DiscDeactivated');

      expect(deactivationEvent).toBeDefined();
      expect(deactivationEvent?.discName).toBe('TestDisc');
    });

    it('should throw error when deactivating non-existent disc', () => {
      expect(() => engine.deactivateDisc('NonExistent')).toThrow(
        'Disc "NonExistent" is not registered'
      );
    });

    it('should throw error when deactivating inactive disc', () => {
      engine.deactivateDisc('TestDisc');

      expect(() => engine.deactivateDisc('TestDisc')).toThrow('Disc "TestDisc" is not active');
    });

    it('should throw error when role lacks permission', () => {
      engine.setActor('RegularUser', Role.User);

      expect(() => engine.deactivateDisc('TestDisc')).toThrow(
        'Role "User" does not have permission to deactivate disc "TestDisc"'
      );
    });
  });

  describe('Role Management', () => {
    it('should allow Creator role to execute', () => {
      const disc: Disc = {
        name: 'CreatorDisc',
        scope: Scope.Global,
        allowedRoles: [Role.Creator],
        isTemporary: false,
      };

      expect(engine.canExecute(Role.Creator, disc)).toBe(true);
    });

    it('should allow Admin role for Admin-allowed disc', () => {
      const disc: Disc = {
        name: 'AdminDisc',
        scope: Scope.Global,
        allowedRoles: [Role.Admin],
        isTemporary: false,
      };

      expect(engine.canExecute(Role.Admin, disc)).toBe(true);
    });

    it('should deny User role for Admin-only disc', () => {
      const disc: Disc = {
        name: 'AdminDisc',
        scope: Scope.Global,
        allowedRoles: [Role.Admin],
        isTemporary: false,
      };

      expect(engine.canExecute(Role.User, disc)).toBe(false);
    });

    it('should allow multiple roles', () => {
      const disc: Disc = {
        name: 'MultiRoleDisc',
        scope: Scope.Local,
        allowedRoles: [Role.Creator, Role.Admin, Role.Moderator],
        isTemporary: true,
      };

      expect(engine.canExecute(Role.Creator, disc)).toBe(true);
      expect(engine.canExecute(Role.Admin, disc)).toBe(true);
      expect(engine.canExecute(Role.Moderator, disc)).toBe(true);
      expect(engine.canExecute(Role.User, disc)).toBe(false);
    });
  });

  describe('Actor Management', () => {
    it('should allow changing actor', () => {
      engine.setActor('NewUser', Role.Admin);

      const log = engine.getEventLog();
      const actorChangeEvent = log.find((e) => e.event === 'ActorChanged');

      expect(actorChangeEvent).toBeDefined();
      expect(actorChangeEvent?.details?.actor).toBe('NewUser');
      expect(actorChangeEvent?.details?.role).toBe(Role.Admin);
    });

    it('should use new actor for subsequent operations', () => {
      engine.setActor('Admin1', Role.Admin);
      engine.registerDisc(sampleDisc);

      const log = engine.getEventLog();
      const registrationEvent = log.find((e) => e.event === 'DiscRegistered');

      expect(registrationEvent?.actor).toBe('Admin1');
    });
  });

  describe('Observability', () => {
    it('should maintain event log with timestamps', () => {
      engine.registerDisc(sampleDisc);
      engine.activateDisc('TestDisc');

      const log = engine.getEventLog();

      expect(log.length).toBeGreaterThan(2);
      log.forEach((entry) => {
        expect(entry.timestamp).toBeInstanceOf(Date);
        expect(entry.actor).toBeDefined();
        expect(entry.role).toBeDefined();
      });
    });

    it('should include disc name in relevant events', () => {
      engine.registerDisc(sampleDisc);
      engine.activateDisc('TestDisc');

      const log = engine.getEventLog();
      const discEvents = log.filter((e) => e.discName === 'TestDisc');

      expect(discEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Temporary vs Permanent Discs', () => {
    it('should handle temporary disc flag', () => {
      const tempDisc: Disc = {
        name: 'TempDisc',
        scope: Scope.Local,
        allowedRoles: [Role.Creator],
        isTemporary: true,
      };

      engine.registerDisc(tempDisc);
      const registered = engine.getDisc('TempDisc');

      expect(registered?.isTemporary).toBe(true);
    });

    it('should handle permanent disc flag', () => {
      const permDisc: Disc = {
        name: 'PermDisc',
        scope: Scope.Global,
        allowedRoles: [Role.Creator],
        isTemporary: false,
      };

      engine.registerDisc(permDisc);
      const registered = engine.getDisc('PermDisc');

      expect(registered?.isTemporary).toBe(false);
    });
  });
});
