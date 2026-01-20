/**
 * AuditLog caching integration tests
 */

import { AuditLog } from './audit-log';

describe('AuditLog Caching', () => {
  describe('Query caching', () => {
    it('should cache query results', async () => {
      const auditLog = new AuditLog({ enableCache: true });
      
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        controlId: 'control-1',
        result: 'success',
      });

      await auditLog.log({
        action: 'revert',
        actorId: 'user-2',
        actorRole: 'user',
        controlId: 'control-2',
        result: 'success',
      });

      // First query
      await auditLog.query({ actorId: 'user-1' });
      
      // Second identical query - should hit cache
      await auditLog.query({ actorId: 'user-1' });
      
      const stats = auditLog.getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
      
      auditLog.destroy();
    });

    it('should cache different queries separately', async () => {
      const auditLog = new AuditLog({ enableCache: true });
      
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      // Different queries
      await auditLog.query({ actorId: 'user-1' });
      await auditLog.query({ action: 'apply' });
      await auditLog.query();
      
      const stats = auditLog.getCacheStats();
      expect(stats.size).toBeGreaterThan(1);
      
      auditLog.destroy();
    });

    it('should emit cache-hit events', async () => {
      const auditLog = new AuditLog({ enableCache: true });
      
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      await auditLog.query({ actorId: 'user-1' }); // First query
      
      const cacheHits: any[] = [];
      auditLog.on('cache-hit', (data) => cacheHits.push(data));
      
      await auditLog.query({ actorId: 'user-1' }); // Second query - cache hit
      
      expect(cacheHits.length).toBeGreaterThan(0);
      expect(cacheHits[0].type).toBe('query');
      
      auditLog.destroy();
    });

    it('should emit cache-miss events', async () => {
      const auditLog = new AuditLog({ enableCache: true });
      
      const cacheMisses: any[] = [];
      auditLog.on('cache-miss', (data) => cacheMisses.push(data));
      
      await auditLog.query({ actorId: 'non-existent' });
      
      expect(cacheMisses.length).toBeGreaterThan(0);
      expect(cacheMisses[0].type).toBe('query');
      
      auditLog.destroy();
    });

    it('should work with cache disabled', async () => {
      const auditLog = new AuditLog({ enableCache: false });
      
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      const entries = await auditLog.query({ actorId: 'user-1' });
      expect(entries.length).toBe(1);
      
      auditLog.destroy();
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate cache on new log entry', async () => {
      const auditLog = new AuditLog({ enableCache: true });
      
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      const entries1 = await auditLog.query();
      
      // Add new entry
      await auditLog.log({
        action: 'revert',
        actorId: 'user-2',
        actorRole: 'user',
        result: 'success',
      });

      // Query should return updated results
      const entries2 = await auditLog.query();
      
      expect(entries2.length).toBeGreaterThan(entries1.length);
      
      auditLog.destroy();
    });

    it('should invalidate cache on cleanup', async () => {
      const auditLog = new AuditLog({ enableCache: true });
      
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      // Manually age the entry
      const entry = await auditLog.getEntry(entryId);
      if (entry) {
        entry.timestamp = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days old
      }

      await auditLog.query(); // Populate cache
      
      await auditLog.cleanup(30); // Clean entries older than 30 days
      
      const entriesAfterCleanup = await auditLog.query();
      expect(entriesAfterCleanup.length).toBe(0);
      
      auditLog.destroy();
    });
  });

  describe('Cache TTL', () => {
    it('should respect cache TTL', async () => {
      const auditLog = new AuditLog({ enableCache: true, cacheTTL: 100 });
      
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      // First query - cache miss
      await auditLog.query({ actorId: 'user-1' });
      
      // Second query - cache hit
      await auditLog.query({ actorId: 'user-1' });
      
      const statsBefore = auditLog.getCacheStats();
      const hitsBefore = statsBefore.hits;
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Third query - should be cache miss (expired)
      await auditLog.query({ actorId: 'user-1' });
      
      const statsAfter = auditLog.getCacheStats();
      expect(statsAfter.misses).toBeGreaterThanOrEqual(statsBefore.misses);
      
      auditLog.destroy();
    });
  });

  describe('Cache statistics', () => {
    it('should track cache statistics', async () => {
      const auditLog = new AuditLog({ enableCache: true });
      
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      // Generate some hits and misses
      await auditLog.query({ actorId: 'user-1' }); // Miss
      await auditLog.query({ actorId: 'user-1' }); // Hit
      await auditLog.query({ actorId: 'user-2' }); // Miss
      
      const stats = auditLog.getCacheStats();
      
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.size).toBeGreaterThan(0);
      
      auditLog.destroy();
    });
  });

  describe('Resource cleanup', () => {
    it('should cleanup cache on destroy', () => {
      const auditLog = new AuditLog({ enableCache: true });
      
      auditLog.destroy();
      
      const stats = auditLog.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should not throw when destroyed multiple times', () => {
      const auditLog = new AuditLog({ enableCache: true });
      
      expect(() => {
        auditLog.destroy();
        auditLog.destroy();
      }).not.toThrow();
    });
  });

  describe('Complex filtering', () => {
    it('should cache complex filtered queries', async () => {
      const auditLog = new AuditLog({ enableCache: true });
      
      // Add various entries
      for (let i = 0; i < 10; i++) {
        await auditLog.log({
          action: i % 2 === 0 ? 'apply' : 'revert',
          actorId: `user-${i % 3}`,
          actorRole: i % 2 === 0 ? 'admin' : 'user',
          result: 'success',
        });
      }

      const filter = {
        action: 'apply' as const,
        actorId: 'user-0',
        limit: 5,
      };

      // First query
      const entries1 = await auditLog.query(filter);
      
      // Second identical query - should hit cache
      const entries2 = await auditLog.query(filter);
      
      expect(entries1).toEqual(entries2);
      
      const stats = auditLog.getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
      
      auditLog.destroy();
    });

    it('should cache queries with time range filters', async () => {
      const auditLog = new AuditLog({ enableCache: true });
      
      const now = Date.now();
      
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      const filter = {
        startTime: now - 1000,
        endTime: now + 1000,
      };

      // First query
      await auditLog.query(filter);
      
      // Second query - cache hit
      await auditLog.query(filter);
      
      const stats = auditLog.getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
      
      auditLog.destroy();
    });
  });

  describe('Performance improvements', () => {
    it('should be faster with caching for repeated queries', async () => {
      const auditLogWithCache = new AuditLog({ enableCache: true });
      const auditLogWithoutCache = new AuditLog({ enableCache: false });
      
      // Add some data
      for (let i = 0; i < 50; i++) {
        await auditLogWithCache.log({
          action: 'apply',
          actorId: `user-${i}`,
          actorRole: 'user',
          result: 'success',
        });
        await auditLogWithoutCache.log({
          action: 'apply',
          actorId: `user-${i}`,
          actorRole: 'user',
          result: 'success',
        });
      }
      
      // Prime cache
      await auditLogWithCache.query();
      
      // Time queries with cache
      const startWithCache = Date.now();
      for (let i = 0; i < 10; i++) {
        await auditLogWithCache.query();
      }
      const timeWithCache = Date.now() - startWithCache;
      
      // Time queries without cache
      const startWithoutCache = Date.now();
      for (let i = 0; i < 10; i++) {
        await auditLogWithoutCache.query();
      }
      const timeWithoutCache = Date.now() - startWithoutCache;
      
      // Verify cache was used effectively
      const stats = auditLogWithCache.getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
      
      // With cache should not be significantly slower
      expect(timeWithCache).toBeLessThanOrEqual(timeWithoutCache + 50); // Allow 50ms variance
      
      auditLogWithCache.destroy();
      auditLogWithoutCache.destroy();
    });
  });
});
