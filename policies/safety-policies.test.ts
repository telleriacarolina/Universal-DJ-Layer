/**
 * Unit tests for SafetyPolicy
 */

import { SafetyPolicy, SafetyRule } from './safety-policies';

describe('SafetyPolicy', () => {
  describe('Initialization', () => {
    it('should initialize with default rules', () => {
      const policy = new SafetyPolicy();
      expect(policy.metadata.priority).toBe(900);
      expect(policy.metadata.policyType).toBe('safety');
    });

    it('should initialize without default rules', () => {
      const policy = new SafetyPolicy({ useDefaultRules: false });
      expect(policy.validate()).toBe(true);
    });

    it('should initialize with custom rules', () => {
      const customRule: SafetyRule = {
        id: 'custom-rule',
        name: 'Custom Rule',
        description: 'Custom safety rule',
        severity: 'high',
        check: () => true,
      };

      const policy = new SafetyPolicy({ 
        useDefaultRules: false,
        customRules: [customRule] 
      });
      
      expect(policy.validate()).toBe(true);
    });
  });

  describe('Policy Evaluation', () => {
    it('should allow when all rules pass', async () => {
      const policy = new SafetyPolicy({ useDefaultRules: false });
      
      const result = await policy.evaluate({
        operation: 'apply',
        actorId: 'user-1',
        roleType: 'admin',
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny when a rule fails', async () => {
      const failingRule: SafetyRule = {
        id: 'failing-rule',
        name: 'Failing Rule',
        description: 'This rule always fails',
        severity: 'critical',
        check: () => false,
      };

      const policy = new SafetyPolicy({
        useDefaultRules: false,
        customRules: [failingRule],
      });

      const result = await policy.evaluate({
        operation: 'apply',
        actorId: 'user-1',
        roleType: 'admin',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Failing Rule');
    });

    it('should filter violations by severity threshold', async () => {
      const lowSeverityRule: SafetyRule = {
        id: 'low-rule',
        name: 'Low Severity Rule',
        description: 'Low severity violation',
        severity: 'low',
        check: () => false,
      };

      const policy = new SafetyPolicy({
        useDefaultRules: false,
        customRules: [lowSeverityRule],
        blockThreshold: 'high', // Only block high and critical
      });

      const result = await policy.evaluate({
        operation: 'apply',
        actorId: 'user-1',
        roleType: 'admin',
      });

      // Low severity should not block when threshold is high
      expect(result.allowed).toBe(true);
    });

    it('should handle rule check errors gracefully', async () => {
      const errorRule: SafetyRule = {
        id: 'error-rule',
        name: 'Error Rule',
        description: 'This rule throws an error',
        severity: 'critical',
        check: () => {
          throw new Error('Rule check failed');
        },
      };

      const policy = new SafetyPolicy({
        useDefaultRules: false,
        customRules: [errorRule],
      });

      const result = await policy.evaluate({
        operation: 'apply',
        actorId: 'user-1',
        roleType: 'admin',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('encountered an error');
    });
  });

  describe('Rule Management', () => {
    it('should add a custom rule', () => {
      const policy = new SafetyPolicy({ useDefaultRules: false });
      
      const customRule: SafetyRule = {
        id: 'new-rule',
        name: 'New Rule',
        description: 'New safety rule',
        severity: 'medium',
        check: () => true,
      };

      policy.addRule(customRule);
      expect(policy.validate()).toBe(true);
    });

    it('should remove a rule by ID', () => {
      const rule: SafetyRule = {
        id: 'removable-rule',
        name: 'Removable Rule',
        description: 'This rule can be removed',
        severity: 'low',
        check: () => true,
      };

      const policy = new SafetyPolicy({
        useDefaultRules: false,
        customRules: [rule],
      });

      const removed = policy.removeRule('removable-rule');
      expect(removed).toBe(true);
    });

    it('should return false when removing non-existent rule', () => {
      const policy = new SafetyPolicy({ useDefaultRules: false });
      const removed = policy.removeRule('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate with rules', () => {
      const policy = new SafetyPolicy();
      expect(policy.validate()).toBe(true);
    });

    it('should validate empty policy with useDefaultRules: false', () => {
      const policy = new SafetyPolicy({ useDefaultRules: false });
      expect(policy.validate()).toBe(true);
    });
  });

  describe('Default Rules', () => {
    it('should have default safety rules', () => {
      const policy = new SafetyPolicy({ useDefaultRules: true });
      expect(policy.validate()).toBe(true);
    });
  });

  describe('Severity Filtering', () => {
    it('should block critical violations regardless of threshold', async () => {
      const criticalRule: SafetyRule = {
        id: 'critical-rule',
        name: 'Critical Rule',
        description: 'Critical violation',
        severity: 'critical',
        check: () => false,
      };

      const policy = new SafetyPolicy({
        useDefaultRules: false,
        customRules: [criticalRule],
        blockThreshold: 'critical',
      });

      const result = await policy.evaluate({
        operation: 'apply',
        actorId: 'user-1',
        roleType: 'admin',
      });

      expect(result.allowed).toBe(false);
    });

    it('should allow low severity violations with high threshold', async () => {
      const lowRule: SafetyRule = {
        id: 'low-rule',
        name: 'Low Rule',
        description: 'Low violation',
        severity: 'low',
        check: () => false,
      };

      const policy = new SafetyPolicy({
        useDefaultRules: false,
        customRules: [lowRule],
        blockThreshold: 'high',
      });

      const result = await policy.evaluate({
        operation: 'apply',
        actorId: 'user-1',
        roleType: 'admin',
      });

      expect(result.allowed).toBe(true);
    });
  });
});
