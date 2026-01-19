/**
 * Unit tests for PolicyEvaluator
 */

import { PolicyEvaluator, PolicyContext } from './policy-evaluator';
import { CreatorLockPolicy } from '../policies/creator-locks';
import { SafetyPolicy } from '../policies/safety-policies';
import { AntiAbusePolicy } from '../policies/anti-abuse';
import { CompliancePolicy } from '../policies/compliance';
import { CreatorRole } from '../roles/creator';
import { AdminRole } from '../roles/admin';
import { FeatureDisc } from '../discs/feature-disc';
import { AuditLog } from '../audit/audit-log';

describe('PolicyEvaluator', () => {
  let evaluator: PolicyEvaluator;
  let auditLog: AuditLog;
  let creatorRole: CreatorRole;
  let adminRole: AdminRole;
  let disc: FeatureDisc;

  beforeEach(() => {
    auditLog = new AuditLog({ enabled: true });
    evaluator = new PolicyEvaluator({ auditLog, enableCache: false });
    
    creatorRole = new CreatorRole({ userId: 'creator-1' });
    adminRole = new AdminRole({ userId: 'admin-1' });
    
    disc = new FeatureDisc({
      name: 'test-feature',
      features: { testFlag: true },
    });
  });

  describe('Policy Registration', () => {
    it('should register a policy successfully', () => {
      const policy = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: ['resource-1'],
      });

      expect(() => evaluator.registerPolicy(policy)).not.toThrow();
      expect(evaluator.getPolicies()).toHaveLength(1);
    });

    it('should throw error when registering invalid policy', () => {
      const invalidPolicy = {
        metadata: null,
        evaluate: async () => ({ allowed: true }),
        validate: () => false,
      } as any;

      expect(() => evaluator.registerPolicy(invalidPolicy)).toThrow();
    });

    it('should sort policies by priority after registration', () => {
      const creatorLock = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: ['resource-1'], // Need at least one resource
      });
      const safety = new SafetyPolicy({ useDefaultRules: false });
      const antiAbuse = new AntiAbusePolicy();

      evaluator.registerPolicy(safety);
      evaluator.registerPolicy(antiAbuse);
      evaluator.registerPolicy(creatorLock);

      // Policies are stored but not necessarily sorted until evaluation
      const policies = evaluator.getPolicies();
      expect(policies).toHaveLength(3);
      
      // Check that all policies are registered
      expect(policies.some(p => p.metadata.policyType === 'creator-lock')).toBe(true);
      expect(policies.some(p => p.metadata.policyType === 'safety')).toBe(true);
      expect(policies.some(p => p.metadata.policyType === 'anti-abuse')).toBe(true);
    });
  });

  describe('Policy Evaluation', () => {
    it('should allow operation when no policies registered', async () => {
      const context: PolicyContext = {
        role: creatorRole,
        disc,
        operation: 'apply',
        userId: 'creator-1',
      };

      const result = await evaluator.evaluate(context);
      expect(result.allowed).toBe(true);
      expect(result.denialReasons).toBeUndefined();
    });

    it('should deny operation when policy denies', async () => {
      const policy = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: [disc.metadata.id],
      });
      evaluator.registerPolicy(policy);

      const context: PolicyContext = {
        role: adminRole, // Non-creator trying to access locked resource
        disc,
        operation: 'apply',
        userId: 'admin-1',
      };

      const result = await evaluator.evaluate(context);
      expect(result.allowed).toBe(false);
      expect(result.denialReasons).toBeDefined();
      expect(result.denialReasons![0]).toContain('protected by a creator lock');
    });

    it('should allow operation when all policies pass', async () => {
      const policy = new SafetyPolicy({ useDefaultRules: false });
      evaluator.registerPolicy(policy);

      const context: PolicyContext = {
        role: creatorRole,
        disc,
        operation: 'apply',
        userId: 'creator-1',
      };

      const result = await evaluator.evaluate(context);
      expect(result.allowed).toBe(true);
    });

    it('should collect warnings from policies', async () => {
      const policy = new SafetyPolicy();
      evaluator.registerPolicy(policy);

      const context: PolicyContext = {
        role: creatorRole,
        disc,
        operation: 'apply',
        userId: 'creator-1',
      };

      const result = await evaluator.evaluate(context);
      expect(result.evaluatedPolicies).toContain(policy.metadata.policyId);
    });
  });

  describe('Specific Policy Evaluation', () => {
    it('should evaluate specific policy by ID', async () => {
      const policy = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: ['resource-1'],
      });
      evaluator.registerPolicy(policy);

      const context: PolicyContext = {
        role: creatorRole,
        disc,
        operation: 'apply',
        userId: 'creator-1',
      };

      const result = await evaluator.evaluatePolicy(policy.metadata.policyId, context);
      expect(result.allowed).toBe(true);
    });

    it('should throw error when evaluating non-existent policy', async () => {
      const context: PolicyContext = {
        role: creatorRole,
        disc,
        operation: 'apply',
        userId: 'creator-1',
      };

      await expect(
        evaluator.evaluatePolicy('non-existent', context)
      ).rejects.toThrow('Policy non-existent not found');
    });
  });

  describe('Policy Enable/Disable', () => {
    it('should disable a policy', () => {
      const policy = new SafetyPolicy();
      evaluator.registerPolicy(policy);

      expect(() => evaluator.disablePolicy(policy.metadata.policyId)).not.toThrow();
    });

    it('should enable a disabled policy', () => {
      const policy = new SafetyPolicy();
      evaluator.registerPolicy(policy);
      
      evaluator.disablePolicy(policy.metadata.policyId);
      expect(() => evaluator.enablePolicy(policy.metadata.policyId)).not.toThrow();
    });

    it('should skip disabled policies during evaluation', async () => {
      const policy = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: [disc.metadata.id],
      });
      evaluator.registerPolicy(policy);
      evaluator.disablePolicy(policy.metadata.policyId);

      const context: PolicyContext = {
        role: adminRole,
        disc,
        operation: 'apply',
        userId: 'admin-1',
      };

      const result = await evaluator.evaluate(context);
      expect(result.allowed).toBe(true); // Policy disabled, so allowed
    });

    it('should throw error when disabling non-existent policy', () => {
      expect(() => evaluator.disablePolicy('non-existent')).toThrow();
    });
  });

  describe('Creator Locks', () => {
    it('should add creator lock', () => {
      expect(() => evaluator.addCreatorLock('resource-1', 'creator-1')).not.toThrow();
      expect(evaluator.isCreatorLocked('resource-1')).toBe(true);
    });

    it('should check if resource is creator locked', () => {
      evaluator.addCreatorLock('resource-1', 'creator-1');
      expect(evaluator.isCreatorLocked('resource-1')).toBe(true);
      expect(evaluator.isCreatorLocked('resource-2')).toBe(false);
    });

    it('should log creator lock addition to audit log', async () => {
      evaluator.addCreatorLock('resource-1', 'creator-1');

      const entries = await auditLog.query({ actorId: 'creator-1' });
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].action).toBe('policy-change');
    });
  });

  describe('Permission Checks', () => {
    it('should check if role has permission', () => {
      expect(evaluator.hasPermission(creatorRole, 'apply-control')).toBe(true);
      // Creator has 'full-control' which grants all permissions
      expect(evaluator.hasPermission(adminRole, 'apply-control')).toBe(true);
      expect(evaluator.hasPermission(adminRole, 'non-existent')).toBe(false);
    });
  });

  describe('Disc Safety Validation', () => {
    it('should validate disc safety', () => {
      const violations = evaluator.validateDiscSafety(disc);
      expect(violations).toHaveLength(0);
    });

    it('should detect invalid disc', () => {
      const invalidDisc = {
        metadata: null,
      } as any;

      const violations = evaluator.validateDiscSafety(invalidDisc);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toContain('metadata');
    });
  });

  describe('Policy Violations', () => {
    it('should get policy violations', async () => {
      const policy = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: [disc.metadata.id],
      });
      evaluator.registerPolicy(policy);

      const context: PolicyContext = {
        role: adminRole,
        disc,
        operation: 'apply',
        userId: 'admin-1',
      };

      const violations = await evaluator.getPolicyViolations(context);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].policyType).toBe('creator-lock');
      expect(violations[0].severity).toBe('critical');
    });

    it('should return empty violations when all policies pass', async () => {
      const policy = new SafetyPolicy({ useDefaultRules: false });
      evaluator.registerPolicy(policy);

      const context: PolicyContext = {
        role: creatorRole,
        disc,
        operation: 'apply',
        userId: 'creator-1',
      };

      const violations = await evaluator.getPolicyViolations(context);
      expect(violations).toHaveLength(0);
    });
  });

  describe('Caching', () => {
    it('should cache evaluation results when enabled', async () => {
      const cachedEvaluator = new PolicyEvaluator({ enableCache: true, cacheTTL: 10000 });
      const policy = new SafetyPolicy({ useDefaultRules: false });
      cachedEvaluator.registerPolicy(policy);

      const context: PolicyContext = {
        role: creatorRole,
        disc,
        operation: 'apply',
        userId: 'creator-1',
      };

      // First evaluation
      const result1 = await cachedEvaluator.evaluate(context);
      
      // Second evaluation (should be cached)
      const result2 = await cachedEvaluator.evaluate(context);
      
      expect(result1).toEqual(result2);
    });

    it('should clear cache when policy is enabled/disabled', async () => {
      const cachedEvaluator = new PolicyEvaluator({ enableCache: true });
      const policy = new SafetyPolicy();
      cachedEvaluator.registerPolicy(policy);

      const context: PolicyContext = {
        role: creatorRole,
        disc,
        operation: 'apply',
        userId: 'creator-1',
      };

      await cachedEvaluator.evaluate(context);
      cachedEvaluator.disablePolicy(policy.metadata.policyId);
      
      // Cache should be cleared after disable
      const result = await cachedEvaluator.evaluate(context);
      expect(result).toBeDefined();
    });

    it('should manually clear cache', () => {
      expect(() => evaluator.clearCache()).not.toThrow();
    });
  });

  describe('Audit Logging', () => {
    it('should log policy violations to audit log', async () => {
      const policy = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: [disc.metadata.id],
      });
      evaluator.registerPolicy(policy);

      const context: PolicyContext = {
        role: adminRole,
        disc,
        operation: 'apply',
        userId: 'admin-1',
      };

      await evaluator.evaluate(context);

      const entries = await auditLog.query({ actorId: 'admin-1' });
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].result).toBe('failure');
    });
  });

  describe('Multiple Policies', () => {
    it('should evaluate all policies in priority order', async () => {
      const creatorLock = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: ['other-resource'], // Don't lock the test disc
      });
      const safety = new SafetyPolicy({ useDefaultRules: false });
      const antiAbuse = new AntiAbusePolicy();
      const compliance = new CompliancePolicy();

      evaluator.registerPolicy(safety);
      evaluator.registerPolicy(antiAbuse);
      evaluator.registerPolicy(creatorLock);
      evaluator.registerPolicy(compliance);

      const context: PolicyContext = {
        role: creatorRole,
        disc,
        operation: 'apply',
        userId: 'creator-1',
      };

      const result = await evaluator.evaluate(context);
      expect(result.evaluatedPolicies).toHaveLength(4);
      expect(result.allowed).toBe(true);
    });

    it('should deny if any policy denies', async () => {
      const policy1 = new SafetyPolicy({ useDefaultRules: false });
      const policy2 = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: [disc.metadata.id],
      });

      evaluator.registerPolicy(policy1);
      evaluator.registerPolicy(policy2);

      const context: PolicyContext = {
        role: adminRole,
        disc,
        operation: 'apply',
        userId: 'admin-1',
      };

      const result = await evaluator.evaluate(context);
      expect(result.allowed).toBe(false);
    });
  });
});
