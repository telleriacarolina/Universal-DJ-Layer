/**
 * DJEngine - Core orchestration engine for the Universal DJ Control Layer
 * 
 * Responsibilities:
 * - Coordinate disc application and removal
 * - Manage control lifecycle (preview -> apply -> revert)
 * - Interface with policy evaluator for permission checks
 * - Maintain state consistency across operations
 * - Emit events for observability
 * 
 * TODO: Implement full engine with event emitter, state tracking, and transaction management
 */

import type { Disc } from '../discs/feature-disc';
import type { Role } from '../roles/creator';
import type { PolicyEvaluator } from './policy-evaluator';
import { StateManager } from './state-manager';
import type { Guardrails } from './guardrails';
import { AuditLog } from '../audit/audit-log';

export interface DJEngineConfig {
  /** ID of the creator/owner of this DJ instance */
  creatorId: string;
  /** Enable audit logging for all operations */
  enableAudit?: boolean;
  /** Maximum number of concurrent controls */
  maxConcurrentControls?: number;
  /** Custom policy evaluator instance */
  policyEvaluator?: PolicyEvaluator;
  /** Custom state manager instance */
  stateManager?: StateManager;
  /** Custom audit log instance */
  auditLog?: AuditLog;
}

export interface ControlResult {
  /** Unique identifier for this control instance */
  controlId: string;
  /** Timestamp when control was applied */
  timestamp: number;
  /** Systems/components affected by this control */
  affectedSystems: string[];
  /** Status of the control operation */
  status: 'success' | 'failed' | 'partial';
}

export interface PreviewResult {
  /** Whether the control is safe to apply */
  safe: boolean;
  /** Systems that would be affected */
  affectedSystems: string[];
  /** Potential issues or warnings */
  potentialIssues: string[];
  /** Diff showing what would change */
  diff: Record<string, any>;
}

export interface ListControlsOptions {
  /** Filter by control status */
  status?: 'active' | 'reverted' | 'all';
  /** Filter by disc type */
  discType?: string;
  /** Filter by actor/role */
  actorId?: string;
}

export class DJEngine {
  private config: DJEngineConfig;
  private policyEvaluator: PolicyEvaluator | null = null;
  private stateManager: StateManager;
  private auditLog: AuditLog;
  private guardrails: Guardrails | null = null;
  private activeControls: Map<string, ControlResult> = new Map();
  private controlSnapshots: Map<string, string> = new Map(); // Maps controlId to snapshotId

