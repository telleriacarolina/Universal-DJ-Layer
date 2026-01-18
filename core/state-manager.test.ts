import { StateManager, StateSnapshot, StateChange, ChangeDiff } from './state-manager';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager({ maxSnapshots: 10 });
  });

  describe('Snapshot Creation', () => {
    it('creates snapshot with unique ID', () => {
      const snapshot = stateManager.createSnapshot();
      expect(snapshot.snapshotId).toBeDefined();
      expect(snapshot.snapshotId).toMatch(/^snapshot-\d+-[a-z0-9]+$/);
    });

    it('creates snapshot with correct timestamp', () => {
      const before = Date.now();
      const snapshot = stateManager.createSnapshot();
      const after = Date.now();
      
      expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
      expect(snapshot.timestamp).toBeLessThanOrEqual(after);
    });

    it('deep clones state to prevent mutations', () => {
      const originalState = { nested: { value: 42 } };
      stateManager['currentState'] = originalState;
      
      const snapshot = stateManager.createSnapshot();
      
      // Mutate original
      originalState.nested.value = 99;
      
      // Snapshot should still have old value
      expect(snapshot.state.nested.value).toBe(42);
    });

    it('includes metadata in snapshot', () => {
      const metadata = { reason: 'test', user: 'admin' };
      const snapshot = stateManager.createSnapshot(metadata);
      
      expect(snapshot.metadata).toEqual(metadata);
    });

    it('emits snapshot-created event', (done) => {
      stateManager.on('snapshot-created', (snapshot: StateSnapshot) => {
        expect(snapshot.snapshotId).toBeDefined();
        done();
      });
      
      stateManager.createSnapshot();
    });

    it('includes active controls in snapshot', () => {
      const disc = { name: 'test-disc' } as any;
      stateManager.applyDiscChanges('control-1', disc);
      stateManager.applyDiscChanges('control-2', disc);
      
      const snapshot = stateManager.createSnapshot();
      
      expect(snapshot.activeControls).toContain('control-1');
      expect(snapshot.activeControls).toContain('control-2');
    });
  });

  describe('Snapshot Retrieval', () => {
    it('retrieves snapshot by ID', () => {
      const created = stateManager.createSnapshot();
      const retrieved = stateManager.getSnapshot(created.snapshotId);
      
      expect(retrieved).toEqual(created);
    });

    it('returns null for non-existent snapshot', () => {
      const result = stateManager.getSnapshot('non-existent');
      expect(result).toBeNull();
    });

    it('lists all snapshots', async () => {
      stateManager.createSnapshot();
      stateManager.createSnapshot();
      stateManager.createSnapshot();
      
      const snapshots = await stateManager.listSnapshots();
      expect(snapshots).toHaveLength(3);
    });

    it('filters snapshots by controlId', async () => {
      const disc = { name: 'test-disc' } as any;
      stateManager.applyDiscChanges('control-1', disc);
      stateManager.applyDiscChanges('control-2', disc);
      
      const snapshots = await stateManager.listSnapshots({ controlId: 'control-1' });
      
      // All snapshots should include control-1
      expect(snapshots.length).toBeGreaterThan(0);
      snapshots.forEach(s => {
        expect(s.activeControls).toContain('control-1');
      });
    });

    it('filters snapshots by time range', async () => {
      const now = Date.now();
      stateManager.createSnapshot();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      const midTime = Date.now();
      
      stateManager.createSnapshot();
      stateManager.createSnapshot();
      
      const filtered = await stateManager.listSnapshots({ 
        startTime: midTime 
      });
      
      expect(filtered.length).toBe(2);
    });
  });

  describe('Rollback', () => {
    it('rolls back to previous snapshot', () => {
      stateManager['currentState'] = { value: 1 };
      const snapshot = stateManager.createSnapshot();
      
      stateManager['currentState'] = { value: 2 };
      
      stateManager.rollbackToSnapshot(snapshot.snapshotId);
      
      expect(stateManager.getCurrentState().value).toBe(1);
    });

    it('restores exact state from snapshot', () => {
      const complexState = {
        nested: { deep: { value: 42 } },
        array: [1, 2, 3],
        map: { key: 'value' }
      };
      
      stateManager['currentState'] = complexState;
      const snapshot = stateManager.createSnapshot();
      
      stateManager['currentState'] = { different: true };
      stateManager.rollbackToSnapshot(snapshot.snapshotId);
      
      expect(stateManager.getCurrentState()).toEqual(complexState);
    });

    it('emits snapshot-restored event', (done) => {
      const snapshot = stateManager.createSnapshot();
      
      stateManager.on('snapshot-restored', (event: any) => {
        expect(event.snapshotId).toBe(snapshot.snapshotId);
        done();
      });
      
      stateManager.rollbackToSnapshot(snapshot.snapshotId);
    });

    it('throws error for invalid snapshot ID', () => {
      expect(() => {
        stateManager.rollbackToSnapshot('invalid-id');
      }).toThrow('Snapshot not found');
    });
  });

  describe('Diff Calculation', () => {
    it('calculates diff between two snapshots', async () => {
      stateManager['currentState'] = { value: 1 };
      const snapshot1 = stateManager.createSnapshot();
      
      stateManager['currentState'] = { value: 2 };
      const snapshot2 = stateManager.createSnapshot();
      
      const diffs = await stateManager.diff(snapshot1.snapshotId, snapshot2.snapshotId);
      
      expect(diffs.length).toBeGreaterThan(0);
      expect(diffs[0].path).toBe('value');
      expect(diffs[0].type).toBe('modified');
    });

    it('identifies added properties', () => {
      const before = { existing: 1 };
      const after = { existing: 1, newProp: 2 };
      
      const diffs = stateManager.calculateDiff(before, after);
      
      const addedDiff = diffs.find(d => d.path === 'newProp');
      expect(addedDiff).toBeDefined();
      expect(addedDiff?.type).toBe('added');
      expect(addedDiff?.newValue).toBe(2);
    });

    it('identifies removed properties', () => {
      const before = { prop1: 1, prop2: 2 };
      const after = { prop1: 1 };
      
      const diffs = stateManager.calculateDiff(before, after);
      
      const removedDiff = diffs.find(d => d.path === 'prop2');
      expect(removedDiff).toBeDefined();
      expect(removedDiff?.type).toBe('removed');
      expect(removedDiff?.oldValue).toBe(2);
    });

    it('identifies modified properties', () => {
      const before = { value: 1 };
      const after = { value: 2 };
      
      const diffs = stateManager.calculateDiff(before, after);
      
      expect(diffs[0].type).toBe('modified');
      expect(diffs[0].oldValue).toBe(1);
      expect(diffs[0].newValue).toBe(2);
    });

    it('handles nested object diffs', () => {
      const before = { nested: { value: 1 } };
      const after = { nested: { value: 2 } };
      
      const diffs = stateManager.calculateDiff(before, after);
      
      expect(diffs[0].path).toBe('nested.value');
      expect(diffs[0].type).toBe('modified');
    });
  });

  describe('State Changes', () => {
    it('applies disc changes and records state change', () => {
      const disc = { name: 'test-disc' } as any;
      const stateChange = stateManager.applyDiscChanges('control-1', disc);
      
      expect(stateChange.controlId).toBe('control-1');
      expect(stateChange.changeType).toBe('apply');
      expect(stateChange.timestamp).toBeDefined();
    });

    it('tracks before and after state', () => {
      stateManager['currentState'] = { value: 1 };
      const disc = { name: 'test-disc' } as any;
      
      const stateChange = stateManager.applyDiscChanges('control-1', disc);
      
      expect(stateChange.before).toBeDefined();
      expect(stateChange.after).toBeDefined();
    });

    it('creates automatic snapshot on change', () => {
      const disc = { name: 'test-disc' } as any;
      const beforeCount = stateManager['snapshots'].size;
      
      stateManager.applyDiscChanges('control-1', disc);
      
      const afterCount = stateManager['snapshots'].size;
      expect(afterCount).toBeGreaterThan(beforeCount);
    });

    it('emits state-changed event', (done) => {
      const disc = { name: 'test-disc' } as any;
      
      stateManager.on('state-changed', (change: StateChange) => {
        expect(change.controlId).toBe('control-1');
        done();
      });
      
      stateManager.applyDiscChanges('control-1', disc);
    });

    it('reverts control changes', () => {
      const disc = { name: 'test-disc' } as any;
      stateManager.applyDiscChanges('control-1', disc);
      
      const revertChange = stateManager.revertControlChanges('control-1');
      
      expect(revertChange.changeType).toBe('revert');
      expect(revertChange.controlId).toBe('control-1');
    });

    it('throws error when reverting non-existent control', () => {
      expect(() => {
        stateManager.revertControlChanges('non-existent');
      }).toThrow('Control not found');
    });
  });

  describe('Limits & Cleanup', () => {
    it('enforces max snapshots limit', () => {
      const smallManager = new StateManager({ maxSnapshots: 3 });
      
      for (let i = 0; i < 5; i++) {
        smallManager.createSnapshot();
      }
      
      expect(smallManager['snapshots'].size).toBe(3);
    });

    it('removes oldest snapshots when limit exceeded', () => {
      const smallManager = new StateManager({ maxSnapshots: 2 });
      
      const snapshot1 = smallManager.createSnapshot({ order: 1 });
      smallManager.createSnapshot({ order: 2 });
      smallManager.createSnapshot({ order: 3 });
      
      // First snapshot should be removed
      const retrieved = smallManager.getSnapshot(snapshot1.snapshotId);
      expect(retrieved).toBeNull();
    });

    it('cleanup removes snapshots older than retention period', async () => {
      const oldTimestamp = Date.now() - (40 * 24 * 60 * 60 * 1000); // 40 days ago
      
      // Manually create old snapshot
      const oldSnapshot = stateManager.createSnapshot();
      oldSnapshot.timestamp = oldTimestamp;
      stateManager['snapshots'].set(oldSnapshot.snapshotId, oldSnapshot);
      
      stateManager.createSnapshot(); // Recent snapshot
      
      const removed = await stateManager.cleanup(30); // 30 day retention
      
      expect(removed).toBe(1);
    });

    it('emits snapshot-deleted event on cleanup', (done) => {
      const oldTimestamp = Date.now() - (40 * 24 * 60 * 60 * 1000);
      const oldSnapshot = stateManager.createSnapshot();
      oldSnapshot.timestamp = oldTimestamp;
      stateManager['snapshots'].set(oldSnapshot.snapshotId, oldSnapshot);
      
      stateManager.on('snapshot-deleted', () => {
        done();
      });
      
      stateManager.cleanup(30);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty state', () => {
      const snapshot = stateManager.createSnapshot();
      expect(snapshot.state).toEqual({});
    });

    it('handles null values', () => {
      stateManager['currentState'] = { nullValue: null };
      const snapshot = stateManager.createSnapshot();
      
      expect(snapshot.state.nullValue).toBeNull();
    });

    it('handles undefined values', () => {
      stateManager['currentState'] = { undefinedValue: undefined };
      const snapshot = stateManager.createSnapshot();
      
      expect(snapshot.state.undefinedValue).toBeUndefined();
    });

    it('handles circular references', () => {
      const circular: any = { value: 1 };
      circular.self = circular;
      
      stateManager['currentState'] = circular;
      
      const snapshot = stateManager.createSnapshot();
      expect(snapshot.state.value).toBe(1);
    });

    it('handles arrays in state', () => {
      stateManager['currentState'] = { items: [1, 2, 3] };
      const snapshot = stateManager.createSnapshot();
      
      expect(snapshot.state.items).toEqual([1, 2, 3]);
    });

    it('handles Date objects', () => {
      const date = new Date('2024-01-01');
      stateManager['currentState'] = { timestamp: date };
      
      const snapshot = stateManager.createSnapshot();
      expect(snapshot.state.timestamp).toEqual(date);
    });

    it('handles Map objects', () => {
      const map = new Map([['key1', 'value1'], ['key2', 'value2']]);
      stateManager['currentState'] = { data: map };
      
      const snapshot = stateManager.createSnapshot();
      expect(snapshot.state.data).toBeInstanceOf(Map);
      expect(snapshot.state.data.get('key1')).toBe('value1');
    });

    it('handles Set objects', () => {
      const set = new Set([1, 2, 3]);
      stateManager['currentState'] = { items: set };
      
      const snapshot = stateManager.createSnapshot();
      expect(snapshot.state.items).toBeInstanceOf(Set);
      expect(snapshot.state.items.has(2)).toBe(true);
    });
  });

  describe('Control History', () => {
    it('retrieves control history', () => {
      const disc = { name: 'test-disc' } as any;
      stateManager.applyDiscChanges('control-1', disc);
      stateManager.applyDiscChanges('control-1', disc);
      stateManager.applyDiscChanges('control-2', disc);
      
      const history = stateManager.getControlHistory('control-1');
      
      expect(history).toHaveLength(2);
      expect(history.every(h => h.controlId === 'control-1')).toBe(true);
    });

    it('returns empty array for control with no history', () => {
      const history = stateManager.getControlHistory('non-existent');
      expect(history).toEqual([]);
    });
  });

  describe('Control State', () => {
    it('stores control state', () => {
      const disc = { name: 'test-disc' } as any;
      stateManager.applyDiscChanges('control-1', disc);
      
      const controlState = stateManager.getControlState('control-1');
      expect(controlState).toBeDefined();
      expect(controlState.disc).toBe(disc);
    });

    it('returns null for non-existent control', () => {
      const controlState = stateManager.getControlState('non-existent');
      expect(controlState).toBeNull();
    });
  });

  describe('Memory Storage', () => {
    it('memory storage works correctly', () => {
      const manager = new StateManager({ storageBackend: 'memory' });
      manager.createSnapshot();
      manager.createSnapshot();
      
      expect(manager['snapshots'].size).toBe(2);
    });
  });
});
