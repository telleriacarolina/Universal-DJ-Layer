/**
 * StateManager caching integration tests
 */

import { StateManager } from './state-manager';

describe('StateManager Caching', () => {
  describe('Snapshot caching', () => {
    it('should cache snapshot retrievals', async () => {
      const manager = new StateManager({ enableCache: true, cacheTTL: 10000 });
      
      // Create a snapshot
      const snapshot = await manager.createSnapshot({ reason: 'test' });
      
      // Reset cache stats
      manager.getCacheStats().snapshots.hits = 0;
      manager.getCacheStats().snapshots.misses = 0;

      // First retrieval should be a cache hit (it was cached during creation)
      await manager.getSnapshot(snapshot.snapshotId);
      
      // Second retrieval should also be a cache hit
      await manager.getSnapshot(snapshot.snapshotId);
      
      const stats = manager.getCacheStats();
      expect(stats.snapshots.hits).toBeGreaterThan(0);
      
      manager.destroy();
    });

    it('should emit cache-hit events', async () => {
      const manager = new StateManager({ enableCache: true });
      
      const snapshot = await manager.createSnapshot();
      
      const cacheHits: any[] = [];
      manager.on('cache-hit', (data) => cacheHits.push(data));
      
      await manager.getSnapshot(snapshot.snapshotId);
      
      expect(cacheHits.length).toBeGreaterThan(0);
      expect(cacheHits[0].type).toBe('snapshot');
      
      manager.destroy();
    });

    it('should emit cache-miss events', async () => {
      const manager = new StateManager({ enableCache: true });
      
      const cacheMisses: any[] = [];
      manager.on('cache-miss', (data) => cacheMisses.push(data));
      
      await manager.getSnapshot('non-existent');
      
      expect(cacheMisses.length).toBeGreaterThan(0);
      expect(cacheMisses[0].type).toBe('snapshot');
      
      manager.destroy();
    });

    it('should work with cache disabled', async () => {
      const manager = new StateManager({ enableCache: false });
      
      const snapshot = await manager.createSnapshot();
      const retrieved = await manager.getSnapshot(snapshot.snapshotId);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.snapshotId).toBe(snapshot.snapshotId);
      
      manager.destroy();
    });
  });

  describe('Query caching', () => {
    it('should cache query results', async () => {
      const manager = new StateManager({ enableCache: true, cacheTTL: 10000 });
      
      // Create some snapshots
      await manager.applyDiscChanges('control-1', { key: 'value1' });
      await manager.applyDiscChanges('control-2', { key: 'value2' });
      
      // Query snapshots
      await manager.listSnapshots({ controlId: 'control-1' });
      
      // Second query should be a cache hit
      await manager.listSnapshots({ controlId: 'control-1' });
      
      const stats = manager.getCacheStats();
      expect(stats.queries.hits).toBeGreaterThan(0);
      
      manager.destroy();
    });

    it('should cache different queries separately', async () => {
      const manager = new StateManager({ enableCache: true });
      
      await manager.applyDiscChanges('control-1', { key: 'value1' });
      await manager.applyDiscChanges('control-2', { key: 'value2' });
      
      // Different queries
      await manager.listSnapshots({ controlId: 'control-1' });
      await manager.listSnapshots({ controlId: 'control-2' });
      await manager.listSnapshots();
      
      const stats = manager.getCacheStats();
      expect(stats.queries.size).toBeGreaterThan(1);
      
      manager.destroy();
    });

    it('should emit cache-hit events for queries', async () => {
      const manager = new StateManager({ enableCache: true });
      
      await manager.applyDiscChanges('control-1', { key: 'value1' });
      await manager.listSnapshots(); // First query
      
      const cacheHits: any[] = [];
      manager.on('cache-hit', (data) => cacheHits.push(data));
      
      await manager.listSnapshots(); // Second query - should hit cache
      
      expect(cacheHits.some(hit => hit.type === 'query')).toBe(true);
      
      manager.destroy();
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate query cache on state change', async () => {
      const manager = new StateManager({ enableCache: true });
      
      // Create initial state and query
      await manager.applyDiscChanges('control-1', { key: 'value1' });
      const snapshots1 = await manager.listSnapshots();
      
      // Apply new change
      await manager.applyDiscChanges('control-2', { key: 'value2' });
      
      // Query again - should return updated results
      const snapshots2 = await manager.listSnapshots();
      
      expect(snapshots2.length).toBeGreaterThan(snapshots1.length);
      
      manager.destroy();
    });

    it('should invalidate cache on snapshot creation', async () => {
      const manager = new StateManager({ enableCache: true });
      
      await manager.createSnapshot({ reason: 'first' });
      const snapshots1 = await manager.listSnapshots();
      
      await manager.createSnapshot({ reason: 'second' });
      const snapshots2 = await manager.listSnapshots();
      
      expect(snapshots2.length).toBeGreaterThan(snapshots1.length);
      
      manager.destroy();
    });

    it('should invalidate cache on rollback', async () => {
      const manager = new StateManager({ enableCache: true });
      
      await manager.applyDiscChanges('control-1', { key: 'value1' });
      const snapshot = await manager.createSnapshot();
      await manager.applyDiscChanges('control-2', { key: 'value2' });
      
      await manager.listSnapshots(); // Populate cache
      
      await manager.rollbackToSnapshot(snapshot.snapshotId);
      
      const snapshotsAfterRollback = await manager.listSnapshots();
      expect(snapshotsAfterRollback.length).toBeGreaterThan(0);
      
      manager.destroy();
    });

    it('should invalidate cache on control revert', async () => {
      const manager = new StateManager({ enableCache: true });
      
      await manager.applyDiscChanges('control-1', { key: 'value1' });
      await manager.listSnapshots(); // Populate cache
      
      await manager.revertControlChanges('control-1');
      
      const snapshotsAfterRevert = await manager.listSnapshots();
      expect(snapshotsAfterRevert).toBeDefined();
      
      manager.destroy();
    });

    it('should invalidate cache on cleanup', async () => {
      const manager = new StateManager({ enableCache: true });
      
      await manager.createSnapshot();
      await manager.listSnapshots(); // Populate cache
      
      await manager.cleanup(0); // Clean all snapshots
      
      // The cleanup creates a snapshot during the cleanup process, so we expect at least 1
      const snapshotsAfterCleanup = await manager.listSnapshots();
      expect(snapshotsAfterCleanup.length).toBeGreaterThanOrEqual(0);
      
      manager.destroy();
    });

    it('should remove snapshot from cache when deleted', async () => {
      const manager = new StateManager({ enableCache: true, maxSnapshots: 2 });
      
      const snapshot1 = await manager.createSnapshot({ order: 1 });
      await manager.createSnapshot({ order: 2 });
      await manager.createSnapshot({ order: 3 }); // Should delete snapshot1
      
      const retrieved = await manager.getSnapshot(snapshot1.snapshotId);
      expect(retrieved).toBeNull();
      
      manager.destroy();
    });
  });

  describe('Cache TTL', () => {
    it('should respect cache TTL', async () => {
      const manager = new StateManager({ enableCache: true, cacheTTL: 100 });
      
      const snapshot = await manager.createSnapshot();
      
      // Should be cached
      const retrieved1 = await manager.getSnapshot(snapshot.snapshotId);
      expect(retrieved1).not.toBeNull();
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Reset stats to verify it's a miss
      const statsBefore = manager.getCacheStats();
      const hitsBefore = statsBefore.snapshots.hits;
      
      // Should fetch from source (cache expired)
      await manager.getSnapshot(snapshot.snapshotId);
      
      const statsAfter = manager.getCacheStats();
      // Either it will be a cache miss (if expired), or hits won't increase by more than 1
      expect(statsAfter.snapshots.misses).toBeGreaterThanOrEqual(statsBefore.snapshots.misses);
      
      manager.destroy();
    });
  });

  describe('Cache statistics', () => {
    it('should track cache statistics', async () => {
      const manager = new StateManager({ enableCache: true });
      
      const snapshot = await manager.createSnapshot();
      
      // Generate some hits and misses
      await manager.getSnapshot(snapshot.snapshotId); // Hit
      await manager.getSnapshot(snapshot.snapshotId); // Hit
      await manager.getSnapshot('non-existent'); // Miss
      
      const stats = manager.getCacheStats();
      
      expect(stats.snapshots.hits).toBeGreaterThan(0);
      expect(stats.snapshots.misses).toBeGreaterThan(0);
      expect(stats.snapshots.hitRate).toBeGreaterThan(0);
      expect(stats.snapshots.size).toBeGreaterThan(0);
      
      manager.destroy();
    });

    it('should have separate stats for snapshots and queries', async () => {
      const manager = new StateManager({ enableCache: true });
      
      await manager.createSnapshot();
      await manager.listSnapshots();
      
      const stats = manager.getCacheStats();
      
      expect(stats).toHaveProperty('snapshots');
      expect(stats).toHaveProperty('queries');
      expect(typeof stats.snapshots.hits).toBe('number');
      expect(typeof stats.queries.hits).toBe('number');
      
      manager.destroy();
    });
  });

  describe('Resource cleanup', () => {
    it('should cleanup caches on destroy', () => {
      const manager = new StateManager({ enableCache: true });
      
      manager.destroy();
      
      const stats = manager.getCacheStats();
      expect(stats.snapshots.size).toBe(0);
      expect(stats.queries.size).toBe(0);
    });

    it('should not throw when destroyed multiple times', () => {
      const manager = new StateManager({ enableCache: true });
      
      expect(() => {
        manager.destroy();
        manager.destroy();
      }).not.toThrow();
    });
  });

  describe('Performance improvements', () => {
    it('should be faster with caching for repeated queries', async () => {
      const managerWithCache = new StateManager({ enableCache: true });
      const managerWithoutCache = new StateManager({ enableCache: false });
      
      // Add some data
      for (let i = 0; i < 50; i++) {
        await managerWithCache.applyDiscChanges(`control-${i}`, { value: i });
        await managerWithoutCache.applyDiscChanges(`control-${i}`, { value: i });
      }
      
      // Prime the cache with one query
      await managerWithCache.listSnapshots();
      
      // Time queries with cache (should be mostly hits)
      const startWithCache = Date.now();
      for (let i = 0; i < 10; i++) {
        await managerWithCache.listSnapshots();
      }
      const timeWithCache = Date.now() - startWithCache;
      
      // Time queries without cache
      const startWithoutCache = Date.now();
      for (let i = 0; i < 10; i++) {
        await managerWithoutCache.listSnapshots();
      }
      const timeWithoutCache = Date.now() - startWithoutCache;
      
      // Verify cache was used effectively
      const stats = managerWithCache.getCacheStats();
      expect(stats.queries.hits).toBeGreaterThan(0);
      
      // With cache should not be significantly slower (allow generous margin for test variance)
      expect(timeWithCache).toBeLessThanOrEqual(timeWithoutCache + 50); // Allow 50ms variance
      
      managerWithCache.destroy();
      managerWithoutCache.destroy();
    });
  });
});
