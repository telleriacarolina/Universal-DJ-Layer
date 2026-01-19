/**
 * CacheManager - In-memory caching layer with TTL and LRU eviction
 * 
 * Responsibilities:
 * - Cache expensive operations (snapshots, diffs, audit queries, policy evaluations)
 * - Implement TTL-based expiration
 * - LRU eviction when cache is full
 * - Provide cache statistics and monitoring
 */

import { EventEmitter } from 'events';

export interface CacheEntry<T = any> {
  /** Cached value */
  value: T;
  /** Timestamp when entry was created */
  timestamp: number;
  /** Number of times this entry was accessed */
  hits: number;
  /** Last access timestamp */
  lastAccess: number;
}

export interface CacheConfig {
  /** Maximum number of entries in cache */
  maxSize?: number;
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Enable event emissions for monitoring */
  enableEvents?: boolean;
}

export interface CacheStats {
  /** Current cache size */
  size: number;
  /** Maximum cache size */
  maxSize: number;
  /** Total number of get operations */
  totalGets: number;
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Total number of evictions */
  evictions: number;
  /** Total number of expirations */
  expirations: number;
}

export class CacheManager extends EventEmitter {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number;
  private enableEvents: boolean;
  
  // Statistics
  private totalGets = 0;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private expirations = 0;

  /**
   * Create a new cache manager
   * @param config - Cache configuration
   * @example
   * const cache = new CacheManager({ maxSize: 1000, ttl: 300000 });
   */
  constructor(config: CacheConfig = {}) {
    super();
    this.cache = new Map();
    this.maxSize = config.maxSize ?? 1000;
    this.ttl = config.ttl ?? 300000; // 5 minutes default
    this.enableEvents = config.enableEvents ?? true;
  }

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found or expired
   * @example
   * const value = await cache.get<Snapshot>('snapshot-123');
   */
  async get<T>(key: string): Promise<T | null> {
    this.totalGets++;
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      if (this.enableEvents) {
        this.emit('cache-miss', key);
      }
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      this.expirations++;
      if (this.enableEvents) {
        this.emit('cache-expired', key);
      }
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccess = Date.now();
    this.hits++;
    
    if (this.enableEvents) {
      this.emit('cache-hit', key);
    }
    
    return entry.value as T;
  }

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @example
   * cache.set('snapshot-123', snapshotData);
   */
  set<T>(key: string, value: T): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
      lastAccess: Date.now()
    });

    if (this.enableEvents) {
      this.emit('cache-set', key);
    }
  }

  /**
   * Check if a key exists in cache (without updating access stats)
   * @param key - Cache key
   * @returns True if key exists and not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.expirations++;
      return false;
    }
    
    return true;
  }

  /**
   * Delete a specific key from cache
   * @param key - Cache key
   * @returns True if key was deleted
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted && this.enableEvents) {
      this.emit('cache-delete', key);
    }
    return deleted;
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    
    if (this.enableEvents) {
      this.emit('cache-clear', size);
    }
  }

  /**
   * Get cache statistics
   * @returns Cache statistics object
   * @example
   * const stats = cache.getStats();
   * console.log(`Hit rate: ${stats.hitRate}`);
   */
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalGets: this.totalGets,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.totalGets > 0 ? this.hits / this.totalGets : 0,
      evictions: this.evictions,
      expirations: this.expirations
    };
  }

  /**
   * Reset cache statistics (but keep cached data)
   */
  resetStats(): void {
    this.totalGets = 0;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.expirations = 0;
  }

  /**
   * Get all cache keys
   * @returns Array of cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   * @returns Number of entries in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Evict the least recently used entry
   * @private
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.evictions++;
      
      if (this.enableEvents) {
        this.emit('cache-evict', lruKey);
      }
    }
  }

  /**
   * Remove expired entries from cache
   * @returns Number of entries removed
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removed++;
        this.expirations++;
      }
    }

    if (removed > 0 && this.enableEvents) {
      this.emit('cache-cleanup', removed);
    }

    return removed;
  }
}
