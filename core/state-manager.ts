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
import type { Disc } from '../discs/feature-disc';

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
}

export class StateManager extends EventEmitter {
  private config: StateManagerConfig;
  private currentState: any = {};
  private snapshots: Map<string, StateSnapshot> = new Map();
  private changeHistory: StateChange[] = [];
  private controlStateMap: Map<string, any> = new Map();

  constructor(config: StateManagerConfig = {}) {
    super();
    this.config = {
      maxSnapshots: config.maxSnapshots ?? 100,
      enablePersistence: config.enablePersistence ?? false,
      storageBackend: config.storageBackend ?? 'memory',
    };
  }

  /**
   * Get the current state
   * @returns Deep copy of current state
   */
  getCurrentState(): any {
    return this.deepClone(this.currentState);
  }

  /**
   * Create a snapshot of the current state
   * @param metadata Optional metadata to attach to the snapshot
   * @returns The created snapshot
   * @example
   * ```typescript
   * const snapshot = stateManager.createSnapshot({ reason: 'Before applying feature' });
   * ```
   */
  createSnapshot(metadata?: Record<string, any>): StateSnapshot {
    const snapshotId = this.generateSnapshotId();
    const timestamp = Date.now();
    
    const snapshot: StateSnapshot = {
      snapshotId,
      timestamp,
      state: this.deepClone(this.currentState),
      activeControls: Array.from(this.controlStateMap.keys()),
      metadata: metadata ? { ...metadata } : undefined,
    };

    this.snapshots.set(snapshotId, snapshot);
    
    // Enforce max snapshots limit
    this.pruneSnapshots();
    
    // Emit event
    this.emit('snapshot-created', snapshot);
    
    return snapshot;
  }

  /**
   * Apply changes from a disc to the state
   * @param controlId ID of the control applying changes
   * @param disc The disc to apply
   * @returns State change record
   */
  applyDiscChanges(controlId: string, disc: Disc): StateChange {
    const before = this.deepClone(this.currentState);
    
    // Apply disc transformations (simplified - would need actual disc logic)
    // For now, we'll store the disc reference in the control state map
    this.controlStateMap.set(controlId, {
      disc,
      appliedAt: Date.now(),
    });
    
    const after = this.deepClone(this.currentState);
    
    const stateChange: StateChange = {
      controlId,
      timestamp: Date.now(),
      before,
      after,
      changeType: 'apply',
    };
    
    this.changeHistory.push(stateChange);
    
    // Create automatic snapshot
    this.createSnapshot({ controlId, action: 'apply' });
    
    // Emit event
    this.emit('state-changed', stateChange);
    
    return stateChange;
  }

  /**
   * Rollback to a previous state snapshot
   * @param snapshotId ID of the snapshot to restore
   * @throws Error if snapshot not found
   * @example
   * ```typescript
   * stateManager.rollbackToSnapshot('snapshot-123');
   * ```
   */
  rollbackToSnapshot(snapshotId: string): void {
    const snapshot = this.snapshots.get(snapshotId);
    
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    
    // Store current state before rollback
    const before = this.deepClone(this.currentState);
    
    // Restore state from snapshot
    this.currentState = this.deepClone(snapshot.state);
    
    // Create rollback record in change history
    const rollbackChange: StateChange = {
      controlId: `rollback-${snapshotId}`,
      timestamp: Date.now(),
      before,
      after: this.currentState,
      changeType: 'revert',
    };
    
    this.changeHistory.push(rollbackChange);
    
    // Create new snapshot of rollback
    this.createSnapshot({ action: 'rollback', sourceSnapshot: snapshotId });
    
    // Emit event
    this.emit('snapshot-restored', { snapshotId, snapshot });
  }

  /**
   * Revert changes from a specific control
   * @param controlId ID of the control to revert
   * @returns State change record
   * @throws Error if control not found
   */
  revertControlChanges(controlId: string): StateChange {
    const controlState = this.controlStateMap.get(controlId);
    
    if (!controlState) {
      throw new Error(`Control not found: ${controlId}`);
    }
    
    const before = this.deepClone(this.currentState);
    
    // Remove control from state map
    this.controlStateMap.delete(controlId);
    
    const after = this.deepClone(this.currentState);
    
    const stateChange: StateChange = {
      controlId,
      timestamp: Date.now(),
      before,
      after,
      changeType: 'revert',
    };
    
    this.changeHistory.push(stateChange);
    
    // Create snapshot
    this.createSnapshot({ controlId, action: 'revert' });
    
    // Emit event
    this.emit('state-changed', stateChange);
    
    return stateChange;
  }

  /**
   * Get change history for a specific control
   * @param controlId ID of the control
   * @returns Array of state changes
   */
  getControlHistory(controlId: string): StateChange[] {
    return this.changeHistory.filter(change => change.controlId === controlId);
  }

  /**
   * Get a specific snapshot by ID
   * @param snapshotId ID of the snapshot
   * @returns The snapshot or null if not found
   */
  getSnapshot(snapshotId: string): StateSnapshot | null {
    return this.snapshots.get(snapshotId) ?? null;
  }

  /**
   * List snapshots with optional filtering
   * @param filter Optional filters for snapshots
   * @returns Array of matching snapshots
   * @example
   * ```typescript
   * const recent = stateManager.listSnapshots({ 
   *   startTime: Date.now() - 86400000 
   * });
   * ```
   */
  async listSnapshots(filter?: { 
    controlId?: string; 
    startTime?: number; 
    endTime?: number;
  }): Promise<StateSnapshot[]> {
    let snapshots = Array.from(this.snapshots.values());
    
    if (filter?.controlId) {
      snapshots = snapshots.filter(s => 
        s.activeControls.includes(filter.controlId!)
      );
    }
    
    if (filter?.startTime !== undefined) {
      snapshots = snapshots.filter(s => s.timestamp >= filter.startTime!);
    }
    
    if (filter?.endTime !== undefined) {
      snapshots = snapshots.filter(s => s.timestamp <= filter.endTime!);
    }
    
    // Sort by timestamp descending (newest first)
    snapshots.sort((a, b) => b.timestamp - a.timestamp);
    
    return snapshots;
  }

