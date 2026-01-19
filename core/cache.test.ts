import { CacheManager, CacheStats } from './cache';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({ maxSize: 3, ttl: 1000 });
  });

  describe('Basic Operations', () => {
    test('sets and gets values', async () => {
      cache.set('key1', 'value1');
      const value = await cache.get('key1');
      expect(value).toBe('value1');
    });

    test('returns null for non-existent keys', async () => {
      const value = await cache.get('nonexistent');
      expect(value).toBeNull();
    });

    test('has() returns true for existing keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    test('has() returns false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    test('deletes keys', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.has('key1')).toBe(false);
    });

    test('clears all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });

    test('returns cache size', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });

    test('returns all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });
  });

  describe('TTL Expiration', () => {
    test('expires entries after TTL', async () => {
      const shortCache = new CacheManager({ ttl: 100 });
      shortCache.set('key1', 'value1');
      
      // Should exist immediately
      expect(await shortCache.get('key1')).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired
      expect(await shortCache.get('key1')).toBeNull();
    });

    test('has() returns false for expired entries', async () => {
      const shortCache = new CacheManager({ ttl: 100 });
      shortCache.set('key1', 'value1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(shortCache.has('key1')).toBe(false);
    });

    test('cleanup removes expired entries', async () => {
      const shortCache = new CacheManager({ ttl: 100 });
      shortCache.set('key1', 'value1');
      shortCache.set('key2', 'value2');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const removed = await shortCache.cleanup();
      expect(removed).toBe(2);
      expect(shortCache.size()).toBe(0);
    });
  });

  describe('LRU Eviction', () => {
    test('evicts least recently used entry when full', async () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Access key1 to make it recently used
      await cache.get('key1');
      
      // Add key4, should evict key2 (least recently used)
      cache.set('key4', 'value4');
      
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    test('updates last access time on get', async () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Access key1 to update its last access
      await cache.get('key1');
      
      cache.set('key3', 'value3');
      
      // key2 should be evicted (older access)
      cache.set('key4', 'value4');
      
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    test('does not evict when updating existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Update existing key, should not trigger eviction
      cache.set('key1', 'updated');
      
      expect(cache.size()).toBe(3);
    });
  });

  describe('Statistics', () => {
    test('tracks cache hits', async () => {
      cache.set('key1', 'value1');
      await cache.get('key1');
      await cache.get('key1');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    test('tracks cache misses', async () => {
      await cache.get('nonexistent1');
      await cache.get('nonexistent2');
      
      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });

    test('calculates hit rate correctly', async () => {
      cache.set('key1', 'value1');
      await cache.get('key1'); // hit
      await cache.get('key2'); // miss
      await cache.get('key1'); // hit
      await cache.get('key3'); // miss
      
      const stats = cache.getStats();
      expect(stats.totalGets).toBe(4);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    test('tracks evictions', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // triggers eviction
      
      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
    });

    test('tracks expirations', async () => {
      const shortCache = new CacheManager({ ttl: 100 });
      shortCache.set('key1', 'value1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      await shortCache.get('key1'); // should be expired
      
      const stats = shortCache.getStats();
      expect(stats.expirations).toBe(1);
    });

    test('resets statistics', async () => {
      cache.set('key1', 'value1');
      await cache.get('key1');
      await cache.get('nonexistent');
      
      cache.resetStats();
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.totalGets).toBe(0);
    });

    test('maintains cached data after stats reset', async () => {
      cache.set('key1', 'value1');
      cache.resetStats();
      
      expect(await cache.get('key1')).toBe('value1');
      expect(cache.size()).toBe(1);
    });
  });

  describe('Events', () => {
    test('emits cache-hit event', async () => {
      const hitSpy = jest.fn();
      cache.on('cache-hit', hitSpy);
      
      cache.set('key1', 'value1');
      await cache.get('key1');
      
      expect(hitSpy).toHaveBeenCalledWith('key1');
    });

    test('emits cache-miss event', async () => {
      const missSpy = jest.fn();
      cache.on('cache-miss', missSpy);
      
      await cache.get('nonexistent');
      
      expect(missSpy).toHaveBeenCalledWith('nonexistent');
    });

    test('emits cache-set event', () => {
      const setSpy = jest.fn();
      cache.on('cache-set', setSpy);
      
      cache.set('key1', 'value1');
      
      expect(setSpy).toHaveBeenCalledWith('key1');
    });

    test('emits cache-evict event', () => {
      const evictSpy = jest.fn();
      cache.on('cache-evict', evictSpy);
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // triggers eviction
      
      expect(evictSpy).toHaveBeenCalled();
    });

    test('emits cache-expired event', async () => {
      const shortCache = new CacheManager({ ttl: 100 });
      const expiredSpy = jest.fn();
      shortCache.on('cache-expired', expiredSpy);
      
      shortCache.set('key1', 'value1');
      await new Promise(resolve => setTimeout(resolve, 150));
      await shortCache.get('key1');
      
      expect(expiredSpy).toHaveBeenCalledWith('key1');
    });

    test('emits cache-delete event', () => {
      const deleteSpy = jest.fn();
      cache.on('cache-delete', deleteSpy);
      
      cache.set('key1', 'value1');
      cache.delete('key1');
      
      expect(deleteSpy).toHaveBeenCalledWith('key1');
    });

    test('emits cache-clear event', () => {
      const clearSpy = jest.fn();
      cache.on('cache-clear', clearSpy);
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      
      expect(clearSpy).toHaveBeenCalledWith(2);
    });

    test('emits cache-cleanup event', async () => {
      const shortCache = new CacheManager({ ttl: 100 });
      const cleanupSpy = jest.fn();
      shortCache.on('cache-cleanup', cleanupSpy);
      
      shortCache.set('key1', 'value1');
      await new Promise(resolve => setTimeout(resolve, 150));
      await shortCache.cleanup();
      
      expect(cleanupSpy).toHaveBeenCalledWith(1);
    });

    test('can disable events', async () => {
      const noEventCache = new CacheManager({ enableEvents: false });
      const hitSpy = jest.fn();
      noEventCache.on('cache-hit', hitSpy);
      
      noEventCache.set('key1', 'value1');
      await noEventCache.get('key1');
      
      expect(hitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Type Safety', () => {
    test('handles different value types', async () => {
      cache.set<string>('string', 'text');
      cache.set<number>('number', 42);
      cache.set<boolean>('boolean', true);
      cache.set<object>('object', { key: 'value' });
      cache.set<any[]>('array', [1, 2, 3]);
      
      expect(await cache.get<string>('string')).toBe('text');
      expect(await cache.get<number>('number')).toBe(42);
      expect(await cache.get<boolean>('boolean')).toBe(true);
      expect(await cache.get<object>('object')).toEqual({ key: 'value' });
      expect(await cache.get<any[]>('array')).toEqual([1, 2, 3]);
    });

    test('handles null and undefined values', async () => {
      cache.set('null', null);
      cache.set('undefined', undefined);
      
      expect(await cache.get('null')).toBeNull();
      expect(await cache.get('undefined')).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('handles zero maxSize', () => {
      const zeroCache = new CacheManager({ maxSize: 0 });
      zeroCache.set('key1', 'value1');
      expect(zeroCache.size()).toBe(0);
    });

    test('handles large number of entries', () => {
      const largeCache = new CacheManager({ maxSize: 10000 });
      
      for (let i = 0; i < 10000; i++) {
        largeCache.set(`key${i}`, `value${i}`);
      }
      
      expect(largeCache.size()).toBe(10000);
    });

    test('handles rapid operations', async () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i % 10}`, `value${i}`);
        promises.push(cache.get(`key${i % 10}`));
      }
      
      const results = await Promise.all(promises);
      expect(results.length).toBe(100);
    });
  });
});
