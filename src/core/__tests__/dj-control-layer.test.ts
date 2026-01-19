import { DJControlLayer } from '../dj-control-layer';
import { ThemeDisc } from '../../discs/theme-disc';
import { FeatureFlagDisc } from '../../discs/feature-flag-disc';
import { Role, Permission, User, ComplianceRule } from '../types';

describe('DJControlLayer Integration', () => {
  let djLayer: DJControlLayer;
  let adminUser: User;
  let experimenterUser: User;
  let viewerUser: User;

  beforeEach(() => {
    djLayer = new DJControlLayer({
      enableAuditLog: true,
      maxSnapshots: 10,
      enableUserIsolation: true,
    });

    adminUser = {
      id: 'admin-1',
      name: 'Admin User',
      role: Role.ADMIN,
    };

    experimenterUser = {
      id: 'exp-1',
      name: 'Experimenter User',
      role: Role.EXPERIMENTER,
    };

    viewerUser = {
      id: 'viewer-1',
      name: 'Viewer User',
      role: Role.VIEWER,
    };
  });

  describe('Disc Management', () => {
    it('should add a disc successfully', async () => {
      const themeDisc = new ThemeDisc();
      await djLayer.addDisc(themeDisc, adminUser);

      const disc = djLayer.getDisc('theme-disc');
      expect(disc).toBeDefined();
    });

    it('should prevent non-admin from adding discs', async () => {
      const themeDisc = new ThemeDisc();

      await expect(djLayer.addDisc(themeDisc, experimenterUser)).rejects.toThrow(
        'Insufficient permissions'
      );
    });

    it('should remove a disc successfully', async () => {
      const themeDisc = new ThemeDisc();
      await djLayer.addDisc(themeDisc, adminUser);
      await djLayer.removeDisc('theme-disc', adminUser);

      const disc = djLayer.getDisc('theme-disc');
      expect(disc).toBeUndefined();
    });

    it('should enable and disable discs', async () => {
      const themeDisc = new ThemeDisc();
      await djLayer.addDisc(themeDisc, adminUser);

      await djLayer.enableDisc('theme-disc', experimenterUser);
      expect(djLayer.getDisc('theme-disc')!.isEnabled()).toBe(true);

      await djLayer.disableDisc('theme-disc', experimenterUser);
      expect(djLayer.getDisc('theme-disc')!.isEnabled()).toBe(false);
    });
  });

  describe('Disc Execution', () => {
    it('should execute enabled disc', async () => {
      const themeDisc = new ThemeDisc();
      await djLayer.addDisc(themeDisc, adminUser);
      await djLayer.enableDisc('theme-disc', experimenterUser);

      const result = await djLayer.executeDisc('theme-disc', {}, experimenterUser);
      expect(result.success).toBe(true);
      expect(result.theme).toBeDefined();
    });

    it('should prevent execution of disabled disc', async () => {
      const themeDisc = new ThemeDisc();
      await djLayer.addDisc(themeDisc, adminUser);

      await expect(djLayer.executeDisc('theme-disc', {}, experimenterUser)).rejects.toThrow(
        'not enabled'
      );
    });

    it('should prevent viewer from executing disc', async () => {
      const themeDisc = new ThemeDisc();
      await djLayer.addDisc(themeDisc, adminUser);
      await djLayer.enableDisc('theme-disc', experimenterUser);

      await expect(djLayer.executeDisc('theme-disc', {}, viewerUser)).rejects.toThrow(
        'Insufficient permissions'
      );
    });
  });

  describe('Configuration Management', () => {
    it('should update disc configuration', async () => {
      const themeDisc = new ThemeDisc();
      await djLayer.addDisc(themeDisc, adminUser);

      await djLayer.updateDiscConfig(
        'theme-disc',
        {
          primaryColor: '#ff0000',
        },
        experimenterUser
      );

      const disc = djLayer.getDisc('theme-disc') as ThemeDisc;
      expect(disc.getConfig().primaryColor).toBe('#ff0000');
    });

    it('should prevent viewer from updating config', async () => {
      const themeDisc = new ThemeDisc();
      await djLayer.addDisc(themeDisc, adminUser);

      await expect(
        djLayer.updateDiscConfig('theme-disc', { primaryColor: '#ff0000' }, viewerUser)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('State Management', () => {
    it('should create and rollback snapshots', async () => {
      const themeDisc = new ThemeDisc();
      await djLayer.addDisc(themeDisc, adminUser);
      await djLayer.enableDisc('theme-disc', experimenterUser);

      const snapshotId = await djLayer.createSnapshot(adminUser, 'Before changes');

      await djLayer.updateDiscConfig(
        'theme-disc',
        {
          primaryColor: '#ff0000',
        },
        experimenterUser
      );

      let disc = djLayer.getDisc('theme-disc') as ThemeDisc;
      expect(disc.getConfig().primaryColor).toBe('#ff0000');

      await djLayer.rollbackToSnapshot(snapshotId, adminUser);

      disc = djLayer.getDisc('theme-disc') as ThemeDisc;
      expect(disc.getConfig().primaryColor).not.toBe('#ff0000');
    });

    it('should prevent non-admin from rolling back', async () => {
      const snapshotId = await djLayer.createSnapshot(adminUser, 'Test');

      await expect(djLayer.rollbackToSnapshot(snapshotId, experimenterUser)).rejects.toThrow(
        'Insufficient permissions'
      );
    });
  });

  describe('Audit Logging', () => {
    it('should log all operations', async () => {
      const themeDisc = new ThemeDisc();
      await djLayer.addDisc(themeDisc, adminUser);
      await djLayer.enableDisc('theme-disc', experimenterUser);

      const logs = djLayer.getAuditLogs(adminUser);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((log) => log.action === 'addDisc')).toBe(true);
      expect(logs.some((log) => log.action === 'enableDisc')).toBe(true);
    });

    it('should filter logs for non-admin users', async () => {
      const themeDisc = new ThemeDisc();
      await djLayer.addDisc(themeDisc, adminUser);
      await djLayer.enableDisc('theme-disc', experimenterUser);

      const logs = djLayer.getAuditLogs(experimenterUser);
      expect(logs.every((log) => log.userId === experimenterUser.id)).toBe(true);
    });
  });

  describe('Compliance Validation', () => {
    it('should enforce compliance rules', async () => {
      const strictRule: ComplianceRule = {
        id: 'strict-rule',
        name: 'Strict Rule',
        description: 'Always fails',
        validate: async () => ({
          passed: false,
          violations: ['Not allowed'],
          warnings: [],
        }),
      };

      const strictLayer = new DJControlLayer({
        complianceRules: [strictRule],
      });

      const themeDisc = new ThemeDisc();
      await expect(strictLayer.addDisc(themeDisc, adminUser)).rejects.toThrow(
        'Compliance validation failed'
      );
    });
  });

  describe('Integration Hooks', () => {
    it('should call before change hook', async () => {
      let hookCalled = false;

      const hookedLayer = new DJControlLayer({
        hooks: {
          onBeforeChange: async (context) => {
            hookCalled = true;
            return true;
          },
        },
      });

      const themeDisc = new ThemeDisc();
      await hookedLayer.addDisc(themeDisc, adminUser);

      expect(hookCalled).toBe(true);
    });

    it('should block change when hook returns false', async () => {
      const hookedLayer = new DJControlLayer({
        hooks: {
          onBeforeChange: async () => false,
        },
      });

      const themeDisc = new ThemeDisc();
      await expect(hookedLayer.addDisc(themeDisc, adminUser)).rejects.toThrow(
        'blocked by integration hook'
      );
    });

    it('should call after change hook', async () => {
      let hookCalled = false;

      const hookedLayer = new DJControlLayer({
        hooks: {
          onAfterChange: async (context) => {
            hookCalled = true;
          },
        },
      });

      const themeDisc = new ThemeDisc();
      await hookedLayer.addDisc(themeDisc, adminUser);

      expect(hookCalled).toBe(true);
    });
  });

  describe('User Isolation', () => {
    it('should isolate user contexts', async () => {
      const ffDisc = new FeatureFlagDisc();
      await djLayer.addDisc(ffDisc, adminUser);
      await djLayer.enableDisc('feature-flag-disc', experimenterUser);

      const user1 = { ...experimenterUser, id: 'user-1' };
      const user2 = { ...experimenterUser, id: 'user-2' };

      const result1 = await djLayer.executeDisc(
        'feature-flag-disc',
        {
          featureName: 'test-feature',
        },
        user1
      );

      const result2 = await djLayer.executeDisc(
        'feature-flag-disc',
        {
          featureName: 'test-feature',
        },
        user2
      );

      expect(result1.checkedBy).toBe('user-1');
      expect(result2.checkedBy).toBe('user-2');
    });
  });

  describe('Export State', () => {
    it('should export layer state', async () => {
      const themeDisc = new ThemeDisc();
      await djLayer.addDisc(themeDisc, adminUser);

      const state = djLayer.exportState();
      expect(state).toBeTruthy();

      const parsed = JSON.parse(state);
      expect(parsed.discs).toBeDefined();
      expect(parsed.snapshots).toBeDefined();
      expect(parsed.auditLogs).toBeDefined();
    });
  });
});
