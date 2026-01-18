import { StateManager } from '../state-manager';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager(10);
  });

  describe('setState and getState', () => {
    it('should store and retrieve state', () => {
      const state = { value: 42 };
      stateManager.setState('disc-1', state);
      
      const retrieved = stateManager.getState('disc-1');
      expect(retrieved).toEqual(state);
    });
  });

  describe('createSnapshot', () => {
    it('should create a snapshot with unique ID', () => {
      stateManager.setState('disc-1', { value: 1 });
      stateManager.setState('disc-2', { value: 2 });

      const snapshotId = stateManager.createSnapshot('user-1', 'Test snapshot');
      expect(snapshotId).toBeTruthy();
      expect(snapshotId).toContain('snapshot-');
    });

    it('should maintain max snapshots', () => {
      const smallManager = new StateManager(3);
      
      for (let i = 0; i < 5; i++) {
        smallManager.createSnapshot(`user-${i}`, `Snapshot ${i}`);
      }

      expect(smallManager.getAllSnapshots()).toHaveLength(3);
    });
  });

  describe('rollbackToSnapshot', () => {
    it('should restore state from snapshot', () => {
      stateManager.setState('disc-1', { value: 1 });
      const snapshotId = stateManager.createSnapshot('user-1');

      stateManager.setState('disc-1', { value: 2 });
      expect(stateManager.getState('disc-1')).toEqual({ value: 2 });

      const success = stateManager.rollbackToSnapshot(snapshotId);
      expect(success).toBe(true);
      expect(stateManager.getState('disc-1')).toEqual({ value: 1 });
    });

    it('should return false for non-existent snapshot', () => {
      const success = stateManager.rollbackToSnapshot('non-existent');
      expect(success).toBe(false);
    });
  });

  describe('getSnapshotsByUser', () => {
    it('should filter snapshots by user', () => {
      stateManager.createSnapshot('user-1', 'Snapshot 1');
      stateManager.createSnapshot('user-2', 'Snapshot 2');
      stateManager.createSnapshot('user-1', 'Snapshot 3');

      const user1Snapshots = stateManager.getSnapshotsByUser('user-1');
      expect(user1Snapshots).toHaveLength(2);
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete a snapshot', () => {
      const snapshotId = stateManager.createSnapshot('user-1');
      expect(stateManager.getAllSnapshots()).toHaveLength(1);

      const success = stateManager.deleteSnapshot(snapshotId);
      expect(success).toBe(true);
      expect(stateManager.getAllSnapshots()).toHaveLength(0);
    });

    it('should return false when deleting non-existent snapshot', () => {
      const success = stateManager.deleteSnapshot('non-existent');
      expect(success).toBe(false);
    });
  });
});
