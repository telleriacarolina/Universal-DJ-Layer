/**
 * DJEngine Integration Tests
 * Tests integration with StateManager and AuditLog
 */

import { DJEngine, DJEngineConfig, ControlResult, PreviewResult } from './dj-engine';
import { StateManager } from './state-manager';
import { AuditLog } from '../audit/audit-log';
import type { Disc, DiscMetadata } from '../discs/feature-disc';
import type { Role, RoleMetadata } from '../roles/creator';

// Mock Disc implementation for testing
class MockDisc implements Disc {
  metadata: DiscMetadata;
  private changes: any;

  constructor(id: string, changes: any) {
    this.metadata = {
      id,
      name: 'Mock Disc',
      type: 'mock',
      version: '1.0.0',
      createdAt: Date.now(),
    };
    this.changes = changes;
  }

  async apply(context: any): Promise<any> {
    return { ...this.changes };
  }

  async revert(context: any): Promise<any> {
    return {};
  }

  async preview(context: any): Promise<any> {
    return { ...this.changes };
  }

  async validate(): Promise<boolean> {
    return true;
  }
}

// Mock Role implementation for testing
class MockRole implements Role {
  metadata: RoleMetadata;

  constructor(userId: string, roleType: string = 'admin') {
    this.metadata = {
      roleId: `role-${userId}`,
      roleType,
      userId,
      grantedAt: Date.now(),
    };
  }

  hasPermission(permission: string): boolean {
    return true;
  }

  getPermissions(): string[] {
    return ['apply-control', 'revert-control', 'preview-control'];
  }

  getHierarchyLevel(): number {
    return 50;
  }
}

