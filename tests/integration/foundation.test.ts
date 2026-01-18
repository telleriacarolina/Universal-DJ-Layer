import { StateManager } from '../../core/state-manager';
import { AuditLog } from '../../audit/audit-log';

describe('StateManager + AuditLog Integration', () => {
  let stateManager: StateManager;
  let auditLog: AuditLog;

  beforeEach(() => {
    stateManager = new StateManager();
    auditLog = new AuditLog();
  });

  test('audit log captures state changes from StateManager', async () => {
    // Apply a disc change through StateManager
    const stateChange = await stateManager.applyDiscChanges('control-1', { 
      feature: 'test',
      value: 42 
    });

    // Log the state change in audit log
    const entryId = await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      controlId: stateChange.controlId,
      result: 'success',
      changes: {
        before: stateChange.before,
        after: stateChange.after,
      },
    });

    // Verify audit entry was created
    const entry = await auditLog.getEntry(entryId);
    expect(entry).not.toBeNull();
    expect(entry!.controlId).toBe('control-1');
    expect(entry!.changes).toHaveProperty('before');
    expect(entry!.changes).toHaveProperty('after');
    expect(entry!.changes!.after).toEqual(stateChange.after);
  });

  test('rollback is logged in audit trail', async () => {
    // Create initial state
    await stateManager.applyDiscChanges('control-1', { value: 1 });
    const snapshot = await stateManager.createSnapshot();

    // Log snapshot creation
    await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      controlId: 'control-1',
      result: 'success',
      metadata: { snapshotId: snapshot.snapshotId },
    });

    // Apply another change
    await stateManager.applyDiscChanges('control-2', { value: 2 });

    // Rollback
    await stateManager.rollbackToSnapshot(snapshot.snapshotId);

    // Log the rollback
    await auditLog.log({
      action: 'revert',
      actorId: 'user-123',
      actorRole: 'admin',
      result: 'success',
      metadata: { snapshotId: snapshot.snapshotId, reason: 'rollback' },
    });

    // Verify audit trail
    const entries = await auditLog.query();
    const rollbackEntry = entries.find(e => 
      e.action === 'revert' && 
      e.metadata?.snapshotId === snapshot.snapshotId
    );

    expect(rollbackEntry).toBeDefined();
    expect(rollbackEntry!.result).toBe('success');
  });

  test('snapshot creation is logged', async () => {
    // Create snapshot
    const snapshot = await stateManager.createSnapshot({ reason: 'before major change' });

    // Log snapshot creation
    const entryId = await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      result: 'success',
      metadata: {
        type: 'snapshot',
        snapshotId: snapshot.snapshotId,
        reason: snapshot.metadata?.reason,
      },
    });

    // Verify
    const entry = await auditLog.getEntry(entryId);
    expect(entry!.metadata?.snapshotId).toBe(snapshot.snapshotId);
    expect(entry!.metadata?.reason).toBe('before major change');
  });

  test('state diffs match audit log changes', async () => {
    // Apply first change
    await stateManager.applyDiscChanges('control-1', { value: 1, feature: 'a' });
    const snapshot1 = await stateManager.createSnapshot();

    // Apply second change
    await stateManager.applyDiscChanges('control-2', { value: 2, feature: 'b', newProp: 'test' });
    const snapshot2 = await stateManager.createSnapshot();

    // Calculate diff
    const diffs = await stateManager.diff(snapshot1.snapshotId, snapshot2.snapshotId);

    // Log with diff information
    await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      controlId: 'control-2',
      result: 'success',
      changes: {
        diffs: diffs as any,
        snapshotA: snapshot1.snapshotId,
        snapshotB: snapshot2.snapshotId,
      },
    });

    // Verify audit entry contains diffs
    const entries = await auditLog.query({ controlId: 'control-2' });
    expect(entries.length).toBeGreaterThan(0);
    
    const entry = entries[0];
    expect(entry.changes).toHaveProperty('diffs');
    // Diffs is stored as a property, it may be serialized
    expect(entry.changes!.diffs).toBeDefined();
    expect(entry.changes!.snapshotA).toBe(snapshot1.snapshotId);
  });

  test('audit query retrieves related snapshots', async () => {
    // Create multiple snapshots with controls
    await stateManager.applyDiscChanges('control-1', { feature: 'a' });
    const snapshot1 = await stateManager.createSnapshot();

    await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      controlId: 'control-1',
      result: 'success',
      metadata: { snapshotId: snapshot1.snapshotId },
    });

    await stateManager.applyDiscChanges('control-2', { feature: 'b' });
    const snapshot2 = await stateManager.createSnapshot();

    await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      controlId: 'control-2',
      result: 'success',
      metadata: { snapshotId: snapshot2.snapshotId },
    });

    // Query audit log
    const entries = await auditLog.query({ actorId: 'user-123' });

    // Verify we can retrieve snapshots from audit metadata
    const snapshotIds = entries
      .map(e => e.metadata?.snapshotId)
      .filter(id => id !== undefined);

    expect(snapshotIds.length).toBe(2);

    // Verify snapshots exist in StateManager
    for (const snapshotId of snapshotIds) {
      const snapshot = await stateManager.getSnapshot(snapshotId!);
      expect(snapshot).not.toBeNull();
    }
  });

  test('complete workflow: apply, snapshot, audit, revert, audit', async () => {
    // 1. Apply initial change
    const change1 = await stateManager.applyDiscChanges('control-1', { value: 1 });
    await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      controlId: 'control-1',
      result: 'success',
      changes: { before: change1.before, after: change1.after },
    });

    // 2. Create snapshot
    const snapshot = await stateManager.createSnapshot({ checkpoint: 'safe-state' });
    await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      result: 'success',
      metadata: { type: 'snapshot', snapshotId: snapshot.snapshotId },
    });

    // 3. Apply another change
    const change2 = await stateManager.applyDiscChanges('control-2', { value: 2 });
    await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      controlId: 'control-2',
      result: 'success',
      changes: { before: change2.before, after: change2.after },
    });

    // 4. Revert the last change
    const revertChange = await stateManager.revertControlChanges('control-2');
    await auditLog.log({
      action: 'revert',
      actorId: 'user-123',
      actorRole: 'admin',
      controlId: 'control-2',
      result: 'success',
      changes: { before: revertChange.before, after: revertChange.after },
    });

    // Verify complete audit trail
    const allEntries = await auditLog.query({ actorId: 'user-123', sortDirection: 'asc' });
    expect(allEntries.length).toBe(4);

    // Verify order of operations
    expect(allEntries[0].controlId).toBe('control-1');
    expect(allEntries[0].action).toBe('apply');
    
    expect(allEntries[1].metadata?.type).toBe('snapshot');
    
    expect(allEntries[2].controlId).toBe('control-2');
    expect(allEntries[2].action).toBe('apply');
    
    expect(allEntries[3].controlId).toBe('control-2');
    expect(allEntries[3].action).toBe('revert');
  });

  test('event integration between modules', async () => {
    const stateEvents: string[] = [];
    const auditEvents: string[] = [];

    // Listen to StateManager events
    stateManager.on('snapshot-created', () => stateEvents.push('snapshot-created'));
    stateManager.on('state-changed', () => stateEvents.push('state-changed'));
    stateManager.on('snapshot-restored', () => stateEvents.push('snapshot-restored'));

    // Listen to AuditLog events
    auditLog.on('audit-logged', () => auditEvents.push('audit-logged'));

    // Perform operations
    await stateManager.applyDiscChanges('control-1', { value: 1 });
    await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      controlId: 'control-1',
      result: 'success',
    });

    const snapshot = await stateManager.createSnapshot();
    await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      result: 'success',
      metadata: { snapshotId: snapshot.snapshotId },
    });

    await stateManager.rollbackToSnapshot(snapshot.snapshotId);
    await auditLog.log({
      action: 'revert',
      actorId: 'user-123',
      actorRole: 'admin',
      result: 'success',
    });

    // Verify events were emitted
    expect(stateEvents).toContain('snapshot-created');
    expect(stateEvents).toContain('state-changed');
    expect(stateEvents).toContain('snapshot-restored');
    expect(auditEvents.length).toBeGreaterThanOrEqual(3);
  });

  test('streaming audit logs for real-time state monitoring', async () => {
    const streamedEntries: any[] = [];

    // Set up streaming
    await auditLog.stream((entry) => {
      streamedEntries.push({
        action: entry.action,
        controlId: entry.controlId,
        timestamp: entry.timestamp,
      });
    });

    // Perform state changes
    await stateManager.applyDiscChanges('control-1', { value: 1 });
    await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      controlId: 'control-1',
      result: 'success',
    });

    await stateManager.applyDiscChanges('control-2', { value: 2 });
    await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      controlId: 'control-2',
      result: 'success',
    });

    // Verify streamed data
    expect(streamedEntries.length).toBe(2);
    expect(streamedEntries[0].controlId).toBe('control-1');
    expect(streamedEntries[1].controlId).toBe('control-2');
  });

  test('cleanup policies work together', async () => {
    // Create state and audit entries
    await stateManager.applyDiscChanges('control-1', { value: 1 });
    const snapshot = await stateManager.createSnapshot();

    await auditLog.log({
      action: 'apply',
      actorId: 'user-123',
      actorRole: 'admin',
      controlId: 'control-1',
      result: 'success',
    });

    // Get counts before cleanup
    const snapshotsBefore = await stateManager.listSnapshots();
    const entriesBefore = await auditLog.query();

    // Cleanup with very generous retention (should not remove recent items)
    const removedSnapshots = await stateManager.cleanup(365);
    const removedAuditEntries = await auditLog.cleanup(365);

    // Verify cleanup worked - recent items should remain
    const remainingSnapshots = await stateManager.listSnapshots();
    const remainingEntries = await auditLog.query();

    expect(removedSnapshots).toBe(0); // Nothing should be removed with 365 day retention
    expect(removedAuditEntries).toBe(0);
    expect(remainingSnapshots.length).toBe(snapshotsBefore.length);
    expect(remainingEntries.length).toBe(entriesBefore.length);
  });
});
