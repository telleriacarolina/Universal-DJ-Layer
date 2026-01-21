/**
 * StateManager - Manages application state and control history
 * 
 * Responsibilities:
 * - Track current state of all applied controls
 * - Maintain history of state changes
 * - Enable rollback to previous states
 * - Provide state snapshots for preview mode
 * - Persist state across restarts (optional)
 */

import { EventEmitter } from 'events';
import type { ControlResult } from './dj-engine';
import { Cache } from './cache';

export interface StateSnapshot {
  /** Unique identifier for this snapshot */
  snapshotId: string;
  /** Timestamp when snapshot was taken */
  timestamp: number;
  /** Full state at this point in time */
  state: any;
  /** Active controls at this snapshot */
  activeControls: string[];
  /** Metadata about the snapshot */
  metadata?: Record<string, any>;
}

export interface StateChange {
  /** ID of the control that caused this change */
  controlId: string;
  /** Timestamp of the change */
  timestamp: number;
  /** State before the change */
  before: any;
  /** State after the change */
  after: any;
  /** Type of change */
  changeType: 'apply' | 'revert' | 'modify';
}

export interface ChangeDiff {
  /** Path to the changed property */
  path: string;
  /** Type of change */
  type: 'added' | 'removed' | 'modified';
  /** Old value (if modified or removed) */
  oldValue?: any;
  /** New value (if added or modified) */
  newValue?: any;
}

export interface StateManagerConfig {
  /** Maximum number of snapshots to keep */
  maxSnapshots?: number;
  /** Enable persistent storage */
  enablePersistence?: boolean;
  /** Storage backend (if persistence enabled) */
  storageBackend?: 'memory' | 'file' | 'database';
  /** Enable caching for snapshots and queries */
  enableCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
}

export interface ChangeDiff {
  path: string;
  type: 'added' | 'removed' | 'modified';
  before?: any;
  after?: any;
}

export class StateManager extends EventEmitter {
  private config: StateManagerConfig;
  private currentState: any = {};
  private snapshots: Map<string, StateSnapshot> = new Map();
  private changeHistory: StateChange[] = [];
  private controlStateMap: Map<string, ControlResult> = new Map();
  private activeControls: Set<string> = new Set();
  private snapshotCache: Cache<StateSnapshot>;
  private queryCache: Cache<StateSnapshot[]>;

  constructor(config: StateManagerConfig = {}) {
    super();
    this.config = {
      maxSnapshots: config.maxSnapshots ?? 100,
      enablePersistence: config.enablePersistence ?? false,
      storageBackend: config.storageBackend ?? 'memory',
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL ?? 300000, // 5 minutes default
    };

    // Initialize caches
    this.snapshotCache = new Cache<StateSnapshot>({
      defaultTTL: this.config.cacheTTL,
      enableStats: true,
    });
    this.queryCache = new Cache<StateSnapshot[]>({
      defaultTTL: this.config.cacheTTL,
      enableStats: true,
    });
  }

  /**
   * Get the current state
   * @returns Deep copy of current state
   * @example
   * const state = stateManager.getCurrentState();
   */
  async getCurrentState(): Promise<any> {
    return this.deepClone(this.currentState);
  }

  /**
   * Create a snapshot of the current state
   * @param metadata - Optional metadata to attach to snapshot
   * @returns StateSnapshot object with unique ID
   * @example
   * const snapshot = await stateManager.createSnapshot({ reason: 'before major change' });
   */
  async createSnapshot(metadata?: Record<string, any>): Promise<StateSnapshot> {
    const snapshotId = this.generateSnapshotId();
    const timestamp = Date.now();
    
    const snapshot: StateSnapshot = {
      snapshotId,
      timestamp,
      state: this.deepClone(this.currentState),
      activeControls: Array.from(this.activeControls),
      metadata,
    };

    this.snapshots.set(snapshotId, snapshot);
    
    // Invalidate caches on snapshot creation
    if (this.config.enableCache) {
      this.snapshotCache.set(snapshotId, snapshot);
      this.queryCache.clear(); // Invalidate all query caches
    }
    
    // Enforce max snapshots limit
    if (this.snapshots.size > this.config.maxSnapshots!) {
      const sortedSnapshots = Array.from(this.snapshots.values())
        .sort((a, b) => a.timestamp - b.timestamp);
      const oldestSnapshot = sortedSnapshots[0];
      this.snapshots.delete(oldestSnapshot.snapshotId);
      if (this.config.enableCache) {
        this.snapshotCache.delete(oldestSnapshot.snapshotId);
      }
      this.emit('snapshot-deleted', oldestSnapshot.snapshotId);
    }

    this.emit('snapshot-created', snapshot);
    return snapshot;
  }