  constructor(config: DJEngineConfig) {
    this.config = config;
    
    // Initialize StateManager
    this.stateManager = config.stateManager || new StateManager({ maxSnapshots: 100 });
    
    // Initialize AuditLog
    this.auditLog = config.auditLog || new AuditLog({ 
      retentionDays: 90,
      enabled: config.enableAudit ?? true,
    });
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for StateManager and AuditLog
   * @private
   */
  private setupEventListeners(): void {
    // Forward StateManager events
    this.stateManager.on('state-changed', (change) => {
      // Can be used for observability
    });

    this.stateManager.on('snapshot-created', (snapshot) => {
      // Can be used for observability
    });

    this.stateManager.on('snapshot-restored', (snapshotId) => {
      // Can be used for observability
    });

    // Forward AuditLog events
    this.auditLog.on('audit-logged', (entry) => {
      // Can be used for observability
    });
  }

  /**
   * Preview a control change without applying it
   * Runs in isolated sandbox to simulate impact
   */
  async previewControl(disc: Disc, role: Role): Promise<PreviewResult> {
    // Create a snapshot for preview
    const previewSnapshot = await this.stateManager.createSnapshot({
      reason: 'preview',
      discType: disc.metadata.type,
    });

    try {
      // Log preview operation
      await this.auditLog.log({
        action: 'preview',
        actorId: role.metadata.userId,
        actorRole: role.metadata.roleType,
        controlId: disc.metadata.id,
        discType: disc.metadata.type,
        result: 'success',
      });

      // Get current state before preview
      const beforeState = await this.stateManager.getCurrentState();

      // Execute disc preview method
      const previewResult = await disc.preview(beforeState);

      // Calculate what would change
      const affectedSystems = this.extractAffectedSystems(previewResult);
      const potentialIssues = this.assessSafety(previewResult);

      return {
        safe: potentialIssues.length === 0,
        affectedSystems,
        potentialIssues,
        diff: previewResult,
      };
    } finally {
      // Always rollback preview snapshot
      await this.stateManager.rollbackToSnapshot(previewSnapshot.snapshotId);
    }
  }

  /**
   * Extract affected systems from preview result
   * @private
   */
  private extractAffectedSystems(previewResult: any): string[] {
    // Extract system names from preview result
    if (!previewResult || typeof previewResult !== 'object') {
      return [];
    }
    return Object.keys(previewResult);
  }

  /**
   * Assess safety of preview result
   * @private
   */
  private assessSafety(previewResult: any): string[] {
    const issues: string[] = [];
    // Basic safety checks - can be extended
    if (!previewResult) {
      issues.push('Preview returned no result');
    }
    return issues;
  }

  /**
   * Apply a control to the running system
   * Changes take effect immediately after successful application
   */
  async applyControl(
    disc: Disc,
    role: Role,
    options?: { previewFirst?: boolean }
  ): Promise<ControlResult> {
    // If previewFirst option is enabled, run preview and check safety
    if (options?.previewFirst) {
      const preview = await this.previewControl(disc, role);
      if (!preview.safe) {
        throw new Error(`Preview safety check failed: ${preview.potentialIssues.join(', ')}`);
      }
    }

    // Create snapshot before applying changes
    const snapshot = await this.stateManager.createSnapshot({
      reason: 'before-apply',
      controlId: disc.metadata.id,
      discType: disc.metadata.type,
    });

    try {
      // Get current state
      const currentState = await this.stateManager.getCurrentState();

      // Apply disc changes
      const appliedState = await disc.apply(currentState);

      // Track state changes
      await this.stateManager.applyDiscChanges(disc.metadata.id, appliedState);

      // Create control result
      const controlResult: ControlResult = {
        controlId: disc.metadata.id,
        timestamp: Date.now(),
        affectedSystems: this.extractAffectedSystems(appliedState),
        status: 'success',
      };

      // Store control and snapshot mapping
      this.activeControls.set(disc.metadata.id, controlResult);
      this.controlSnapshots.set(disc.metadata.id, snapshot.snapshotId);

      // Log to audit log
      await this.auditLog.log({
        action: 'apply',
        actorId: role.metadata.userId,
        actorRole: role.metadata.roleType,
        controlId: disc.metadata.id,
        discType: disc.metadata.type,
        result: 'success',
        changes: {
          before: currentState,
          after: appliedState,
        },
      });

      return controlResult;
    } catch (error) {
      // Log failure to audit log
      await this.auditLog.log({
        action: 'apply',
        actorId: role.metadata.userId,
        actorRole: role.metadata.roleType,
        controlId: disc.metadata.id,
        discType: disc.metadata.type,
        result: 'failure',
        error: error instanceof Error ? error.message : String(error),
      });

      // Rollback on failure
      await this.stateManager.rollbackToSnapshot(snapshot.snapshotId);

      throw error;
    }
  }

  /**
   * Revert a previously applied control
   * Rolls back all changes to pre-control state
   */
  async revertControl(controlId: string, role: Role): Promise<void> {
    // Check if control exists
    const control = this.activeControls.get(controlId);
    if (!control) {
      throw new Error(`Control not found: ${controlId}`);
    }

    // Get the snapshot ID for this control
    const snapshotId = this.controlSnapshots.get(controlId);
    if (!snapshotId) {
      throw new Error(`Snapshot not found for control: ${controlId}`);
    }

    try {
      // Revert control changes using StateManager
      await this.stateManager.revertControlChanges(controlId);

      // Remove from active controls and snapshot mapping
      this.activeControls.delete(controlId);
      this.controlSnapshots.delete(controlId);

      // Log revert operation to audit log
      await this.auditLog.log({
        action: 'revert',
        actorId: role.metadata.userId,
        actorRole: role.metadata.roleType,
        controlId: controlId,
        result: 'success',
        metadata: {
          snapshotId: snapshotId,
        },
      });
    } catch (error) {
      // Log failure
      await this.auditLog.log({
        action: 'revert',
        actorId: role.metadata.userId,
        actorRole: role.metadata.roleType,
        controlId: controlId,
        result: 'failure',
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * List all controls matching the given criteria
   */
  async listControls(options?: ListControlsOptions): Promise<ControlResult[]> {
    let controls = Array.from(this.activeControls.values());

    // Apply filters
    if (options?.status === 'active') {
      controls = controls.filter(c => this.activeControls.has(c.controlId));
    } else if (options?.status === 'reverted') {
      // Reverted controls are no longer in activeControls
      // Return empty array as they are not tracked separately
      return [];
    }
    // If status is 'all' or undefined, return all active controls

    return controls;
  }

  /**
   * Get audit log entries for a specific control
   */
  async getAuditLog(options: {
    controlId?: string;
    timeRange?: { start: number; end: number };
  }): Promise<any> {
    return await this.auditLog.query({
      controlId: options.controlId,
      startTime: options.timeRange?.start,
      endTime: options.timeRange?.end,
    });
  }

  /**
   * Get change history for a control
   */
  async getChangeHistory(controlId: string): Promise<any[]> {
    return this.stateManager.getControlHistory(controlId);
  }

  /**
   * Get diff for a specific control
   */
  async getDiff(controlId: string): Promise<any> {
    const controlState = this.stateManager.getControlState(controlId);
    if (!controlState) {
      throw new Error(`Control not found: ${controlId}`);
    }

    // Calculate diff between before and after states
    return {
      before: controlState.before,
      after: controlState.after,
    };
  }

  /**
   * Get control history for a specific control
   * @param controlId - ID of the control
   * @returns Array of state changes for the control
   */
  async getControlHistory(controlId: string): Promise<any[]> {
    return this.stateManager.getControlHistory(controlId);
  }

  /**
   * Get audit trail with filtering options
   * @param options - Query options for filtering audit entries
   * @returns Array of matching audit entries
   */
  async getAuditTrail(options?: {
    controlId?: string;
    actorId?: string;
    action?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<any[]> {
    return await this.auditLog.query({
      controlId: options?.controlId,
      actorId: options?.actorId,
      action: options?.action as any,
      startTime: options?.startTime,
      endTime: options?.endTime,
      limit: options?.limit,
    });
  }

  /**
   * List snapshots with optional filtering
   * @param filter - Optional filter criteria
   * @returns Array of snapshots matching the filter
   */
  async listSnapshots(filter?: {
    controlId?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<any[]> {
    return await this.stateManager.listSnapshots(filter);
  }

  /**
   * Compare two controls and get their differences
   * @param controlIdA - First control ID
   * @param controlIdB - Second control ID
   * @returns Diff between the two controls
   */
  async diffControls(controlIdA: string, controlIdB: string): Promise<any> {
    const stateA = this.stateManager.getControlState(controlIdA);
    const stateB = this.stateManager.getControlState(controlIdB);

    if (!stateA) {
      throw new Error(`Control not found: ${controlIdA}`);
    }
    if (!stateB) {
      throw new Error(`Control not found: ${controlIdB}`);
    }

    // Return comparison of the two control states
    return {
      controlA: {
        id: controlIdA,
        before: stateA.before,
        after: stateA.after,
      },
      controlB: {
        id: controlIdB,
        before: stateB.before,
        after: stateB.after,
      },
    };
  }
}
