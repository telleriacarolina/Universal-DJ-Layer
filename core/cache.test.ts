/**
 * Cache module unit tests
 */

import { Cache } from './cache';

describe('Cache', () => {
  describe('Basic operations', () => {
    it('should set and get values', () => {
      const cache = new Cache<string>();
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      cache.destroy();
    });

    it('should return null for non-existent keys', () => {
      const cache = new Cache<string>();
      expect(cache.get('nonexistent')).toBeNull();
      cache.destroy();
    });

    it('should delete keys', () => {
      const cache = new Cache<string>();
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
      cache.destroy();
    });

    it('should return false when deleting non-existent keys', () => {
      const cache = new Cache<string>();
      expect(cache.delete('nonexistent')).toBe(false);
      cache.destroy();
    });

    it('should check if key exists', () => {
      const cache = new Cache<string>();
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
      cache.destroy();
    });

    it('should clear all entries', () => {
      const cache = new Cache<string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.size()).toBe(0);
      cache.destroy();
    });

    it('should get all keys', () => {
      const cache = new Cache<string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
      cache.destroy();
    });

    it('should return cache size', () => {
      const cache = new Cache<string>();
      expect(cache.size()).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
      cache.destroy();
    });
  });

  describe('TTL behavior', () => {
    it('should expire entries after TTL', async () => {
      const cache = new Cache<string>({ defaultTTL: 100 });
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeNull();
      cache.destroy();
    });

    it('should allow custom TTL per entry', async () => {
      const cache = new Cache<string>({ defaultTTL: 1000 });
      cache.set('key1', 'value1', 100); // Short TTL
      cache.set('key2', 'value2'); // Default TTL

      // Wait for key1 to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      cache.destroy();
    });

    it('should not expire entries with TTL of 0', async () => {
      const cache = new Cache<string>({ defaultTTL: 0 });
      cache.set('key1', 'value1');
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cache.get('key1')).toBe('value1');
      cache.destroy();
    });

    it('should cleanup expired entries periodically', async () => {
      const cache = new Cache<string>({ defaultTTL: 50 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Wait for expiration and cleanup
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Try to get entries - they should be expired
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      cache.destroy();
    });

    it('should handle has() with expired entries', async () => {
      const cache = new Cache<string>({ defaultTTL: 100 });
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.has('key1')).toBe(false);
      cache.destroy();
    });
  });

  describe('Max size behavior', () => {
    it('should enforce max size by removing oldest entries', () => {
      const cache = new Cache<string>({ maxSize: 2 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3'); // Should remove key1

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.size()).toBe(2);
      cache.destroy();
    });

    it('should not remove entry when updating existing key', () => {
      const cache = new Cache<string>({ maxSize: 2 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key1', 'updated'); // Update existing key

      expect(cache.get('key1')).toBe('updated');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.size()).toBe(2);
      cache.destroy();
    });

    it('should allow unlimited size when maxSize is 0', () => {
      const cache = new Cache<string>({ maxSize: 0 });
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      expect(cache.size()).toBe(100);
      cache.destroy();
    });
  });

  describe('Statistics', () => {
    it('should track cache hits and misses', () => {
      const cache = new Cache<string>({ enableStats: true });
      cache.set('key1', 'value1');

      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('nonexistent'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(66.67);
      cache.destroy();
    });

    it('should calculate hit rate correctly', () => {
      const cache = new Cache<string>({ enableStats: true });
      cache.set('key1', 'value1');

      cache.get('key1'); // Hit
      cache.get('key2'); // Miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(50);
      cache.destroy();
    });

    it('should return 0 hit rate with no requests', () => {
      const cache = new Cache<string>({ enableStats: true });
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
      cache.destroy();
    });

    it('should reset statistics', () => {
      const cache = new Cache<string>({ enableStats: true });
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key2');

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      cache.destroy();
    });

    it('should include cache size in stats', () => {
      const cache = new Cache<string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      cache.destroy();
    });

    it('should not track stats when disabled', () => {
      const cache = new Cache<string>({ enableStats: false });
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('nonexistent');

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      cache.destroy();
    });

    it('should count expired entries as misses', async () => {
      const cache = new Cache<string>({ defaultTTL: 100, enableStats: true });
      cache.set('key1', 'value1');

      await new Promise(resolve => setTimeout(resolve, 150));
      cache.get('key1'); // Miss due to expiration

      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
      cache.destroy();
    });
  });

  describe('Complex data types', () => {
    it('should cache objects', () => {
      const cache = new Cache<{ name: string; age: number }>();
      const obj = { name: 'John', age: 30 };
      cache.set('user', obj);
      
      const retrieved = cache.get('user');
      expect(retrieved).toEqual(obj);
      cache.destroy();
    });

    it('should cache arrays', () => {
      const cache = new Cache<number[]>();
      const arr = [1, 2, 3, 4, 5];
      cache.set('numbers', arr);
      
      const retrieved = cache.get('numbers');
      expect(retrieved).toEqual(arr);
      cache.destroy();
    });

    it('should cache nested structures', () => {
      interface ComplexData {
        users: Array<{ id: string; name: string }>;
        metadata: { count: number; timestamp: number };
      }

      const cache = new Cache<ComplexData>();
      const data: ComplexData = {
        users: [
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob' },
        ],
        metadata: { count: 2, timestamp: Date.now() },
      };
      
      cache.set('data', data);
      const retrieved = cache.get('data');
      expect(retrieved).toEqual(data);
      cache.destroy();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string keys', () => {
      const cache = new Cache<string>();
      cache.set('', 'value');
      expect(cache.get('')).toBe('value');
      cache.destroy();
    });

    it('should handle null values', () => {
      const cache = new Cache<any>();
      cache.set('key', null);
      expect(cache.get('key')).toBeNull();
      cache.destroy();
    });

    it('should handle undefined values', () => {
      const cache = new Cache<any>();
      cache.set('key', undefined);
      expect(cache.get('key')).toBeUndefined();
      cache.destroy();
    });

    it('should clear stats when clearing cache', () => {
      const cache = new Cache<string>({ enableStats: true });
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      cache.destroy();
    });
  });

  describe('Resource cleanup', () => {
    it('should cleanup interval on destroy', () => {
      const cache = new Cache<string>({ defaultTTL: 100 });
      cache.set('key1', 'value1');
      cache.destroy();
      
      // After destroy, cache should be empty
      expect(cache.size()).toBe(0);
    });

    it('should be safe to destroy multiple times', () => {
      const cache = new Cache<string>();
      cache.set('key1', 'value1');
      cache.destroy();
      cache.destroy(); // Should not throw
      expect(cache.size()).toBe(0);
    });
  });

  describe('Concurrent access simulation', () => {
    it('should handle multiple rapid operations', () => {
      const cache = new Cache<number>();
      
      // Simulate concurrent writes
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, i);
      }

      // Simulate concurrent reads
      for (let i = 0; i < 100; i++) {
        expect(cache.get(`key${i}`)).toBe(i);
      }

      expect(cache.size()).toBe(100);
      cache.destroy();
    });

    it('should handle mixed operations', () => {
      const cache = new Cache<string>();
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.get('key1')).toBe('value1');
      cache.delete('key1');
      expect(cache.get('key1')).toBeNull();
      cache.set('key3', 'value3');
      expect(cache.size()).toBe(2);
      cache.destroy();
    });
  });
});
