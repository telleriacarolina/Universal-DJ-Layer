import { StateSnapshot } from './types';

/**
 * State management system with snapshot and rollback capabilities
 */
export class StateManager {
  private snapshots: StateSnapshot[] = [];
  private maxSnapshots: number;
  private currentState: Map<string, any> = new Map();

  constructor(maxSnapshots: number = 100) {
    this.maxSnapshots = maxSnapshots;
  }

  /**
   * Create a snapshot of the current state
   */
  createSnapshot(userId: string, description?: string): string {
    const snapshot: StateSnapshot = {
      id: this.generateSnapshotId(),
      timestamp: new Date(),
      userId,
      discStates: new Map(this.currentState),
      description
    };

    this.snapshots.push(snapshot);

    // Maintain max snapshot size
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot.id;
  }

  /**
   * Restore state from a snapshot
   */
  rollbackToSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      return false;
    }

    this.currentState = new Map(snapshot.discStates);
    return true;
  }

  /**
   * Get a specific snapshot
   */
  getSnapshot(snapshotId: string): StateSnapshot | undefined {
    return this.snapshots.find(s => s.id === snapshotId);
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get snapshots by user
   */
  getSnapshotsByUser(userId: string): StateSnapshot[] {
    return this.snapshots.filter(s => s.userId === userId);
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(snapshotId: string): boolean {
    const index = this.snapshots.findIndex(s => s.id === snapshotId);
    if (index === -1) {
      return false;
    }

    this.snapshots.splice(index, 1);
    return true;
  }

  /**
   * Set state for a disc
   */
  setState(discId: string, state: any): void {
    this.currentState.set(discId, state);
  }

  /**
   * Get state for a disc
   */
  getState(discId: string): any {
    return this.currentState.get(discId);
  }

  /**
   * Get all current states
   */
  getAllStates(): Map<string, any> {
    return new Map(this.currentState);
  }

  /**
   * Clear all states
   */
  clearStates(): void {
    this.currentState.clear();
  }

  /**
   * Generate a unique snapshot ID
   */
  private generateSnapshotId(): string {
    return `snapshot-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