describe('DJEngine Integration', () => {
  let djEngine: DJEngine;
  let stateManager: StateManager;
  let auditLog: AuditLog;

  beforeEach(() => {
    stateManager = new StateManager({ maxSnapshots: 100 });
    auditLog = new AuditLog({ enabled: true, retentionDays: 90 });
    
    djEngine = new DJEngine({
      creatorId: 'creator-123',
      enableAudit: true,
      stateManager,
      auditLog,
    });
  });

  describe('Constructor & Initialization', () => {
    test('initializes with provided StateManager', () => {
      expect(djEngine).toBeDefined();
      // StateManager and AuditLog are private, but we can test their effects
    });

    test('creates StateManager if not provided', () => {
      const engine = new DJEngine({
        creatorId: 'creator-456',
      });
      expect(engine).toBeDefined();
    });

    test('creates AuditLog if not provided', () => {
      const engine = new DJEngine({
        creatorId: 'creator-456',
        enableAudit: true,
      });
      expect(engine).toBeDefined();
    });

    test('respects enableAudit config', () => {
      const engine = new DJEngine({
        creatorId: 'creator-789',
        enableAudit: false,
      });
      expect(engine).toBeDefined();
    });
  });

  describe('Preview Control', () => {
    test('previews control without mutating state', async () => {
      const disc = new MockDisc('preview-disc-1', { feature: 'test' });
      const role = new MockRole('user-1');

      const previewResult = await djEngine.previewControl(disc, role);

      expect(previewResult).toBeDefined();
      expect(previewResult.safe).toBeDefined();
      expect(previewResult.affectedSystems).toBeDefined();
      expect(previewResult.potentialIssues).toBeDefined();
      expect(previewResult.diff).toBeDefined();
      
      // Verify state is unchanged
      const currentState = await stateManager.getCurrentState();
      expect(currentState).toEqual({});
    });

    test('logs preview operation to AuditLog', async () => {
      const disc = new MockDisc('preview-disc-2', { feature: 'test' });
      const role = new MockRole('user-2');

      await djEngine.previewControl(disc, role);

      const auditEntries = await auditLog.query({ action: 'preview' });
      expect(auditEntries.length).toBeGreaterThan(0);
      
      const previewEntry = auditEntries.find(e => e.controlId === 'preview-disc-2');
      expect(previewEntry).toBeDefined();
      expect(previewEntry!.actorId).toBe('user-2');
      expect(previewEntry!.action).toBe('preview');
    });

    test('returns safe=true for valid preview', async () => {
      const disc = new MockDisc('preview-disc-3', { feature: 'valid' });
      const role = new MockRole('user-3');

      const result = await djEngine.previewControl(disc, role);

      expect(result.safe).toBe(true);
      expect(result.potentialIssues).toHaveLength(0);
    });

    test('rollback snapshot after preview', async () => {
      const disc = new MockDisc('preview-disc-4', { feature: 'rollback-test' });
      const role = new MockRole('user-4');

      const snapshotsBefore = await stateManager.listSnapshots();
      await djEngine.previewControl(disc, role);
      const snapshotsAfter = await stateManager.listSnapshots();

      // Should have created snapshots during preview but rolled back
      expect(snapshotsAfter.length).toBeGreaterThanOrEqual(snapshotsBefore.length);
    });
  });

  describe('Apply Control', () => {
    test('applies control and creates snapshot', async () => {
      const disc = new MockDisc('apply-disc-1', { feature: 'enabled' });
      const role = new MockRole('user-5');

      const snapshotsBefore = await stateManager.listSnapshots();
      const result = await djEngine.applyControl(disc, role);

      expect(result).toBeDefined();
      expect(result.controlId).toBe('apply-disc-1');
      expect(result.status).toBe('success');
      expect(result.timestamp).toBeDefined();

      const snapshotsAfter = await stateManager.listSnapshots();
      expect(snapshotsAfter.length).toBeGreaterThan(snapshotsBefore.length);
    });

    test('logs apply operation to AuditLog', async () => {
      const disc = new MockDisc('apply-disc-2', { feature: 'logging-test' });
      const role = new MockRole('user-6');

      await djEngine.applyControl(disc, role);

      const auditEntries = await auditLog.query({ 
        controlId: 'apply-disc-2',
        action: 'apply',
      });

      expect(auditEntries.length).toBe(1);
      expect(auditEntries[0].actorId).toBe('user-6');
      expect(auditEntries[0].result).toBe('success');
      expect(auditEntries[0].changes).toBeDefined();
    });

    test('updates StateManager with disc changes', async () => {
      const disc = new MockDisc('apply-disc-3', { value: 42 });
      const role = new MockRole('user-7');

      await djEngine.applyControl(disc, role);

      const currentState = await stateManager.getCurrentState();
      expect(currentState.value).toBe(42);
    });

    test('stores control in activeControls', async () => {
      const disc = new MockDisc('apply-disc-4', { active: true });
      const role = new MockRole('user-8');

      await djEngine.applyControl(disc, role);

      const controls = await djEngine.listControls({ status: 'active' });
      const appliedControl = controls.find(c => c.controlId === 'apply-disc-4');
      
      expect(appliedControl).toBeDefined();
    });

    test('applies multiple controls sequentially', async () => {
      const disc1 = new MockDisc('apply-disc-5', { feature1: 'enabled' });
      const disc2 = new MockDisc('apply-disc-6', { feature2: 'enabled' });
      const role = new MockRole('user-9');

      await djEngine.applyControl(disc1, role);
      await djEngine.applyControl(disc2, role);

      const currentState = await stateManager.getCurrentState();
      expect(currentState.feature1).toBe('enabled');
      expect(currentState.feature2).toBe('enabled');

      const controls = await djEngine.listControls({ status: 'active' });
      expect(controls.length).toBeGreaterThanOrEqual(2);
    });

    test('rollback on failure', async () => {
      const failingDisc = new MockDisc('failing-disc', { error: true });
      failingDisc.apply = async () => {
        throw new Error('Apply failed');
      };
      const role = new MockRole('user-10');

      const beforeState = await stateManager.getCurrentState();

      await expect(djEngine.applyControl(failingDisc, role))
        .rejects.toThrow('Apply failed');

      const afterState = await stateManager.getCurrentState();
      expect(afterState).toEqual(beforeState);
    });

    test('logs failure to AuditLog', async () => {
      const failingDisc = new MockDisc('failing-disc-2', { error: true });
      failingDisc.apply = async () => {
        throw new Error('Test error');
      };
      const role = new MockRole('user-11');

      await expect(djEngine.applyControl(failingDisc, role))
        .rejects.toThrow();

      const auditEntries = await auditLog.query({ 
        controlId: 'failing-disc-2',
        result: 'failure',
      });

      expect(auditEntries.length).toBe(1);
      expect(auditEntries[0].error).toContain('Test error');
    });

    test('previewFirst option runs preview before apply', async () => {
      const disc = new MockDisc('preview-first-disc', { safe: true });
      const role = new MockRole('user-12');

      const result = await djEngine.applyControl(disc, role, { previewFirst: true });

      expect(result).toBeDefined();
      expect(result.status).toBe('success');

      // Check both preview and apply were logged
      const auditEntries = await auditLog.query({ 
        controlId: 'preview-first-disc',
      });

      const hasPreview = auditEntries.some(e => e.action === 'preview');
      const hasApply = auditEntries.some(e => e.action === 'apply');

      expect(hasPreview).toBe(true);
      expect(hasApply).toBe(true);
    });
  });

  describe('Revert Control', () => {
    test('reverts applied control', async () => {
      const disc = new MockDisc('revert-disc-1', { value: 100 });
      const role = new MockRole('user-13');

      await djEngine.applyControl(disc, role);
      
      const stateAfterApply = await stateManager.getCurrentState();
      expect(stateAfterApply.value).toBe(100);

      await djEngine.revertControl('revert-disc-1', role);

      const stateAfterRevert = await stateManager.getCurrentState();
      expect(stateAfterRevert.value).toBeUndefined();
    });

    test('logs revert operation to AuditLog', async () => {
      const disc = new MockDisc('revert-disc-2', { feature: 'temp' });
      const role = new MockRole('user-14');

      await djEngine.applyControl(disc, role);
      await djEngine.revertControl('revert-disc-2', role);

      const auditEntries = await auditLog.query({ 
        controlId: 'revert-disc-2',
        action: 'revert',
      });

      expect(auditEntries.length).toBe(1);
      expect(auditEntries[0].result).toBe('success');
    });

    test('removes control from activeControls', async () => {
      const disc = new MockDisc('revert-disc-3', { active: false });
      const role = new MockRole('user-15');

      await djEngine.applyControl(disc, role);
      await djEngine.revertControl('revert-disc-3', role);

      const controls = await djEngine.listControls({ status: 'active' });
      const revertedControl = controls.find(c => c.controlId === 'revert-disc-3');

      expect(revertedControl).toBeUndefined();
    });

    test('throws error for non-existent control', async () => {
      const role = new MockRole('user-16');

      await expect(djEngine.revertControl('non-existent', role))
        .rejects.toThrow('Control not found');
    });

    test('logs failure if revert fails', async () => {
      const disc = new MockDisc('revert-fail-disc', { data: 'test' });
      const role = new MockRole('user-17');

      await djEngine.applyControl(disc, role);

      // Mock StateManager to fail revert
      jest.spyOn(stateManager, 'revertControlChanges').mockRejectedValueOnce(
        new Error('Revert failed')
      );

      await expect(djEngine.revertControl('revert-fail-disc', role))
        .rejects.toThrow('Revert failed');

      const auditEntries = await auditLog.query({ 
        controlId: 'revert-fail-disc',
        action: 'revert',
        result: 'failure',
      });

      expect(auditEntries.length).toBe(1);
    });
  });

  describe('Query Methods', () => {
    beforeEach(async () => {
      // Set up test data
      const role = new MockRole('query-user');
      await djEngine.applyControl(new MockDisc('query-disc-1', { a: 1 }), role);
      await djEngine.applyControl(new MockDisc('query-disc-2', { b: 2 }), role);
    });

    test('getControlHistory returns control history', async () => {
      const history = await djEngine.getControlHistory('query-disc-1');

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      
      const hasControlEntry = history.some(h => h.controlId === 'query-disc-1');
      expect(hasControlEntry).toBe(true);
    });

    test('getAuditTrail returns filtered audit entries', async () => {
      const trail = await djEngine.getAuditTrail({ 
        controlId: 'query-disc-1',
      });

      expect(Array.isArray(trail)).toBe(true);
      expect(trail.length).toBeGreaterThan(0);
      
      trail.forEach(entry => {
        expect(entry.controlId).toBe('query-disc-1');
      });
    });

    test('listSnapshots returns all snapshots', async () => {
      const snapshots = await djEngine.listSnapshots();

      expect(Array.isArray(snapshots)).toBe(true);
      expect(snapshots.length).toBeGreaterThan(0);
    });

    test('listSnapshots with filter', async () => {
      const snapshots = await djEngine.listSnapshots({
        controlId: 'query-disc-2',
      });

      expect(Array.isArray(snapshots)).toBe(true);
      
      // Each snapshot should include query-disc-2 in activeControls
      snapshots.forEach(snapshot => {
        if (snapshot.activeControls) {
          // Check if query-disc-2 is in active controls
          const hasControl = snapshot.activeControls.includes('query-disc-2');
          expect(hasControl).toBe(true);
        }
      });
    });

    test('getDiff returns control state diff', async () => {
      const diff = await djEngine.getDiff('query-disc-1');

      expect(diff).toBeDefined();
      expect(diff.before).toBeDefined();
      expect(diff.after).toBeDefined();
    });

    test('diffControls compares two controls', async () => {
      const diff = await djEngine.diffControls('query-disc-1', 'query-disc-2');

      expect(diff).toBeDefined();
      expect(diff.controlA).toBeDefined();
      expect(diff.controlB).toBeDefined();
      expect(diff.controlA.id).toBe('query-disc-1');
      expect(diff.controlB.id).toBe('query-disc-2');
    });

    test('diffControls throws error for non-existent control', async () => {
      await expect(djEngine.diffControls('query-disc-1', 'non-existent'))
        .rejects.toThrow('Control not found');
    });

    test('listControls returns active controls', async () => {
      const controls = await djEngine.listControls({ status: 'active' });

      expect(Array.isArray(controls)).toBe(true);
      expect(controls.length).toBeGreaterThanOrEqual(2);
      
      const hasDisc1 = controls.some(c => c.controlId === 'query-disc-1');
      const hasDisc2 = controls.some(c => c.controlId === 'query-disc-2');
      
      expect(hasDisc1).toBe(true);
      expect(hasDisc2).toBe(true);
    });

    test('getAuditLog with time range', async () => {
      const now = Date.now();
      const entries = await djEngine.getAuditLog({
        timeRange: { start: now - 10000, end: now + 1000 },
      });

      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('Event Coordination', () => {
    test('StateManager events are set up', async () => {
      // Events are set up in constructor
      // We can test this indirectly by checking operations work
      const disc = new MockDisc('event-disc-1', { test: 'events' });
      const role = new MockRole('event-user');

      await djEngine.applyControl(disc, role);

      const currentState = await stateManager.getCurrentState();
      expect(currentState.test).toBe('events');
    });

    test('AuditLog events are set up', async () => {
      const disc = new MockDisc('event-disc-2', { audit: 'events' });
      const role = new MockRole('audit-user');

      await djEngine.applyControl(disc, role);

      const entries = await auditLog.query({ controlId: 'event-disc-2' });
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Scenarios', () => {
    test('apply, preview, revert workflow', async () => {
      const role = new MockRole('workflow-user');
      
      // Apply first control
      const disc1 = new MockDisc('workflow-disc-1', { step: 1 });
      await djEngine.applyControl(disc1, role);

      // Preview second control
      const disc2 = new MockDisc('workflow-disc-2', { step: 2 });
      const preview = await djEngine.previewControl(disc2, role);
      expect(preview.safe).toBe(true);

      // Apply second control
      await djEngine.applyControl(disc2, role);

      // Verify state
      const state = await stateManager.getCurrentState();
      expect(state.step).toBe(2);

      // Revert second control
      await djEngine.revertControl('workflow-disc-2', role);

      // Verify state after revert
      const stateAfterRevert = await stateManager.getCurrentState();
      expect(stateAfterRevert.step).toBe(1);
    });

    test('audit trail shows complete history', async () => {
      const role = new MockRole('history-user');
      const disc = new MockDisc('history-disc', { version: 1 });

      await djEngine.applyControl(disc, role);
      await djEngine.revertControl('history-disc', role);

      const trail = await djEngine.getAuditTrail({ 
        controlId: 'history-disc',
      });

      expect(trail.length).toBe(2);
      
      const applyEntry = trail.find(e => e.action === 'apply');
      const revertEntry = trail.find(e => e.action === 'revert');

      expect(applyEntry).toBeDefined();
      expect(revertEntry).toBeDefined();
    });

    test('snapshots track control lifecycle', async () => {
      const role = new MockRole('snapshot-user');
      const disc = new MockDisc('snapshot-disc', { tracked: true });

      const snapshotsBefore = await stateManager.listSnapshots();

      await djEngine.applyControl(disc, role);
      const snapshotsAfterApply = await stateManager.listSnapshots();

      await djEngine.revertControl('snapshot-disc', role);
      const snapshotsAfterRevert = await stateManager.listSnapshots();

      expect(snapshotsAfterApply.length).toBeGreaterThan(snapshotsBefore.length);
      expect(snapshotsAfterRevert.length).toBeGreaterThan(snapshotsAfterApply.length);
    });
  });
});
