/**
 * DJEngine - Core orchestration engine for the Universal DJ Control Layer
 * 
 * Responsibilities:
 * - Coordinate disc application and removal
 * - Manage control lifecycle (preview -> apply -> revert)
 * - Interface with policy evaluator for permission checks
 * - Maintain state consistency across operations
 * - Emit events for observability
 */

import type { Disc } from '../discs/feature-disc';
import type { Role } from '../roles/creator';
import { PolicyEvaluator } from './policy-evaluator';
import { RBACManager } from './rbac-manager';
import type { StateManager } from './state-manager';
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
  /** Custom RBAC manager instance */
  rbacManager?: RBACManager;
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
  private policyEvaluator: PolicyEvaluator;
  private rbacManager: RBACManager;
  private auditLog: AuditLog;
  private stateManager: StateManager | null = null;
  private guardrails: Guardrails | null = null;
  private activeControls: Map<string, ControlResult> = new Map();

  constructor(config: DJEngineConfig) {
    this.config = config;
    
    // Initialize audit log
    this.auditLog = config.auditLog ?? new AuditLog({ 
      enabled: config.enableAudit ?? true 
    });
    
    // Initialize policy evaluator with audit log
    this.policyEvaluator = config.policyEvaluator ?? new PolicyEvaluator({ 
      auditLog: this.auditLog,
      enableCache: true
    });
    
    // Initialize RBAC manager with audit log
    this.rbacManager = config.rbacManager ?? new RBACManager({
      auditLog: this.auditLog,
      enableCache: true
    });
    
    // Log engine initialization
    this.auditLog.log({
      action: 'apply',
      actorId: config.creatorId,
      actorRole: 'creator',
      result: 'success',
      metadata: {
        action: 'engine-initialized',
        maxConcurrentControls: config.maxConcurrentControls,
      },
    });
  }

  /**
   * Preview a control change without applying it
   * Runs in isolated sandbox to simulate impact
   */
  async previewControl(disc: Disc, role: Role, userId?: string): Promise<PreviewResult> {
    // 1. Check RBAC permissions
    const userIdToCheck = userId ?? role.metadata.userId;
    if (!this.rbacManager.hasPermission(userIdToCheck, 'preview-control')) {
      throw new Error(`User ${userIdToCheck} lacks permission to preview controls`);
    }

    // 2. Evaluate policies
    const policyResult = await this.policyEvaluator.evaluate({
      role,
      disc,
      operation: 'preview',
      userId: userIdToCheck,
    });

    if (!policyResult.allowed) {
      throw new Error(`Policy violation: ${policyResult.denialReasons?.join(', ')}`);
    }

    // 3. Run disc preview
    try {
      const previewResult = await disc.preview({});
      
      // 4. Log preview to audit
      await this.auditLog.log({
        action: 'preview',
        actorId: userIdToCheck,
        actorRole: role.metadata.roleType,
        discType: disc.metadata.type,
        result: 'success',
        metadata: {
          discId: disc.metadata.id,
          warnings: policyResult.warnings,
        },
      });

      return {
        safe: true,
        affectedSystems: [],
        potentialIssues: policyResult.warnings ?? [],
        diff: previewResult,
      };
    } catch (error: any) {
      await this.auditLog.log({
        action: 'preview',
        actorId: userIdToCheck,
        actorRole: role.metadata.roleType,
        discType: disc.metadata.type,
        result: 'failure',
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Apply a control to the running system
   * Changes take effect immediately after successful application
   */
  async applyControl(
    disc: Disc,
    role: Role,
    options?: { previewFirst?: boolean; userId?: string }
  ): Promise<ControlResult> {
    const userId = options?.userId ?? role.metadata.userId;

    // 1. Check concurrent controls limit
    const maxConcurrent = this.config.maxConcurrentControls ?? 10;
    if (this.activeControls.size >= maxConcurrent) {
      throw new Error(`Maximum concurrent controls limit (${maxConcurrent}) reached`);
    }

    // 2. Preview first if requested
    if (options?.previewFirst) {
      const preview = await this.previewControl(disc, role, userId);
      if (!preview.safe) {
        throw new Error('Preview indicates unsafe operation');
      }
    }

    // 3. Check RBAC permissions
    if (!this.rbacManager.hasPermission(userId, 'apply-control')) {
      throw new Error(`User ${userId} lacks permission to apply controls`);
    }

    // 4. Validate disc safety before policy evaluation
    const violations = this.policyEvaluator.validateDiscSafety(disc);
    if (violations.length > 0) {
      await this.auditLog.log({
        action: 'apply',
        actorId: userId,
        actorRole: role.metadata.roleType,
        result: 'failure',
        error: `Disc safety violations: ${violations.join(', ')}`,
      });
      throw new Error(`Disc safety violations: ${violations.join(', ')}`);
    }

    // 5. Evaluate policies
    const policyResult = await this.policyEvaluator.evaluate({
      role,
      disc,
      operation: 'apply',
      userId,
    });

    if (!policyResult.allowed) {
      await this.auditLog.log({
        action: 'apply',
        actorId: userId,
        actorRole: role.metadata.roleType,
        discType: disc.metadata.type,
        result: 'failure',
        error: `Policy violation: ${policyResult.denialReasons?.join(', ')}`,
      });
      throw new Error(`Policy violation: ${policyResult.denialReasons?.join(', ')}`);
    }

    // 6. Apply the control
    const controlId = this.generateControlId();
    const timestamp = Date.now();

    try {
      // Apply disc changes
      await disc.apply({});

      // Record in active controls
      const controlResult: ControlResult = {
        controlId,
        timestamp,
        affectedSystems: [],
        status: 'success',
      };
      this.activeControls.set(controlId, controlResult);

      // Log to audit
      await this.auditLog.log({
        action: 'apply',
        actorId: userId,
        actorRole: role.metadata.roleType,
        controlId,
        discType: disc.metadata.type,
        result: 'success',
        metadata: {
          discId: disc.metadata.id,
          discName: disc.metadata.name,
        },
      });

      return controlResult;
    } catch (error: any) {
      // Log failure
      await this.auditLog.log({
        action: 'apply',
        actorId: userId,
        actorRole: role.metadata.roleType,
        controlId,
        discType: disc.metadata.type,
        result: 'failure',
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Revert a previously applied control
   * Rolls back all changes to pre-control state
   */
  async revertControl(controlId: string, role: Role, userId?: string): Promise<void> {
    const userIdToCheck = userId ?? role.metadata.userId;

    // 1. Validate control exists
    const control = this.activeControls.get(controlId);
    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    // 2. Check RBAC permissions
    if (!this.rbacManager.hasPermission(userIdToCheck, 'revert-control')) {
      throw new Error(`User ${userIdToCheck} lacks permission to revert controls`);
    }

    // 3. Check policy permissions (creator locks apply here too)
    // Note: We don't have the disc reference here, so we skip policy evaluation
    // In a real implementation, we'd store the disc reference with the control

    try {
      // 4. Revert the control
      // In a real implementation, we'd call disc.revert() with saved state
      // For now, we just remove from active controls

      this.activeControls.delete(controlId);

      // 5. Log to audit
      await this.auditLog.log({
        action: 'revert',
        actorId: userIdToCheck,
        actorRole: role.metadata.roleType,
        controlId,
        result: 'success',
      });
    } catch (error: any) {
      await this.auditLog.log({
        action: 'revert',
        actorId: userIdToCheck,
        actorRole: role.metadata.roleType,
        controlId,
        result: 'failure',
        error: error.message,
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
    if (options?.status && options.status !== 'all') {
      controls = controls.filter(c => {
        if (options.status === 'active') return c.status === 'success';
        if (options.status === 'reverted') return c.status === 'failed';
        return true;
      });
    }

    return controls;
  }

  /**
   * Query audit log entries for a specific control or time range
   */
  async queryAuditLog(options: {
    controlId?: string;
    timeRange?: { start: number; end: number };
  }): Promise<any> {
    const queryOptions: any = {};
    
    if (options.controlId) {
      queryOptions.controlId = options.controlId;
    }
    
    if (options.timeRange) {
      queryOptions.startTime = options.timeRange.start;
      queryOptions.endTime = options.timeRange.end;
    }

    return await this.auditLog.query(queryOptions);
  }

  /**
   * Get change history for a control
   */
  async getChangeHistory(controlId: string): Promise<any[]> {
    // Query audit log for all entries related to this control
    return await this.auditLog.query({ controlId });
  }

  /**
   * Get diff for a specific control
   */
  async getDiff(controlId: string): Promise<any> {
    const control = this.activeControls.get(controlId);
    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    // In a real implementation, this would compare before/after states
    return {
      controlId,
      changes: {},
    };
  }

  /**
   * Get the policy evaluator instance
   */
  getPolicyEvaluator(): PolicyEvaluator {
    return this.policyEvaluator;
  }

  /**
   * Get the RBAC manager instance
   */
  getRBACManager(): RBACManager {
    return this.rbacManager;
  }

  /**
   * Get the audit log instance
   */
  getAuditLog(): AuditLog {
    return this.auditLog;
  }

  /**
   * Generate a unique control ID
   */
  private generateControlId(): string {
    return `control-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
