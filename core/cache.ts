/**
 * Cache - In-memory caching layer with TTL support
 * 
 * Provides a thread-safe caching mechanism for storing and retrieving
 * data with optional time-to-live (TTL) for automatic expiration.
 */

export interface CacheEntry<T> {
  /** The cached value */
  value: T;
  /** Expiration timestamp (0 means no expiration) */
  expiresAt: number;
}

export interface CacheStats {
  /** Total number of get requests */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Number of entries currently in cache */
  size: number;
  /** Hit rate as a percentage */
  hitRate: number;
}

export interface CacheConfig {
  /** Default TTL in milliseconds (0 means no expiration) */
  defaultTTL?: number;
  /** Maximum number of entries (0 means unlimited) */
  maxSize?: number;
  /** Enable cache statistics */
  enableStats?: boolean;
}

/**
 * Cache class for in-memory caching with TTL support
 * @example
 * const cache = new Cache({ defaultTTL: 60000, maxSize: 1000 });
 * cache.set('key1', { data: 'value' });
 * const value = cache.get('key1');
 */
export class Cache<T = any> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private config: Required<CacheConfig>;
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTTL: config.defaultTTL ?? 0,
      maxSize: config.maxSize ?? 0,
      enableStats: config.enableStats ?? true,
    };

    // Start periodic cleanup for expired entries
    if (this.config.defaultTTL > 0) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpired();
      }, Math.max(this.config.defaultTTL / 2, 1000)); // Cleanup at half TTL or min 1s
    }
  }

  /**
   * Get a value from the cache
   * @param key - The cache key
   * @returns The cached value or null if not found or expired
   * @example
   * const value = cache.get('myKey');
   * if (value !== null) {
   *   console.log('Cache hit:', value);
   * }
   */
  get(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return null;
    }

    // Check if expired
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return null;
    }

    if (this.config.enableStats) {
      this.stats.hits++;
    }
    return entry.value;
  }

  /**
   * Set a value in the cache
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttl - Optional TTL in milliseconds (overrides default)
   * @example
   * cache.set('myKey', { data: 'value' }, 5000); // Cache for 5 seconds
   */
  set(key: string, value: T, ttl?: number): void {
    const effectiveTTL = ttl ?? this.config.defaultTTL;
    const expiresAt = effectiveTTL > 0 ? Date.now() + effectiveTTL : 0;

    // Enforce max size by removing oldest entry
    if (this.config.maxSize > 0 && this.store.size >= this.config.maxSize && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) {
        this.store.delete(firstKey);
      }
    }

    this.store.set(key, { value, expiresAt });
  }

  /**
   * Check if a key exists in the cache (without affecting stats)
   * @param key - The cache key
   * @returns True if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key from the cache
   * @param key - The cache key to delete
   * @returns True if key was deleted, false if it didn't exist
   * @example
   * cache.delete('myKey');
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all entries from the cache
   * @example
   * cache.clear();
   */
  clear(): void {
    this.store.clear();
    if (this.config.enableStats) {
      this.stats.hits = 0;
      this.stats.misses = 0;
    }
  }

  /**
   * Get cache statistics
   * @returns Cache statistics including hits, misses, and hit rate
   * @example
   * const stats = cache.getStats();
   * console.log(`Hit rate: ${stats.hitRate}%`);
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.store.size,
      hitRate: parseFloat(hitRate.toFixed(2)),
    };
  }

  /**
   * Reset cache statistics
   * @example
   * cache.resetStats();
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Get all cache keys
   * @returns Array of all cache keys
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Get the number of entries in the cache
   * @returns Number of entries
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Clean up expired entries
   * @private
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt > 0 && now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.store.delete(key);
    }
  }

  /**
   * Destroy the cache and cleanup resources
   * @example
   * cache.destroy();
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.clear();
  }
}