  /**
   * Calculate diff between two snapshots
   * @param snapshotIdA First snapshot ID
   * @param snapshotIdB Second snapshot ID
   * @returns Array of differences
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
   * Clean up old snapshots based on retention period
   * @param retentionDays Number of days to retain snapshots
   * @returns Number of snapshots removed
   * @example
   * ```typescript
   * const removed = await stateManager.cleanup(30); // Keep last 30 days
   * ```
   */
  async cleanup(retentionDays: number): Promise<number> {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    let removedCount = 0;
    
    for (const [snapshotId, snapshot] of this.snapshots.entries()) {
      if (snapshot.timestamp < cutoffTime) {
        this.snapshots.delete(snapshotId);
        removedCount++;
        this.emit('snapshot-deleted', { snapshotId, snapshot });
      }
    }
    
    return removedCount;
  }

  /**
   * Calculate diff between two states
   * @param beforeState State before change
   * @param afterState State after change
   * @returns Array of differences
   */
  calculateDiff(beforeState: any, afterState: any): ChangeDiff[] {
    return this.calculateDiffRecursive(beforeState, afterState, '');
  }

  /**
   * Get state for a specific control
   * @param controlId ID of the control
   * @returns Control state or null if not found
   */
  getControlState(controlId: string): any | null {
    return this.controlStateMap.get(controlId) ?? null;
  }

  /**
   * Clear old snapshots beyond retention limit
   * @private
   */
  private pruneSnapshots(): void {
    const maxSnapshots = this.config.maxSnapshots!;
    
    if (this.snapshots.size <= maxSnapshots) {
      return;
    }
    
    // Sort snapshots by timestamp
    const sortedSnapshots = Array.from(this.snapshots.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    // Remove oldest snapshots
    const toRemove = sortedSnapshots.slice(0, this.snapshots.size - maxSnapshots);
    
    for (const [snapshotId, snapshot] of toRemove) {
      this.snapshots.delete(snapshotId);
      this.emit('snapshot-deleted', { snapshotId, snapshot });
    }
  }

  /**
   * Generate a unique snapshot ID
   * @private
   */
  private generateSnapshotId(): string {
    return `snapshot-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Deep clone an object to prevent mutations
   * Handles circular references
   * @private
   */
  private deepClone(obj: any, seen = new WeakMap()): any {
    // Handle primitives and null
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    // Handle circular references
    if (seen.has(obj)) {
      return seen.get(obj);
    }
    
    // Handle Date
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    // Handle Array
    if (Array.isArray(obj)) {
      const arrCopy: any[] = [];
      seen.set(obj, arrCopy);
      obj.forEach((item, index) => {
        arrCopy[index] = this.deepClone(item, seen);
      });
      return arrCopy;
    }
    
    // Handle Map
    if (obj instanceof Map) {
      const mapCopy = new Map();
      seen.set(obj, mapCopy);
      obj.forEach((value, key) => {
        mapCopy.set(this.deepClone(key, seen), this.deepClone(value, seen));
      });
      return mapCopy;
    }
    
    // Handle Set
    if (obj instanceof Set) {
      const setCopy = new Set();
      seen.set(obj, setCopy);
      obj.forEach(value => {
        setCopy.add(this.deepClone(value, seen));
      });
      return setCopy;
    }
    
    // Handle Object
    const objCopy: any = {};
    seen.set(obj, objCopy);
    Object.keys(obj).forEach(key => {
      objCopy[key] = this.deepClone(obj[key], seen);
    });
    
    return objCopy;
  }

  /**
   * Recursively calculate diff between two objects
   * @private
   */
  private calculateDiffRecursive(
    before: any, 
    after: any, 
    path: string
  ): ChangeDiff[] {
    const diffs: ChangeDiff[] = [];
    
    // Handle null/undefined cases
    if (before === null || before === undefined) {
      if (after !== null && after !== undefined) {
        diffs.push({ path, type: 'added', newValue: after });
      }
      return diffs;
    }
    
    if (after === null || after === undefined) {
      diffs.push({ path, type: 'removed', oldValue: before });
      return diffs;
    }
    
    // Handle primitive types
    if (typeof before !== 'object' || typeof after !== 'object') {
      if (before !== after) {
        diffs.push({ path, type: 'modified', oldValue: before, newValue: after });
      }
      return diffs;
    }
    
    // Handle objects
    const allKeys = new Set([
      ...Object.keys(before),
      ...Object.keys(after)
    ]);
    
    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;
      const beforeVal = before[key];
      const afterVal = after[key];
      
      if (!(key in before)) {
        diffs.push({ path: newPath, type: 'added', newValue: afterVal });
      } else if (!(key in after)) {
        diffs.push({ path: newPath, type: 'removed', oldValue: beforeVal });
      } else if (typeof beforeVal === 'object' && typeof afterVal === 'object') {
        diffs.push(...this.calculateDiffRecursive(beforeVal, afterVal, newPath));
      } else if (beforeVal !== afterVal) {
        diffs.push({ 
          path: newPath, 
          type: 'modified', 
          oldValue: beforeVal, 
          newValue: afterVal 
        });
      }
    }
    
    return diffs;
  }
}
