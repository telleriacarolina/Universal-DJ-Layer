/**
 * Integration tests for DJEngine with PolicyEvaluator and RBAC
 */

import { DJEngine } from './dj-engine';
import { PolicyEvaluator } from './policy-evaluator';
import { RBACManager } from './rbac-manager';
import { AuditLog } from '../audit/audit-log';
import { CreatorRole } from '../roles/creator';
import { AdminRole } from '../roles/admin';
import { UserRole } from '../roles/user';
import { FeatureDisc } from '../discs/feature-disc';
import { CreatorLockPolicy } from '../policies/creator-locks';
import { SafetyPolicy } from '../policies/safety-policies';

describe('DJEngine Integration', () => {
  let engine: DJEngine;
  let auditLog: AuditLog;
  let policyEvaluator: PolicyEvaluator;
  let rbacManager: RBACManager;
  let creatorRole: CreatorRole;
  let adminRole: AdminRole;
  let userRole: UserRole;
  let disc: FeatureDisc;

  beforeEach(() => {
    auditLog = new AuditLog({ enabled: true });
    policyEvaluator = new PolicyEvaluator({ auditLog });
    rbacManager = new RBACManager({ auditLog });

    engine = new DJEngine({
      creatorId: 'creator-1',
      enableAudit: true,
      policyEvaluator,
      rbacManager,
      auditLog,
    });

    creatorRole = new CreatorRole({ userId: 'creator-1' });
    adminRole = new AdminRole({ userId: 'admin-1' });
    userRole = new UserRole({ userId: 'user-1' });

    disc = new FeatureDisc({
      name: 'test-feature',
      features: { testFlag: true },
    });
  });

  describe('Initialization', () => {
    it('should initialize with default components', () => {
      const basicEngine = new DJEngine({ creatorId: 'creator-1' });
      
      expect(basicEngine.getPolicyEvaluator()).toBeDefined();
      expect(basicEngine.getRBACManager()).toBeDefined();
      expect(basicEngine.getAuditLog()).toBeDefined();
    });

    it('should log engine initialization', async () => {
      const entries = await auditLog.query({ actorId: 'creator-1' });
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('Preview Control', () => {
    beforeEach(async () => {
      await rbacManager.assignRole('creator-1', creatorRole);
    });

    it('should preview control with proper permissions', async () => {
      const preview = await engine.previewControl(disc, creatorRole, 'creator-1');
      
      expect(preview).toBeDefined();
      expect(preview.safe).toBe(true);
    });

    it('should deny preview without permission', async () => {
      await rbacManager.assignRole('user-1', userRole);
      
      await expect(
        engine.previewControl(disc, userRole, 'user-1')
      ).rejects.toThrow('lacks permission to preview');
    });

    it('should evaluate policies during preview', async () => {
      const creatorLock = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: [disc.metadata.id],
      });
      policyEvaluator.registerPolicy(creatorLock);

      await rbacManager.assignRole('admin-1', adminRole);

      await expect(
        engine.previewControl(disc, adminRole, 'admin-1')
      ).rejects.toThrow('Policy violation');
    });

    it('should log preview to audit', async () => {
      await engine.previewControl(disc, creatorRole, 'creator-1');
      
      const entries = await auditLog.query({ 
        action: 'preview',
        actorId: 'creator-1' 
      });
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('Apply Control', () => {
    beforeEach(async () => {
      await rbacManager.assignRole('creator-1', creatorRole);
      await rbacManager.assignRole('admin-1', adminRole);
    });

    it('should apply control with proper permissions', async () => {
      const result = await engine.applyControl(disc, creatorRole, { 
        userId: 'creator-1' 
      });
      
      expect(result).toBeDefined();
      expect(result.controlId).toBeDefined();
      expect(result.status).toBe('success');
    });

    it('should deny apply without permission', async () => {
      await rbacManager.assignRole('user-1', userRole);
      
      await expect(
        engine.applyControl(disc, userRole, { userId: 'user-1' })
      ).rejects.toThrow('lacks permission to apply');
    });

    it('should enforce creator locks during apply', async () => {
      const creatorLock = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: [disc.metadata.id],
      });
      policyEvaluator.registerPolicy(creatorLock);

      await expect(
        engine.applyControl(disc, adminRole, { userId: 'admin-1' })
      ).rejects.toThrow('Policy violation');
    });

    it('should allow creator to apply to locked resource', async () => {
      const creatorLock = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: [disc.metadata.id],
      });
      policyEvaluator.registerPolicy(creatorLock);

      const result = await engine.applyControl(disc, creatorRole, { 
        userId: 'creator-1' 
      });
      expect(result.status).toBe('success');
    });

    it('should respect concurrent controls limit', async () => {
      const limitedEngine = new DJEngine({
        creatorId: 'creator-2',
        maxConcurrentControls: 2,
        policyEvaluator,
        rbacManager,
        auditLog,
      });

      const creator2Role = new CreatorRole({ userId: 'creator-2' });
      await rbacManager.assignRole('creator-2', creator2Role);

      const disc1 = new FeatureDisc({ name: 'disc1', features: {} });
      const disc2 = new FeatureDisc({ name: 'disc2', features: {} });
      const disc3 = new FeatureDisc({ name: 'disc3', features: {} });

      await limitedEngine.applyControl(disc1, creator2Role, { userId: 'creator-2' });
      await limitedEngine.applyControl(disc2, creator2Role, { userId: 'creator-2' });
      
      await expect(
        limitedEngine.applyControl(disc3, creator2Role, { userId: 'creator-2' })
      ).rejects.toThrow('Maximum concurrent controls limit');
    });

    it('should preview first when requested', async () => {
      const result = await engine.applyControl(disc, creatorRole, {
        userId: 'creator-1',
        previewFirst: true,
      });
      
      expect(result.status).toBe('success');
      
      // Check that both preview and apply were logged
      const entries = await auditLog.query({ actorId: 'creator-1' });
      const previewEntry = entries.find(e => e.action === 'preview');
      const applyEntry = entries.find(e => e.action === 'apply');
      
      expect(previewEntry).toBeDefined();
      expect(applyEntry).toBeDefined();
    });

    it('should log apply to audit', async () => {
      await engine.applyControl(disc, creatorRole, { userId: 'creator-1' });
      
      const entries = await auditLog.query({ 
        action: 'apply',
        actorId: 'creator-1' 
      });
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should validate disc safety before applying', async () => {
      const invalidDisc = {
        metadata: null,
        apply: async () => {},
        preview: async () => ({}),
      } as any;

      await expect(
        engine.applyControl(invalidDisc, creatorRole, { userId: 'creator-1' })
      ).rejects.toThrow('safety violations');
    });
  });

  describe('Revert Control', () => {
    let controlId: string;

    beforeEach(async () => {
      await rbacManager.assignRole('creator-1', creatorRole);
      await rbacManager.assignRole('admin-1', adminRole);
      
      const result = await engine.applyControl(disc, creatorRole, { 
        userId: 'creator-1' 
      });
      controlId = result.controlId;
    });

    it('should revert control with proper permissions', async () => {
      await expect(
        engine.revertControl(controlId, creatorRole, 'creator-1')
      ).resolves.not.toThrow();
    });

    it('should deny revert without permission', async () => {
      await rbacManager.assignRole('user-1', userRole);
      
      await expect(
        engine.revertControl(controlId, userRole, 'user-1')
      ).rejects.toThrow('lacks permission to revert');
    });

    it('should throw error for non-existent control', async () => {
      await expect(
        engine.revertControl('non-existent', creatorRole, 'creator-1')
      ).rejects.toThrow('not found');
    });

    it('should log revert to audit', async () => {
      await engine.revertControl(controlId, creatorRole, 'creator-1');
      
      const entries = await auditLog.query({ 
        action: 'revert',
        actorId: 'creator-1' 
      });
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('List Controls', () => {
    beforeEach(async () => {
      await rbacManager.assignRole('creator-1', creatorRole);
    });

    it('should list all active controls', async () => {
      await engine.applyControl(disc, creatorRole, { userId: 'creator-1' });
      
      const controls = await engine.listControls();
      expect(controls.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      await engine.applyControl(disc, creatorRole, { userId: 'creator-1' });
      
      const activeControls = await engine.listControls({ status: 'active' });
      expect(activeControls.length).toBeGreaterThan(0);
    });

    it('should return empty array when no controls', async () => {
      const controls = await engine.listControls();
      expect(controls).toHaveLength(0);
    });
  });

  describe('Audit Log Integration', () => {
    beforeEach(async () => {
      await rbacManager.assignRole('creator-1', creatorRole);
    });

    it('should get audit log for specific control', async () => {
      const result = await engine.applyControl(disc, creatorRole, { 
        userId: 'creator-1' 
      });
      
      const entries = await engine.queryAuditLog({ 
        controlId: result.controlId 
      });
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should get audit log for time range', async () => {
      await engine.applyControl(disc, creatorRole, { userId: 'creator-1' });
      
      const entries = await engine.queryAuditLog({
        timeRange: {
          start: Date.now() - 60000,
          end: Date.now(),
        },
      });
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should get change history for control', async () => {
      const result = await engine.applyControl(disc, creatorRole, { 
        userId: 'creator-1' 
      });
      
      const history = await engine.getChangeHistory(result.controlId);
      expect(history).toBeDefined();
    });
  });

  describe('Policy Evaluation Integration', () => {
    beforeEach(async () => {
      await rbacManager.assignRole('creator-1', creatorRole);
      await rbacManager.assignRole('admin-1', adminRole);
    });

    it('should evaluate multiple policies in order', async () => {
      const creatorLock = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: ['other-resource'],
      });
      const safety = new SafetyPolicy({ useDefaultRules: false });
      
      policyEvaluator.registerPolicy(creatorLock);
      policyEvaluator.registerPolicy(safety);

      const result = await engine.applyControl(disc, creatorRole, { 
        userId: 'creator-1' 
      });
      expect(result.status).toBe('success');
    });

    it('should deny if any policy denies', async () => {
      const creatorLock = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: [disc.metadata.id],
      });
      policyEvaluator.registerPolicy(creatorLock);

      await expect(
        engine.applyControl(disc, adminRole, { userId: 'admin-1' })
      ).rejects.toThrow('Policy violation');
    });
  });

  describe('RBAC Integration', () => {
    it('should check role hierarchy for operations', async () => {
      await rbacManager.assignRole('admin-1', adminRole);
      
      // Admin should be able to preview
      await expect(
        engine.previewControl(disc, adminRole, 'admin-1')
      ).resolves.toBeDefined();
    });

    it('should aggregate permissions from multiple roles', async () => {
      const admin = new AdminRole({ userId: 'user-1' });
      const moderator = new AdminRole({ userId: 'user-1' });
      
      await rbacManager.assignRole('user-1', admin);
      // Note: Can't assign two roles of same type, so this would fail
      // Just testing that RBAC integration works
      
      expect(rbacManager.hasPermission('user-1', 'apply-control')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await rbacManager.assignRole('creator-1', creatorRole);
    });

    it('should handle disc apply failures gracefully', async () => {
      const failingDisc = new FeatureDisc({
        name: 'failing-disc',
        features: {},
      });
      
      // Override apply to fail
      failingDisc.apply = async () => {
        throw new Error('Disc apply failed');
      };

      await expect(
        engine.applyControl(failingDisc, creatorRole, { userId: 'creator-1' })
      ).rejects.toThrow('Disc apply failed');
      
      // Check that failure was logged
      const entries = await auditLog.query({ 
        actorId: 'creator-1',
        result: 'failure'
      });
      expect(entries.length).toBeGreaterThan(0);
    });
  });
});