  /**
   * Apply changes from a disc to the state
   * @param controlId - ID of the control applying changes
   * @param disc - Disc object or state changes
   * @returns StateChange record
   * @example
   * const change = await stateManager.applyDiscChanges('control-1', myDisc);
   */
  async applyDiscChanges(controlId: string, disc: any): Promise<StateChange> {
    const before = this.deepClone(this.currentState);
    
    // Merge disc into current state (not replace)
    if (disc && typeof disc === 'object') {
      Object.keys(disc).forEach(key => {
        if (disc[key] === undefined) {
          delete this.currentState[key];
        } else {
          this.currentState[key] = disc[key];
        }
      });
    }
    
    const after = this.deepClone(this.currentState);
    
    const stateChange: StateChange = {
      controlId,
      timestamp: Date.now(),
      before,
      after,
      changeType: 'apply',
    };

    this.changeHistory.push(stateChange);
    this.controlStateMap.set(controlId, { before, after });
    this.activeControls.add(controlId);

    // Invalidate query cache on state change
    if (this.config.enableCache) {
      this.queryCache.clear();
    }

    // Create automatic snapshot
    await this.createSnapshot({ controlId, changeType: 'apply' });

    this.emit('state-changed', stateChange);
    return stateChange;
  }

  /**
   * Rollback to a previous state snapshot
   * @param snapshotId - ID of the snapshot to restore
   * @throws Error if snapshot not found
   * @example
   * await stateManager.rollbackToSnapshot('snapshot-123');
   */
  async rollbackToSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId);
    
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    const before = this.deepClone(this.currentState);
    this.currentState = this.deepClone(snapshot.state);
    this.activeControls = new Set(snapshot.activeControls);

    const stateChange: StateChange = {
      controlId: `rollback-${snapshotId}`,
      timestamp: Date.now(),
      before,
      after: this.deepClone(this.currentState),
      changeType: 'revert',
    };

    this.changeHistory.push(stateChange);
    
    // Invalidate caches on rollback
    if (this.config.enableCache) {
      this.queryCache.clear();
    }
    
    // Create new snapshot of the rolled-back state
    await this.createSnapshot({ rollbackTo: snapshotId });

    this.emit('snapshot-restored', snapshotId);
  }

  /**
   * Revert changes from a specific control
   * @param controlId - ID of the control to revert
   * @returns StateChange record
   * @throws Error if control not found
   */
  async revertControlChanges(controlId: string): Promise<StateChange> {
    const controlState = this.controlStateMap.get(controlId);
    
    if (!controlState) {
      throw new Error(`Control not found: ${controlId}`);
    }

    const before = this.deepClone(this.currentState);
    this.currentState = this.deepClone(controlState.before);
    
    const stateChange: StateChange = {
      controlId,
      timestamp: Date.now(),
      before,
      after: this.deepClone(this.currentState),
      changeType: 'revert',
    };

    this.changeHistory.push(stateChange);
    this.controlStateMap.delete(controlId);
    this.activeControls.delete(controlId);

    // Invalidate query cache on revert
    if (this.config.enableCache) {
      this.queryCache.clear();
    }

    await this.createSnapshot({ controlId, changeType: 'revert' });

    this.emit('state-changed', stateChange);
    return stateChange;
  }

  /**
   * Get change history for a specific control
   * @param controlId - ID of the control
   * @returns Array of state changes
   */
  getControlHistory(controlId: string): StateChange[] {
    return this.changeHistory.filter(change => change.controlId === controlId);
  }

  /**
   * Get a specific snapshot by ID
   * @param snapshotId - ID of the snapshot
   * @returns StateSnapshot or null if not found
   */
  async getSnapshot(snapshotId: string): Promise<StateSnapshot | null> {
    // Try cache first
    if (this.config.enableCache) {
      const cached = this.snapshotCache.get(snapshotId);
      if (cached !== null) {
        this.emit('cache-hit', { type: 'snapshot', key: snapshotId });
        return cached;
      }
      this.emit('cache-miss', { type: 'snapshot', key: snapshotId });
    }

    // Fetch from source
    const snapshot = this.snapshots.get(snapshotId) ?? null;
    
    // Cache the result
    if (this.config.enableCache && snapshot !== null) {
      this.snapshotCache.set(snapshotId, snapshot);
    }

    return snapshot;
  }

  /**
   * List snapshots with optional filtering
   * @param filter - Optional filter criteria
   * @returns Array of snapshots matching the filter
   * @example
   * const snapshots = await stateManager.listSnapshots({ startTime: Date.now() - 86400000 });
   */
  async listSnapshots(filter?: { 
    controlId?: string; 
    startTime?: number; 
    endTime?: number;
  }): Promise<StateSnapshot[]> {
    // Generate cache key from filter
    const cacheKey = `list:${JSON.stringify(filter ?? {})}`;

    // Try cache first
    if (this.config.enableCache) {
      const cached = this.queryCache.get(cacheKey);
      if (cached !== null) {
        this.emit('cache-hit', { type: 'query', key: cacheKey });
        return cached;
      }
      this.emit('cache-miss', { type: 'query', key: cacheKey });
    }

    // Perform query
    let snapshots = Array.from(this.snapshots.values());

    if (filter) {
      if (filter.controlId) {
        snapshots = snapshots.filter(s => 
          s.activeControls.includes(filter.controlId!)
        );
      }
      if (filter.startTime) {
        snapshots = snapshots.filter(s => s.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        snapshots = snapshots.filter(s => s.timestamp <= filter.endTime!);
      }
    }

    const result = snapshots.sort((a, b) => b.timestamp - a.timestamp);

    // Cache the result
    if (this.config.enableCache) {
      this.queryCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Calculate diff between two snapshots
   * @param snapshotIdA - ID of first snapshot
   * @param snapshotIdB - ID of second snapshot
   * @returns Array of change diffs
   * @throws Error if either snapshot not found
   */
  async diff(snapshotIdA: string, snapshotIdB: string): Promise<ChangeDiff[]> {
    const snapshotA = this.snapshots.get(snapshotIdA);
    const snapshotB = this.snapshots.get(snapshotIdB);

    if (!snapshotA) {
      throw new Error(`Snapshot not found: ${snapshotIdA}`);
    }
    if (!snapshotB) {
      throw new Error(`Snapshot not found: ${snapshotIdB}`);
    }

    return this.calculateDiff(snapshotA.state, snapshotB.state);
  }

  /**
   * Remove snapshots older than retention period
   * @param retentionDays - Number of days to retain snapshots
   * @returns Number of snapshots removed
   * @example
   * const removed = await stateManager.cleanup(30); // Remove snapshots older than 30 days
   */
  async cleanup(retentionDays: number): Promise<number> {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const snapshots = Array.from(this.snapshots.values());
    let removed = 0;

    for (const snapshot of snapshots) {
      if (snapshot.timestamp < cutoffTime) {
        this.snapshots.delete(snapshot.snapshotId);
        if (this.config.enableCache) {
          this.snapshotCache.delete(snapshot.snapshotId);
        }
        this.emit('snapshot-deleted', snapshot.snapshotId);
        removed++;
      }
    }

    // Invalidate query cache after cleanup
    if (this.config.enableCache && removed > 0) {
      this.queryCache.clear();
    }

    return removed;
  }

  /**
   * Get state for a specific control
   * @param controlId - ID of the control
   * @returns Control state or null if not found
   */
  getControlState(controlId: string): any | null {
    return this.controlStateMap.get(controlId) ?? null;
  }

  /**
   * Get cache statistics
   * @returns Object containing cache stats for snapshots and queries
   * @example
   * const stats = stateManager.getCacheStats();
   * console.log(`Snapshot cache hit rate: ${stats.snapshots.hitRate}%`);
   */
  getCacheStats(): { snapshots: any; queries: any } {
    return {
      snapshots: this.snapshotCache.getStats(),
      queries: this.queryCache.getStats(),
    };
  }

  /**
   * Destroy the state manager and cleanup resources
   * @example
   * stateManager.destroy();
   */
  destroy(): void {
    this.snapshotCache.destroy();
    this.queryCache.destroy();
    this.removeAllListeners();
  }

  /**
   * Calculate diff between two states
   * @private
   */
  private calculateDiff(beforeState: any, afterState: any, basePath = ''): ChangeDiff[] {
    const diffs: ChangeDiff[] = [];

    // Handle null/undefined cases
    if (beforeState === null || beforeState === undefined) {
      if (afterState !== null && afterState !== undefined) {
        diffs.push({ path: basePath || 'root', type: 'added', after: afterState });
      }
      return diffs;
    }

    if (afterState === null || afterState === undefined) {
      diffs.push({ path: basePath || 'root', type: 'removed', before: beforeState });
      return diffs;
    }

    // Handle primitive types
    if (typeof beforeState !== 'object' || typeof afterState !== 'object') {
      if (beforeState !== afterState) {
        diffs.push({
          path: basePath || 'root',
          type: 'modified',
          before: beforeState,
          after: afterState,
        });
      }
      return diffs;
    }

    // Handle objects
    const beforeKeys = Object.keys(beforeState);
    const afterKeys = Object.keys(afterState);
    const allKeys = Array.from(new Set([...beforeKeys, ...afterKeys]));

    for (const key of allKeys) {
      const newPath = basePath ? `${basePath}.${key}` : key;

      if (!(key in beforeState)) {
        diffs.push({ path: newPath, type: 'added', after: afterState[key] });
      } else if (!(key in afterState)) {
        diffs.push({ path: newPath, type: 'removed', before: beforeState[key] });
      } else if (typeof beforeState[key] === 'object' && typeof afterState[key] === 'object') {
        // Recursive diff for nested objects
        diffs.push(...this.calculateDiff(beforeState[key], afterState[key], newPath));
      } else if (beforeState[key] !== afterState[key]) {
        diffs.push({
          path: newPath,
          type: 'modified',
          before: beforeState[key],
          after: afterState[key],
        });
      }
    }

    return diffs;
  }

  /**
   * Deep clone an object to prevent mutations
   * @private
   */
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Handle circular references and complex objects
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }

    if (obj instanceof Map) {
      const cloned = new Map();
      obj.forEach((value, key) => {
        cloned.set(key, this.deepClone(value));
      });
      return cloned;
    }

    if (obj instanceof Set) {
      const cloned = new Set();
      obj.forEach(value => {
        cloned.add(this.deepClone(value));
      });
      return cloned;
    }

    const cloned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * Generate a unique snapshot ID
   * @private
   */
  private generateSnapshotId(): string {
    return `snapshot-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
