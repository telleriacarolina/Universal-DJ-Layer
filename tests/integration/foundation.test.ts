import { StateManager } from '../../core/state-manager';
import { AuditLog } from '../../audit/audit-log';

describe('StateManager + AuditLog Integration', () => {
  let stateManager: StateManager;
  let auditLog: AuditLog;

  beforeEach(() => {
    stateManager = new StateManager({ maxSnapshots: 50 });
    auditLog = new AuditLog({ retentionDays: 30 });
  });

  describe('State Changes and Audit Logging', () => {
    it('audit log captures state changes from StateManager', async () => {
      const disc = { name: 'test-disc' } as any;
      const stateChange = stateManager.applyDiscChanges('control-1', disc);
      
      // Log the state change
      await auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        controlId: 'control-1',
        discType: disc.name,
        result: 'success',
        changes: {
          before: stateChange.before,
          after: stateChange.after,
        },
      });
      
      const entries = await auditLog.query({ controlId: 'control-1' });
      
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('apply');
      expect(entries[0].changes?.before).toEqual(stateChange.before);
      expect(entries[0].changes?.after).toEqual(stateChange.after);
    });

    it('rollback is logged in audit trail', async () => {
      const disc = { name: 'test-disc' } as any;
      
      // Apply change
      stateManager.applyDiscChanges('control-1', disc);
      const snapshot = stateManager.createSnapshot({ reason: 'before rollback' });
      
      await auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        controlId: 'control-1',
        result: 'success',
      });
      
      // Modify state again
      stateManager['currentState'] = { modified: true };
      
      // Rollback
      stateManager.rollbackToSnapshot(snapshot.snapshotId);
      
      await auditLog.log({
        action: 'revert',
        actorId: 'user-123',
        actorRole: 'admin',
        controlId: 'control-1',
        result: 'success',
        metadata: { snapshotId: snapshot.snapshotId },
      });
      
      const entries = await auditLog.query({ controlId: 'control-1' });
      
      expect(entries.length).toBe(2);
      expect(entries.some(e => e.action === 'apply')).toBe(true);
      expect(entries.some(e => e.action === 'revert')).toBe(true);
    });

    it('snapshot creation is logged', async () => {
      const snapshot = stateManager.createSnapshot({ createdBy: 'user-123' });
      
      await auditLog.log({
        action: 'preview', // Using preview as a proxy for snapshot creation
        actorId: 'user-123',
        actorRole: 'admin',
        result: 'success',
        metadata: {
          snapshotId: snapshot.snapshotId,
          timestamp: snapshot.timestamp,
        },
      });
      
      const entries = await auditLog.query({ actorId: 'user-123' });
      
      expect(entries.length).toBe(1);
      expect(entries[0].metadata?.snapshotId).toBe(snapshot.snapshotId);
    });
  });

  describe('State Diffs and Audit Logs', () => {
    it('state diffs match audit log changes', async () => {
      stateManager['currentState'] = { value: 1 };
      const snapshot1 = stateManager.createSnapshot();
      
      stateManager['currentState'] = { value: 2 };
      const snapshot2 = stateManager.createSnapshot();
      
      const diffs = await stateManager.diff(snapshot1.snapshotId, snapshot2.snapshotId);
      
      // Log with diff - just verify we can store and retrieve
      await auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        result: 'success',
        metadata: {
          diffCount: diffs.length,
          hasChanges: diffs.length > 0,
        },
      });
      
      const entries = await auditLog.query();
      
      expect(entries[0].metadata?.diffCount).toBe(diffs.length);
      expect(entries[0].metadata?.hasChanges).toBe(true);
    });

    it('audit query retrieves related snapshots', async () => {
      const disc = { name: 'test-disc' } as any;
      
      // Apply several changes
      for (let i = 0; i < 3; i++) {
        stateManager.applyDiscChanges(`control-${i}`, disc);
        const snapshot = stateManager.createSnapshot({ iteration: i });
        
        await auditLog.log({
          action: 'apply',
          actorId: 'user-123',
          actorRole: 'admin',
          controlId: `control-${i}`,
          result: 'success',
          metadata: { snapshotId: snapshot.snapshotId },
        });
      }
      
      const entries = await auditLog.query({ actorId: 'user-123' });
      const snapshotIds = entries.map(e => e.metadata?.snapshotId);
      
      // Verify all snapshots can be retrieved
      for (const snapshotId of snapshotIds) {
        const snapshot = stateManager.getSnapshot(snapshotId);
        expect(snapshot).not.toBeNull();
      }
    });
  });

  describe('Event Coordination', () => {
    it('state manager events trigger audit logging', (done) => {
      let stateChangeLogged = false;
      
      stateManager.on('state-changed', async (stateChange) => {
        await auditLog.log({
          action: 'apply',
          actorId: 'user-123',
          actorRole: 'admin',
          controlId: stateChange.controlId,
          result: 'success',
        });
        
        stateChangeLogged = true;
      });
      
      const disc = { name: 'test-disc' } as any;
      stateManager.applyDiscChanges('control-1', disc);
      
      setTimeout(() => {
        expect(stateChangeLogged).toBe(true);
        done();
      }, 100);
    });

    it('snapshot events trigger audit entries', (done) => {
      let snapshotLogged = false;
      
      stateManager.on('snapshot-created', async (snapshot) => {
        await auditLog.log({
          action: 'preview',
          actorId: 'system',
          actorRole: 'system',
          result: 'success',
          metadata: { snapshotId: snapshot.snapshotId },
        });
        
        snapshotLogged = true;
      });
      
      stateManager.createSnapshot();
      
      setTimeout(() => {
        expect(snapshotLogged).toBe(true);
        done();
      }, 100);
    });

    it('rollback events create audit entries', (done) => {
      const snapshot = stateManager.createSnapshot();
      let rollbackLogged = false;
      
      stateManager.on('snapshot-restored', async (event) => {
        await auditLog.log({
          action: 'revert',
          actorId: 'user-123',
          actorRole: 'admin',
          result: 'success',
          metadata: { snapshotId: event.snapshotId },
        });
        
        rollbackLogged = true;
      });
      
      stateManager.rollbackToSnapshot(snapshot.snapshotId);
      
      setTimeout(() => {
        expect(rollbackLogged).toBe(true);
        done();
      }, 100);
    });
  });

  describe('Complete Workflow', () => {
    it('tracks complete control lifecycle', async () => {
      const disc = { name: 'feature-toggle' } as any;
      const actorId = 'user-123';
      const controlId = 'ctrl-feature-1';
      
      // 1. Create initial snapshot
      const initialSnapshot = stateManager.createSnapshot({ reason: 'initial' });
      await auditLog.log({
        action: 'preview',
        actorId,
        actorRole: 'admin',
        result: 'success',
        metadata: { snapshotId: initialSnapshot.snapshotId },
      });
      
      // 2. Apply control
      const stateChange = stateManager.applyDiscChanges(controlId, disc);
      await auditLog.log({
        action: 'apply',
        actorId,
        actorRole: 'admin',
        controlId,
        discType: disc.name,
        result: 'success',
        changes: {
          before: stateChange.before,
          after: stateChange.after,
        },
      });
      
      // 3. Create snapshot after apply
      const afterApplySnapshot = stateManager.createSnapshot({ reason: 'after apply' });
      await auditLog.log({
        action: 'preview',
        actorId,
        actorRole: 'admin',
        controlId,
        result: 'success',
        metadata: { snapshotId: afterApplySnapshot.snapshotId },
      });
      
      // 4. Revert control
      const revertChange = stateManager.revertControlChanges(controlId);
      await auditLog.log({
        action: 'revert',
        actorId,
        actorRole: 'admin',
        controlId,
        result: 'success',
        changes: {
          before: revertChange.before,
          after: revertChange.after,
        },
      });
      
      // Verify complete audit trail
      const trail = await auditLog.getControlAuditTrail(controlId);
      
      expect(trail.length).toBe(3); // apply, snapshot, revert
      expect(trail[0].action).toBe('apply');
      expect(trail[trail.length - 1].action).toBe('revert');
      
      // Verify state history
      const history = stateManager.getControlHistory(controlId);
      expect(history.length).toBe(2); // apply and revert
    });

    it('handles concurrent operations', async () => {
      const disc = { name: 'test-disc' } as any;
      
      // Simulate concurrent state changes and logging
      const operations = [];
      
      for (let i = 0; i < 5; i++) {
        const controlId = `control-${i}`;
        
        operations.push(
          (async () => {
            const stateChange = stateManager.applyDiscChanges(controlId, disc);
            
            await auditLog.log({
              action: 'apply',
              actorId: `user-${i}`,
              actorRole: 'admin',
              controlId,
              result: 'success',
              changes: {
                before: stateChange.before,
                after: stateChange.after,
              },
            });
          })()
        );
      }
      
      await Promise.all(operations);
      
      // Verify all operations completed
      const entries = await auditLog.query();
      expect(entries.length).toBe(5);
      
      const snapshots = await stateManager.listSnapshots();
      expect(snapshots.length).toBe(5);
    });
  });

  describe('Cleanup Coordination', () => {
    it('cleanup operations are synchronized', async () => {
      const oldTimestamp = Date.now() - (100 * 24 * 60 * 60 * 1000);
      
      // Create old snapshot
      const oldSnapshot = stateManager.createSnapshot();
      oldSnapshot.timestamp = oldTimestamp;
      stateManager['snapshots'].set(oldSnapshot.snapshotId, oldSnapshot);
      
      // Create old audit entry
      const oldEntry = await auditLog.log({
        action: 'apply',
        actorId: 'user-old',
        actorRole: 'admin',
        result: 'success',
      });
      const entry = await auditLog.getEntry(oldEntry);
      if (entry) {
        entry.timestamp = oldTimestamp;
      }
      
      // Cleanup both
      const removedSnapshots = await stateManager.cleanup(30);
      const removedEntries = await auditLog.cleanup(30);
      
      expect(removedSnapshots).toBe(1);
      expect(removedEntries).toBe(1);
    });

    it('emits cleanup events', (done) => {
      let stateCleanupEmitted = false;
      let auditCleanupEmitted = false;
      
      const oldTimestamp = Date.now() - (100 * 24 * 60 * 60 * 1000);
      
      stateManager.on('snapshot-deleted', () => {
        stateCleanupEmitted = true;
      });
      
      auditLog.on('audit-cleanup', () => {
        auditCleanupEmitted = true;
      });
      
      // Create old data
      const oldSnapshot = stateManager.createSnapshot();
      oldSnapshot.timestamp = oldTimestamp;
      stateManager['snapshots'].set(oldSnapshot.snapshotId, oldSnapshot);
      
      const oldEntry: any = {
        entryId: 'old-entry',
        timestamp: oldTimestamp,
        action: 'apply',
        actorId: 'user-old',
        actorRole: 'admin',
        result: 'success',
      };
      auditLog['entries'].push(oldEntry);
      
      Promise.all([
        stateManager.cleanup(30),
        auditLog.cleanup(30),
      ]).then(() => {
        expect(stateCleanupEmitted).toBe(true);
        expect(auditCleanupEmitted).toBe(true);
        done();
      });
    });
  });

  describe('Data Consistency', () => {
    it('maintains referential integrity', async () => {
      const disc = { name: 'test-disc' } as any;
      const controlId = 'control-1';
      
      // Apply control and create snapshot
      stateManager.applyDiscChanges(controlId, disc);
      const snapshot = stateManager.createSnapshot({ controlId });
      
      // Log in audit
      await auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        controlId,
        result: 'success',
        metadata: { snapshotId: snapshot.snapshotId },
      });
      
      // Verify references
      const auditEntries = await auditLog.query({ controlId });
      const auditSnapshotId = auditEntries[0].metadata?.snapshotId;
      
      const retrievedSnapshot = stateManager.getSnapshot(auditSnapshotId);
      expect(retrievedSnapshot).not.toBeNull();
      expect(retrievedSnapshot!.snapshotId).toBe(snapshot.snapshotId);
    });

    it('handles missing references gracefully', async () => {
      await auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        controlId: 'control-1',
        result: 'success',
        metadata: { snapshotId: 'non-existent' },
      });
      
      const entries = await auditLog.query();
      const snapshotId = entries[0].metadata?.snapshotId;
      
      const snapshot = stateManager.getSnapshot(snapshotId);
      expect(snapshot).toBeNull(); // Should handle gracefully
    });
  });

  describe('Performance', () => {
    it('handles large numbers of operations efficiently', async () => {
      const startTime = Date.now();
      const operationCount = 100;
      
      const disc = { name: 'test-disc' } as any;
      
      for (let i = 0; i < operationCount; i++) {
        stateManager.applyDiscChanges(`control-${i}`, disc);
        
        await auditLog.log({
          action: 'apply',
          actorId: 'user-123',
          actorRole: 'admin',
          controlId: `control-${i}`,
          result: 'success',
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 5 seconds for 100 ops)
      expect(duration).toBeLessThan(5000);
      
      // Verify all operations completed
      const entries = await auditLog.query();
      expect(entries.length).toBe(operationCount);
      
      const snapshots = await stateManager.listSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(operationCount);
    });
  });
});
