import { FeatureDisc, FeatureConfig, FeatureState } from './feature-disc';

describe('FeatureDisc', () => {
  describe('Constructor and Metadata', () => {
    test('creates disc with correct metadata', () => {
      const config: FeatureConfig = {
        name: 'test-features',
        features: {
          feature1: true,
          feature2: false,
        },
      };

      const disc = new FeatureDisc(config);

      expect(disc.metadata.name).toBe('test-features');
      expect(disc.metadata.type).toBe('feature');
      expect(disc.metadata.version).toBe('1.0.0');
      expect(disc.metadata.id).toContain('feature-');
      expect(disc.metadata.createdAt).toBeLessThanOrEqual(Date.now());
    });

    test('generates unique IDs for different instances', () => {
      const config: FeatureConfig = {
        name: 'test',
        features: {},
      };

      const disc1 = new FeatureDisc(config);
      const disc2 = new FeatureDisc(config);

      expect(disc1.metadata.id).not.toBe(disc2.metadata.id);
    });
  });

  describe('Simple On/Off Toggles', () => {
    test('returns false for non-existent feature', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {},
      });

      expect(disc.isFeatureEnabled('nonexistent')).toBe(false);
    });

    test('returns correct state for boolean features', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          enabled: true,
          disabled: false,
        },
      });

      expect(disc.isFeatureEnabled('enabled')).toBe(true);
      expect(disc.isFeatureEnabled('disabled')).toBe(false);
    });

    test('sets feature state correctly', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: false,
        },
      });

      disc.setFeatureState('feature1', true);
      expect(disc.isFeatureEnabled('feature1')).toBe(true);

      disc.setFeatureState('feature1', false);
      expect(disc.isFeatureEnabled('feature1')).toBe(false);
    });

    test('creates new feature when setting state for non-existent feature', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {},
      });

      disc.setFeatureState('newFeature', true);
      expect(disc.isFeatureEnabled('newFeature')).toBe(true);
    });

    test('updates updatedAt timestamp when setting state', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: { feature1: false },
      });

      const before = Date.now();
      disc.setFeatureState('feature1', true);
      const after = Date.now();

      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
      expect(disc.metadata.updatedAt!).toBeLessThanOrEqual(after);
    });
  });

  describe('Percentage Rollouts', () => {
    test('sets rollout percentage correctly', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
        },
      });

      disc.setRolloutPercentage('feature1', 50);
      const features = disc.getAllFeatures();

      expect(features.feature1.rolloutPercentage).toBe(50);
    });

    test('throws error for invalid percentage values', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {},
      });

      expect(() => disc.setRolloutPercentage('feature1', -1)).toThrow();
      expect(() => disc.setRolloutPercentage('feature1', 101)).toThrow();
    });

    test('accepts valid percentage boundaries', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {},
      });

      expect(() => disc.setRolloutPercentage('feature1', 0)).not.toThrow();
      expect(() => disc.setRolloutPercentage('feature1', 100)).not.toThrow();
    });

    test('uses deterministic hashing for user rollout', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: 50,
          },
        },
      });

      const user1Result1 = disc.isFeatureEnabled('feature1', 'user1');
      const user1Result2 = disc.isFeatureEnabled('feature1', 'user1');

      expect(user1Result1).toBe(user1Result2);
    });

    test('different users get different rollout results', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: 50,
          },
        },
      });

      const results = new Set<boolean>();
      for (let i = 0; i < 100; i++) {
        results.add(disc.isFeatureEnabled('feature1', `user${i}`));
      }

      expect(results.size).toBe(2);
      expect(results.has(true)).toBe(true);
      expect(results.has(false)).toBe(true);
    });

    test('0% rollout disables feature for all users', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: 0,
          },
        },
      });

      for (let i = 0; i < 10; i++) {
        expect(disc.isFeatureEnabled('feature1', `user${i}`)).toBe(false);
      }
    });

    test('100% rollout enables feature for all users', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: 100,
          },
        },
      });

      for (let i = 0; i < 10; i++) {
        expect(disc.isFeatureEnabled('feature1', `user${i}`)).toBe(true);
      }
    });

    test('100% rollout truly includes all users (statistical verification)', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: 100,
          },
        },
      });

      let enabledCount = 0;
      const totalUsers = 1000;
      
      for (let i = 0; i < totalUsers; i++) {
        if (disc.isFeatureEnabled('feature1', `user${i}`)) {
          enabledCount++;
        }
      }

      expect(enabledCount).toBe(totalUsers);
    });

    test('same user gets different results for different features', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: 50,
          },
          feature2: {
            enabled: true,
            rolloutPercentage: 50,
          },
        },
      });

      let differentResults = false;
      for (let i = 0; i < 100; i++) {
        const userId = `user${i}`;
        const result1 = disc.isFeatureEnabled('feature1', userId);
        const result2 = disc.isFeatureEnabled('feature2', userId);
        
        if (result1 !== result2) {
          differentResults = true;
          break;
        }
      }

      expect(differentResults).toBe(true);
    });
  });

  describe('User Targeting - Allowlist', () => {
    test('adds user to allowlist', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: false },
        },
      });

      disc.addUserToAllowlist('feature1', 'user123');
      const features = disc.getAllFeatures();

      expect(features.feature1.allowlist).toContain('user123');
    });

    test('allowlist user always gets feature enabled', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: false },
        },
      });

      disc.addUserToAllowlist('feature1', 'user123');

      expect(disc.isFeatureEnabled('feature1', 'user123')).toBe(true);
    });

    test('allowlist overrides rollout percentage', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: 0,
          },
        },
      });

      disc.addUserToAllowlist('feature1', 'user123');

      expect(disc.isFeatureEnabled('feature1', 'user123')).toBe(true);
    });

    test('removes user from allowlist', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: false,
            allowlist: ['user123'],
          },
        },
      });

      disc.removeUserFromAllowlist('feature1', 'user123');
      const features = disc.getAllFeatures();

      expect(features.feature1.allowlist).not.toContain('user123');
    });

    test('does not add duplicate users to allowlist', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: false },
        },
      });

      disc.addUserToAllowlist('feature1', 'user123');
      disc.addUserToAllowlist('feature1', 'user123');

      const features = disc.getAllFeatures();
      const count = features.feature1.allowlist!.filter(id => id === 'user123').length;

      expect(count).toBe(1);
    });
  });

  describe('User Targeting - Denylist', () => {
    test('adds user to denylist', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
        },
      });

      disc.addUserToDenylist('feature1', 'user456');
      const features = disc.getAllFeatures();

      expect(features.feature1.denylist).toContain('user456');
    });

    test('denylist user always gets feature disabled', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
        },
      });

      disc.addUserToDenylist('feature1', 'user456');

      expect(disc.isFeatureEnabled('feature1', 'user456')).toBe(false);
    });

    test('denylist overrides rollout percentage', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: 100,
          },
        },
      });

      disc.addUserToDenylist('feature1', 'user456');

      expect(disc.isFeatureEnabled('feature1', 'user456')).toBe(false);
    });

    test('removes user from denylist', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            denylist: ['user456'],
          },
        },
      });

      disc.removeUserFromDenylist('feature1', 'user456');
      const features = disc.getAllFeatures();

      expect(features.feature1.denylist).not.toContain('user456');
    });

    test('does not add duplicate users to denylist', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
        },
      });

      disc.addUserToDenylist('feature1', 'user456');
      disc.addUserToDenylist('feature1', 'user456');

      const features = disc.getAllFeatures();
      const count = features.feature1.denylist!.filter(id => id === 'user456').length;

      expect(count).toBe(1);
    });
  });

  describe('User Targeting - Priority Order', () => {
    test('allowlist takes priority over denylist', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            allowlist: ['user789'],
            denylist: ['user789'],
          },
        },
      });

      expect(disc.isFeatureEnabled('feature1', 'user789')).toBe(true);
    });

    test('allowlist takes priority over disabled state', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: false,
            allowlist: ['user789'],
          },
        },
      });

      expect(disc.isFeatureEnabled('feature1', 'user789')).toBe(true);
    });

    test('denylist takes priority over enabled state', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            denylist: ['user789'],
          },
        },
      });

      expect(disc.isFeatureEnabled('feature1', 'user789')).toBe(false);
    });

    test('rollout percentage applies when user not in allow/denylist', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: 0,
            allowlist: ['allowedUser'],
            denylist: ['deniedUser'],
          },
        },
      });

      expect(disc.isFeatureEnabled('feature1', 'allowedUser')).toBe(true);
      expect(disc.isFeatureEnabled('feature1', 'deniedUser')).toBe(false);
      expect(disc.isFeatureEnabled('feature1', 'otherUser')).toBe(false);
    });
  });

  describe('Feature Dependencies', () => {
    test('sets feature dependencies', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
          feature2: { enabled: true },
        },
      });

      disc.setFeatureDependencies('feature2', ['feature1']);
      const features = disc.getAllFeatures();

      expect(features.feature2.dependencies).toEqual(['feature1']);
    });

    test('feature disabled when dependency is disabled', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          baseFeature: { enabled: false },
          dependentFeature: {
            enabled: true,
            dependencies: ['baseFeature'],
          },
        },
      });

      expect(disc.isFeatureEnabled('dependentFeature')).toBe(false);
    });

    test('feature enabled when all dependencies are enabled', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          dep1: { enabled: true },
          dep2: { enabled: true },
          mainFeature: {
            enabled: true,
            dependencies: ['dep1', 'dep2'],
          },
        },
      });

      expect(disc.isFeatureEnabled('mainFeature')).toBe(true);
    });

    test('respects dependencies with user context', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          premium: {
            enabled: true,
            rolloutPercentage: 100,
          },
          advancedFeature: {
            enabled: true,
            dependencies: ['premium'],
          },
        },
      });

      expect(disc.isFeatureEnabled('advancedFeature', 'user123')).toBe(true);

      disc.addUserToDenylist('premium', 'user123');
      expect(disc.isFeatureEnabled('advancedFeature', 'user123')).toBe(false);
    });

    test('handles transitive dependencies', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          level1: { enabled: true },
          level2: {
            enabled: true,
            dependencies: ['level1'],
          },
          level3: {
            enabled: true,
            dependencies: ['level2'],
          },
        },
      });

      expect(disc.isFeatureEnabled('level3')).toBe(true);

      disc.setFeatureState('level1', false);
      expect(disc.isFeatureEnabled('level3')).toBe(false);
    });
  });

  describe('Validation', () => {
    test('validates successfully with valid config', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: 50,
          },
        },
      });

      await expect(disc.validate()).resolves.toBe(true);
    });

    test('throws error for invalid rollout percentage', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: 150,
          },
        },
      });

      await expect(disc.validate()).rejects.toThrow('rollout percentage must be 0-100');
    });

    test('throws error for negative rollout percentage', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: -10,
          },
        },
      });

      await expect(disc.validate()).rejects.toThrow('rollout percentage must be 0-100');
    });

    test('throws error for non-existent dependency', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            dependencies: ['nonExistent'],
          },
        },
      });

      await expect(disc.validate()).rejects.toThrow("dependency 'nonExistent' does not exist");
    });

    test('detects circular dependencies', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            dependencies: ['feature2'],
          },
          feature2: {
            enabled: true,
            dependencies: ['feature1'],
          },
        },
      });

      await expect(disc.validate()).rejects.toThrow('circular dependency detected');
    });

    test('detects circular dependencies in chains', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            dependencies: ['feature2'],
          },
          feature2: {
            enabled: true,
            dependencies: ['feature3'],
          },
          feature3: {
            enabled: true,
            dependencies: ['feature1'],
          },
        },
      });

      await expect(disc.validate()).rejects.toThrow('circular dependency detected');
    });

    test('allows valid dependency chains', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
          feature2: {
            enabled: true,
            dependencies: ['feature1'],
          },
          feature3: {
            enabled: true,
            dependencies: ['feature2'],
          },
        },
      });

      await expect(disc.validate()).resolves.toBe(true);
    });
  });

  describe('Apply Method', () => {
    test('applies features to context', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
          feature2: { enabled: false },
        },
      });

      const context = {};
      const result = await disc.apply(context);

      expect(result.features.feature1).toBeDefined();
      expect(result.features.feature1.enabled).toBe(true);
      expect(result.features.feature2.enabled).toBe(false);
    });

    test('throws error for invalid context', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {},
      });

      await expect(disc.apply(null)).rejects.toThrow('Invalid context');
      await expect(disc.apply(undefined)).rejects.toThrow('Invalid context');
    });

    test('stores previous state for revert', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
        },
      });

      const context: any = {
        features: {
          oldFeature: { enabled: true },
        },
      };

      await disc.apply(context);

      expect(context.features.feature1).toBeDefined();
      expect(context.features.oldFeature).toBeDefined();
    });

    test('initializes features object if not present', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
        },
      });

      const context: any = { someOtherData: 'value' };
      await disc.apply(context);

      expect(context.features).toBeDefined();
      expect(context.features.feature1).toBeDefined();
    });

    test('includes all feature properties in applied context', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: 50,
            allowlist: ['user1'],
            denylist: ['user2'],
            dependencies: ['feature2'],
          },
          feature2: { enabled: true },
        },
      });

      const context = {};
      const result = await disc.apply(context);

      expect(result.features.feature1.enabled).toBe(true);
      expect(result.features.feature1.rolloutPercentage).toBe(50);
      expect(result.features.feature1.allowlist).toEqual(['user1']);
      expect(result.features.feature1.denylist).toEqual(['user2']);
      expect(result.features.feature1.dependencies).toEqual(['feature2']);
    });
  });

  describe('Revert Method', () => {
    test('reverts to previous state', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          newFeature: { enabled: true },
        },
      });

      const context: any = {
        features: {
          oldFeature: { enabled: true },
        },
      };

      await disc.apply(context);
      await disc.revert(context);

      expect(context.features.oldFeature).toBeDefined();
      expect(context.features.newFeature).toBeUndefined();
    });

    test('throws error when no previous state exists', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {},
      });

      const context = {};

      await expect(disc.revert(context)).rejects.toThrow('No previous state to revert to');
    });

    test('throws error for invalid context', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {},
      });

      const context = {};
      await disc.apply(context);

      await expect(disc.revert(null)).rejects.toThrow('Invalid context');
    });

    test('clears previous state after revert', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
        },
      });

      const context = { features: {} };
      await disc.apply(context);
      await disc.revert(context);

      await expect(disc.revert(context)).rejects.toThrow('No previous state to revert to');
    });
  });

  describe('Preview Method', () => {
    test('shows changes without applying', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          newFeature: { enabled: true },
        },
      });

      const context = {
        features: {
          existingFeature: { enabled: true },
        },
      };

      const preview = await disc.preview(context);

      expect(preview.discName).toBe('test');
      expect(preview.changesCount).toBe(1);
      expect(preview.changes.newFeature).toBeDefined();
      expect(preview.changes.newFeature.action).toBe('add');
    });

    test('identifies modifications', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true, rolloutPercentage: 75 },
        },
      });

      const context = {
        features: {
          feature1: { enabled: true, rolloutPercentage: 50 },
        },
      };

      const preview = await disc.preview(context);

      expect(preview.changes.feature1).toBeDefined();
      expect(preview.changes.feature1.action).toBe('modify');
      expect(preview.changes.feature1.current.rolloutPercentage).toBe(50);
      expect(preview.changes.feature1.proposed.rolloutPercentage).toBe(75);
    });

    test('detects allowlist and denylist changes', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            allowlist: ['user1', 'user2'],
            denylist: ['user3'],
          },
        },
      });

      const context = {
        features: {
          feature1: {
            enabled: true,
            allowlist: ['user1'],
            denylist: [],
          },
        },
      };

      const preview = await disc.preview(context);

      expect(preview.changes.feature1).toBeDefined();
      expect(preview.changes.feature1.action).toBe('modify');
      expect(preview.changes.feature1.proposed.allowlist).toEqual(['user1', 'user2']);
      expect(preview.changes.feature1.proposed.denylist).toEqual(['user3']);
    });

    test('detects dependency changes', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
          feature2: {
            enabled: true,
            dependencies: ['feature1'],
          },
        },
      });

      const context = {
        features: {
          feature2: {
            enabled: true,
            dependencies: [],
          },
        },
      };

      const preview = await disc.preview(context);

      expect(preview.changes.feature2).toBeDefined();
      expect(preview.changes.feature2.action).toBe('modify');
      expect(preview.changes.feature2.proposed.dependencies).toEqual(['feature1']);
    });

    test('returns empty changes for identical state', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
        },
      });

      const context = {
        features: {
          feature1: { enabled: true },
        },
      };

      const preview = await disc.preview(context);

      expect(preview.changesCount).toBe(0);
      expect(Object.keys(preview.changes)).toHaveLength(0);
    });

    test('lists affected features', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
          feature2: { enabled: true },
        },
      });

      const context = { features: {} };
      const preview = await disc.preview(context);

      expect(preview.affectedFeatures).toContain('feature1');
      expect(preview.affectedFeatures).toContain('feature2');
    });

    test('handles empty context', async () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
        },
      });

      const preview = await disc.preview({});

      expect(preview.changesCount).toBe(1);
      expect(preview.changes.feature1.action).toBe('add');
    });
  });

  describe('getAllFeatures', () => {
    test('returns all features with normalized state', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: true,
          feature2: { enabled: false, rolloutPercentage: 50 },
        },
      });

      const features = disc.getAllFeatures();

      expect(features.feature1.enabled).toBe(true);
      expect(features.feature2.enabled).toBe(false);
      expect(features.feature2.rolloutPercentage).toBe(50);
    });

    test('returns copy not affecting internal state', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: { enabled: true },
        },
      });

      const features1 = disc.getAllFeatures();
      features1.feature1.enabled = false;

      const features2 = disc.getAllFeatures();
      expect(features2.feature1.enabled).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('handles feature with all options', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          complexFeature: {
            enabled: true,
            rolloutPercentage: 25,
            allowlist: ['user1', 'user2'],
            denylist: ['user3'],
            dependencies: ['baseFeature'],
          },
          baseFeature: { enabled: true },
        },
      });

      expect(disc.isFeatureEnabled('complexFeature', 'user1')).toBe(true);
      expect(disc.isFeatureEnabled('complexFeature', 'user3')).toBe(false);
    });

    test('handles feature without userId for rollout', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            rolloutPercentage: 50,
          },
        },
      });

      expect(disc.isFeatureEnabled('feature1')).toBe(true);
    });

    test('creating feature on non-existent feature key initializes properly', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {},
      });

      disc.setRolloutPercentage('newFeature', 50);
      disc.addUserToAllowlist('newFeature', 'user1');
      disc.addUserToDenylist('newFeature', 'user2');

      const features = disc.getAllFeatures();
      expect(features.newFeature.rolloutPercentage).toBe(50);
      expect(features.newFeature.allowlist).toContain('user1');
      expect(features.newFeature.denylist).toContain('user2');
    });

    test('handles empty allowlist and denylist gracefully', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          feature1: {
            enabled: true,
            allowlist: [],
            denylist: [],
          },
        },
      });

      expect(disc.isFeatureEnabled('feature1', 'anyUser')).toBe(true);
    });

    test('handles mixed boolean and object feature definitions', () => {
      const disc = new FeatureDisc({
        name: 'test',
        features: {
          simpleFeature: true,
          complexFeature: {
            enabled: true,
            rolloutPercentage: 50,
          },
        },
      });

      expect(disc.isFeatureEnabled('simpleFeature')).toBe(true);
      expect(disc.isFeatureEnabled('complexFeature')).toBe(true);
    });
  });
});
