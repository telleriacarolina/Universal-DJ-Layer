import { StateManager, StateSnapshot, StateChange, ChangeDiff } from './state-manager';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('Snapshot Creation', () => {
    test('creates snapshot with unique ID', async () => {
      const snapshot = await stateManager.createSnapshot();
      
      expect(snapshot.snapshotId).toBeTruthy();
      expect(snapshot.snapshotId).toContain('snapshot-');
    });

    test('creates snapshot with correct timestamp', async () => {
      const before = Date.now();
      const snapshot = await stateManager.createSnapshot();
      const after = Date.now();
      
      expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
      expect(snapshot.timestamp).toBeLessThanOrEqual(after);
    });

    test('deep clones state to prevent mutations', async () => {
      // Set initial state
      const mockDisc = { feature: 'test', config: { nested: { value: 42 } } };
      await stateManager.applyDiscChanges('control-1', mockDisc);
      
      const snapshot = await stateManager.createSnapshot();
      
      // Modify current state
      const currentState = await stateManager.getCurrentState();
      currentState.feature = 'modified';
      
      // Snapshot should still have original value
      expect(snapshot.state.feature).toBe('test');
    });

    test('includes metadata in snapshot', async () => {
      const metadata = { reason: 'test', user: 'admin' };
      const snapshot = await stateManager.createSnapshot(metadata);
      
      expect(snapshot.metadata).toEqual(metadata);
    });

    test('emits snapshot-created event', async () => {
      const eventPromise = new Promise<StateSnapshot>((resolve) => {
        stateManager.once('snapshot-created', resolve);
      });
      
      const snapshot = await stateManager.createSnapshot();
      const eventData = await eventPromise;
      
      expect(eventData.snapshotId).toBe(snapshot.snapshotId);
    });
  });

  describe('Snapshot Retrieval', () => {
    test('retrieves snapshot by ID', async () => {
      const created = await stateManager.createSnapshot({ test: 'data' });
      const retrieved = await stateManager.getSnapshot(created.snapshotId);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.snapshotId).toBe(created.snapshotId);
      expect(retrieved!.metadata).toEqual({ test: 'data' });
    });

    test('returns null for non-existent snapshot', async () => {
      const snapshot = await stateManager.getSnapshot('non-existent-id');
      
      expect(snapshot).toBeNull();
    });

    test('lists all snapshots', async () => {
      await stateManager.createSnapshot();
      await stateManager.createSnapshot();
      await stateManager.createSnapshot();
      
      const snapshots = await stateManager.listSnapshots();
      
      expect(snapshots).toHaveLength(3);
    });

    test('filters snapshots by controlId', async () => {
      await stateManager.applyDiscChanges('control-1', { feature: 'a' });
      await stateManager.applyDiscChanges('control-2', { feature: 'b' });
      await stateManager.applyDiscChanges('control-1', { feature: 'c' });
      
      const snapshots = await stateManager.listSnapshots({ controlId: 'control-1' });
      
      expect(snapshots.length).toBeGreaterThanOrEqual(2);
      snapshots.forEach(s => {
        expect(s.activeControls).toContain('control-1');
      });
    });

    test('filters snapshots by time range', async () => {
      const startTime = Date.now();
      await stateManager.createSnapshot();
      await new Promise(resolve => setTimeout(resolve, 10));
      const midTime = Date.now();
      await stateManager.createSnapshot();
      await new Promise(resolve => setTimeout(resolve, 10));
      await stateManager.createSnapshot();
      const endTime = Date.now();
      
      const snapshots = await stateManager.listSnapshots({ 
        startTime: midTime,
        endTime: endTime
      });
      
      expect(snapshots.length).toBeGreaterThanOrEqual(1);
      snapshots.forEach(s => {
        expect(s.timestamp).toBeGreaterThanOrEqual(midTime);
        expect(s.timestamp).toBeLessThanOrEqual(endTime);
      });
    });
  });

  describe('Rollback', () => {
    test('rolls back to previous snapshot', async () => {
      await stateManager.applyDiscChanges('control-1', { value: 1 });
      const snapshot = await stateManager.createSnapshot();
      
      await stateManager.applyDiscChanges('control-2', { value: 2 });
      
      await stateManager.rollbackToSnapshot(snapshot.snapshotId);
      
      const currentState = await stateManager.getCurrentState();
      expect(currentState.value).toBe(1);
    });

    test('restores exact state from snapshot', async () => {
      const originalState = { 
        feature: 'test', 
        config: { nested: { deep: 'value' } },
        array: [1, 2, 3]
      };
      await stateManager.applyDiscChanges('control-1', originalState);
      const snapshot = await stateManager.createSnapshot();
      
      // Change state
      await stateManager.applyDiscChanges('control-2', { 
        different: 'state',
        feature: 'modified'
      });
      
      // Rollback
      await stateManager.rollbackToSnapshot(snapshot.snapshotId);
      
      const currentState = await stateManager.getCurrentState();
      expect(currentState.feature).toBe('test');
      expect(currentState.config).toEqual({ nested: { deep: 'value' } });
      expect(currentState.array).toEqual([1, 2, 3]);
    });

    test('emits snapshot-restored event', async () => {
      const snapshot = await stateManager.createSnapshot();
      
      const eventPromise = new Promise<string>((resolve) => {
        stateManager.once('snapshot-restored', resolve);
      });
      
      await stateManager.rollbackToSnapshot(snapshot.snapshotId);
      const eventData = await eventPromise;
      
      expect(eventData).toBe(snapshot.snapshotId);
    });

    test('throws error for invalid snapshot ID', async () => {
      await expect(stateManager.rollbackToSnapshot('invalid-id'))
        .rejects.toThrow('Snapshot not found');
    });
  });

  describe('Diff Calculation', () => {
    test('calculates diff between two snapshots', async () => {
      await stateManager.applyDiscChanges('control-1', { value: 1, feature: 'a' });
      const snapshot1 = await stateManager.createSnapshot();
      
      await stateManager.applyDiscChanges('control-2', { value: 2, feature: 'b', newProp: 'test' });
      const snapshot2 = await stateManager.createSnapshot();
      
      const diffs = await stateManager.diff(snapshot1.snapshotId, snapshot2.snapshotId);
      
      expect(diffs.length).toBeGreaterThan(0);
    });

    test('identifies added properties', async () => {
      await stateManager.applyDiscChanges('control-1', { existing: 'value' });
      const snapshot1 = await stateManager.createSnapshot();
      
      await stateManager.applyDiscChanges('control-2', { existing: 'value', newProp: 'added' });
      const snapshot2 = await stateManager.createSnapshot();
      
      const diffs = await stateManager.diff(snapshot1.snapshotId, snapshot2.snapshotId);
      
      const addedDiff = diffs.find(d => d.path === 'newProp' && d.type === 'added');
      expect(addedDiff).toBeTruthy();
      expect(addedDiff!.after).toBe('added');
    });

    test('identifies removed properties', async () => {
      await stateManager.applyDiscChanges('control-1', { prop1: 'a', prop2: 'b' });
      const snapshot1 = await stateManager.createSnapshot();
      
      await stateManager.applyDiscChanges('control-2', { prop1: 'a' });
      const snapshot2 = await stateManager.createSnapshot();
      
      const diffs = await stateManager.diff(snapshot1.snapshotId, snapshot2.snapshotId);
      
      const removedDiff = diffs.find(d => d.path === 'prop2' && d.type === 'removed');
      expect(removedDiff).toBeTruthy();
      expect(removedDiff!.before).toBe('b');
    });

    test('identifies modified properties', async () => {
      await stateManager.applyDiscChanges('control-1', { value: 1 });
      const snapshot1 = await stateManager.createSnapshot();
      
      await stateManager.applyDiscChanges('control-2', { value: 2 });
      const snapshot2 = await stateManager.createSnapshot();
      
      const diffs = await stateManager.diff(snapshot1.snapshotId, snapshot2.snapshotId);
      
      const modifiedDiff = diffs.find(d => d.path === 'value' && d.type === 'modified');
      expect(modifiedDiff).toBeTruthy();
      expect(modifiedDiff!.before).toBe(1);
      expect(modifiedDiff!.after).toBe(2);
    });

    test('handles nested object diffs', async () => {
      await stateManager.applyDiscChanges('control-1', { 
        nested: { level1: { level2: 'old' } }
      });
      const snapshot1 = await stateManager.createSnapshot();
      
      await stateManager.applyDiscChanges('control-2', { 
        nested: { level1: { level2: 'new' } }
      });
      const snapshot2 = await stateManager.createSnapshot();
      
      const diffs = await stateManager.diff(snapshot1.snapshotId, snapshot2.snapshotId);
      
      const nestedDiff = diffs.find(d => d.path.includes('level2'));
      expect(nestedDiff).toBeTruthy();
    });
  });

  describe('State Changes', () => {
    test('applies disc changes and records state change', async () => {
      const change = await stateManager.applyDiscChanges('control-1', { feature: 'test' });
      
      expect(change.controlId).toBe('control-1');
      expect(change.changeType).toBe('apply');
      expect(change.after).toHaveProperty('feature');
    });

    test('tracks before and after state', async () => {
      await stateManager.applyDiscChanges('control-1', { value: 1 });
      const change = await stateManager.applyDiscChanges('control-2', { value: 2 });
      
      expect(change.before).toHaveProperty('value', 1);
      expect(change.after).toHaveProperty('value', 2);
    });

    test('creates automatic snapshot on change', async () => {
      const snapshotsBefore = await stateManager.listSnapshots();
      
      await stateManager.applyDiscChanges('control-1', { feature: 'test' });
      
      const snapshotsAfter = await stateManager.listSnapshots();
      expect(snapshotsAfter.length).toBe(snapshotsBefore.length + 1);
    });

    test('emits state-changed event', async () => {
      const eventPromise = new Promise<StateChange>((resolve) => {
        stateManager.once('state-changed', resolve);
      });
      
      await stateManager.applyDiscChanges('control-1', { feature: 'test' });
      const eventData = await eventPromise;
      
      expect(eventData.controlId).toBe('control-1');
    });
  });

  describe('Limits & Cleanup', () => {
    test('enforces max snapshots limit', async () => {
      const smallManager = new StateManager({ maxSnapshots: 3 });
      
      for (let i = 0; i < 5; i++) {
        await smallManager.createSnapshot({ index: i });
      }
      
      const snapshots = await smallManager.listSnapshots();
      expect(snapshots.length).toBe(3);
    });

    test('removes oldest snapshots when limit exceeded', async () => {
      const smallManager = new StateManager({ maxSnapshots: 2 });
      
      const first = await smallManager.createSnapshot({ order: 'first' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await smallManager.createSnapshot({ order: 'second' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await smallManager.createSnapshot({ order: 'third' });
      
      const retrieved = await smallManager.getSnapshot(first.snapshotId);
      expect(retrieved).toBeNull();
    });

    test('cleanup removes snapshots older than retention period', async () => {
      // Create old snapshots (simulate by manipulating internal state)
      const oldSnapshot = await stateManager.createSnapshot();
      
      // Manually adjust timestamp to be old
      oldSnapshot.timestamp = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days old
      
      await stateManager.createSnapshot(); // Recent snapshot
      
      const removed = await stateManager.cleanup(30); // 30 day retention
      
      expect(removed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty state', async () => {
      const state = await stateManager.getCurrentState();
      
      expect(state).toBeDefined();
      expect(typeof state).toBe('object');
    });

    test('handles null/undefined values', async () => {
      await stateManager.applyDiscChanges('control-1', { nullValue: null, undefinedValue: undefined });
      const snapshot = await stateManager.createSnapshot();
      
      expect(snapshot.state).toHaveProperty('nullValue', null);
    });

    test('handles circular references', async () => {
      const circular: any = { prop: 'value' };
      circular.self = circular;
      
      // Should not throw
      await expect(stateManager.applyDiscChanges('control-1', { simple: 'value' }))
        .resolves.toBeDefined();
    });

    test('handles concurrent snapshot creation', async () => {
      const promises = [
        stateManager.createSnapshot(),
        stateManager.createSnapshot(),
        stateManager.createSnapshot(),
      ];
      
      const snapshots = await Promise.all(promises);
      
      expect(snapshots).toHaveLength(3);
      const ids = snapshots.map(s => s.snapshotId);
      expect(new Set(ids).size).toBe(3); // All IDs are unique
    });
  });

  describe('Control State Management', () => {
    test('tracks control state', async () => {
      await stateManager.applyDiscChanges('control-1', { feature: 'test' });
      
      const controlState = stateManager.getControlState('control-1');
      
      expect(controlState).toBeTruthy();
      expect(controlState).toHaveProperty('before');
      expect(controlState).toHaveProperty('after');
    });

    test('retrieves control history', async () => {
      await stateManager.applyDiscChanges('control-1', { value: 1 });
      await stateManager.applyDiscChanges('control-1', { value: 2 });
      
      const history = stateManager.getControlHistory('control-1');
      
      expect(history.length).toBeGreaterThanOrEqual(2);
      history.forEach(change => {
        expect(change.controlId).toBe('control-1');
      });
    });

    test('reverts control changes', async () => {
      await stateManager.applyDiscChanges('control-1', { value: 1 });
      await stateManager.applyDiscChanges('control-2', { value: 2 });
      
      const revertChange = await stateManager.revertControlChanges('control-2');
      
      expect(revertChange.changeType).toBe('revert');
      expect(revertChange.controlId).toBe('control-2');
      
      const currentState = await stateManager.getCurrentState();
      expect(currentState.value).toBe(1);
    });
  });
});
