import { Disc } from './disc';
import { RBACManager } from './rbac';
import { AuditLogger } from './audit-logger';
import { StateManager } from './state-manager';
import { ComplianceValidator } from './compliance-validator';
import {
  DJControlLayerConfig,
  User,
  Role,
  Permission,
  ChangeContext,
  IntegrationHooks
} from './types';

/**
 * Main DJ Control Layer class
 * Manages discs, user access, state, and compliance
 */
export class DJControlLayer {
  private discs: Map<string, Disc> = new Map();
  private rbacManager: RBACManager;
  private auditLogger: AuditLogger;
  private stateManager: StateManager;
  private complianceValidator: ComplianceValidator;
  private config: DJControlLayerConfig;
  private hooks: IntegrationHooks;
  private userContexts: Map<string, any> = new Map();

  constructor(config: DJControlLayerConfig = {}) {
    this.config = {
      enableAuditLog: true,
      maxSnapshots: 100,
      enableUserIsolation: true,
      complianceRules: [],
      hooks: {},
      ...config
    };

    this.rbacManager = new RBACManager();
    this.auditLogger = new AuditLogger();
    this.stateManager = new StateManager(this.config.maxSnapshots || 100);
    this.complianceValidator = new ComplianceValidator();
    this.hooks = this.config.hooks || {};

    // Initialize compliance rules
    if (this.config.complianceRules) {
      this.config.complianceRules.forEach(rule => {
        this.complianceValidator.addRule(rule);
      });
    }
  }

  /**
   * Add a disc to the layer
   */
  async addDisc(disc: Disc, user: User): Promise<void> {
    const metadata = disc.getMetadata();

    // Check permissions
    if (!this.rbacManager.canPerformAction(user, Role.ADMIN, [Permission.CONFIGURE])) {
      throw new Error('Insufficient permissions to add disc');
    }

    // Validate compliance
    const complianceResult = await this.complianceValidator.validateAll({
      action: 'addDisc',
      disc: metadata,
      user
    });

    if (!complianceResult.passed) {
      throw new Error(`Compliance validation failed: ${complianceResult.violations.join(', ')}`);
    }

    // Call before change hook
    if (this.hooks.onBeforeChange) {
      const allowed = await this.hooks.onBeforeChange({
        user,
        discId: metadata.id,
        action: 'addDisc',
        data: metadata
      });

      if (!allowed) {
        throw new Error('Change blocked by integration hook');
      }
    }

    // Initialize disc
    await disc.initialize();

    // Add disc
    this.discs.set(metadata.id, disc);

    // Update state
    this.stateManager.setState(metadata.id, disc.getState());

    // Log action
    if (this.config.enableAuditLog) {
      this.auditLogger.log({
        userId: user.id,
        userName: user.name,
        action: 'addDisc',
        discId: metadata.id,
        discName: metadata.name,
        changeDescription: `Added disc: ${metadata.name}`,
        newState: disc.getState()
      });

      if (this.hooks.onAuditLog) {
        const logs = this.auditLogger.getAllLogs();
        await this.hooks.onAuditLog(logs[logs.length - 1]);
      }
    }

    // Call after change hook
    if (this.hooks.onAfterChange) {
      await this.hooks.onAfterChange({
        user,
        discId: metadata.id,
        action: 'addDisc',
        data: metadata
      });
    }
  }

  /**
   * Remove a disc from the layer
   */
  async removeDisc(discId: string, user: User): Promise<void> {
    const disc = this.discs.get(discId);
    if (!disc) {
      throw new Error(`Disc not found: ${discId}`);
    }

    // Check permissions
    if (!this.rbacManager.canPerformAction(user, Role.ADMIN, [Permission.DELETE])) {
      throw new Error('Insufficient permissions to remove disc');
    }

    const metadata = disc.getMetadata();

    // Call before change hook
    if (this.hooks.onBeforeChange) {
      const allowed = await this.hooks.onBeforeChange({
        user,
        discId,
        action: 'removeDisc',
        data: { discId }
      });

      if (!allowed) {
        throw new Error('Change blocked by integration hook');
      }
    }

    const previousState = disc.getState();

    // Cleanup disc
    await disc.cleanup();

    // Remove disc
    this.discs.delete(discId);

    // Log action
    if (this.config.enableAuditLog) {
      this.auditLogger.log({
        userId: user.id,
        userName: user.name,
        action: 'removeDisc',
        discId,
        discName: metadata.name,
        changeDescription: `Removed disc: ${metadata.name}`,
        previousState
      });

      if (this.hooks.onAuditLog) {
        const logs = this.auditLogger.getAllLogs();
        await this.hooks.onAuditLog(logs[logs.length - 1]);
      }
    }

    // Call after change hook
    if (this.hooks.onAfterChange) {
      await this.hooks.onAfterChange({
        user,
        discId,
        action: 'removeDisc',
        data: { discId }
      });
    }
  }

  /**
   * Get a disc by ID
   */
  getDisc(discId: string): Disc | undefined {
    return this.discs.get(discId);
  }

  /**
   * Get all discs
   */
  getAllDiscs(): Disc[] {
    return Array.from(this.discs.values());
  }

  /**
   * Enable a disc
   */
  async enableDisc(discId: string, user: User): Promise<void> {
    const disc = this.discs.get(discId);
    if (!disc) {
      throw new Error(`Disc not found: ${discId}`);
    }

    const metadata = disc.getMetadata();

    // Check permissions
    if (!this.rbacManager.canPerformAction(user, metadata.requiredRole, metadata.requiredPermissions)) {
      throw new Error('Insufficient permissions to enable disc');
    }

    // Call before change hook
    if (this.hooks.onBeforeChange) {
      const allowed = await this.hooks.onBeforeChange({
        user,
        discId,
        action: 'enableDisc',
        data: { enabled: true }
      });

      if (!allowed) {
        throw new Error('Change blocked by integration hook');
      }
    }

    disc.enable(user.id);
    this.stateManager.setState(discId, disc.getState());

    // Log action
    if (this.config.enableAuditLog) {
      this.auditLogger.log({
        userId: user.id,
        userName: user.name,
        action: 'enableDisc',
        discId,
        discName: metadata.name,
        changeDescription: `Enabled disc: ${metadata.name}`
      });

      if (this.hooks.onAuditLog) {
        const logs = this.auditLogger.getAllLogs();
        await this.hooks.onAuditLog(logs[logs.length - 1]);
      }
    }

    // Call after change hook
    if (this.hooks.onAfterChange) {
      await this.hooks.onAfterChange({
        user,
        discId,
        action: 'enableDisc',
        data: { enabled: true }
      });
    }
  }

  /**
   * Disable a disc
   */
  async disableDisc(discId: string, user: User): Promise<void> {
    const disc = this.discs.get(discId);
    if (!disc) {
      throw new Error(`Disc not found: ${discId}`);
    }

    const metadata = disc.getMetadata();

    // Check permissions
    if (!this.rbacManager.canPerformAction(user, metadata.requiredRole, metadata.requiredPermissions)) {
      throw new Error('Insufficient permissions to disable disc');
    }

    // Call before change hook
    if (this.hooks.onBeforeChange) {
      const allowed = await this.hooks.onBeforeChange({
        user,
        discId,
        action: 'disableDisc',
        data: { enabled: false }
      });

      if (!allowed) {
        throw new Error('Change blocked by integration hook');
      }
    }

    disc.disable(user.id);
    this.stateManager.setState(discId, disc.getState());

    // Log action
    if (this.config.enableAuditLog) {
      this.auditLogger.log({
        userId: user.id,
        userName: user.name,
        action: 'disableDisc',
        discId,
        discName: metadata.name,
        changeDescription: `Disabled disc: ${metadata.name}`
      });

      if (this.hooks.onAuditLog) {
        const logs = this.auditLogger.getAllLogs();
        await this.hooks.onAuditLog(logs[logs.length - 1]);
      }
    }

    // Call after change hook
    if (this.hooks.onAfterChange) {
      await this.hooks.onAfterChange({
        user,
        discId,
        action: 'disableDisc',
        data: { enabled: false }
      });
    }
  }

  /**
   * Execute a disc
   */
  async executeDisc(discId: string, context: any, user: User): Promise<any> {
    const disc = this.discs.get(discId);
    if (!disc) {
      throw new Error(`Disc not found: ${discId}`);
    }

    if (!disc.isEnabled()) {
      throw new Error(`Disc is not enabled: ${discId}`);
    }

    const metadata = disc.getMetadata();

    // Check permissions
    if (!this.rbacManager.canPerformAction(user, metadata.requiredRole, [Permission.EXECUTE])) {
      throw new Error('Insufficient permissions to execute disc');
    }

    // Apply user isolation if enabled
    let executionContext = context;
    if (this.config.enableUserIsolation) {
      executionContext = {
        ...context,
        userId: user.id,
        userContext: this.userContexts.get(user.id) || {}
      };
    }

    // Execute disc
    const result = await disc.execute(executionContext);

    // Update user context if isolation is enabled
    if (this.config.enableUserIsolation && executionContext.userContext) {
      this.userContexts.set(user.id, executionContext.userContext);
    }

    // Log action
    if (this.config.enableAuditLog) {
      this.auditLogger.log({
        userId: user.id,
        userName: user.name,
        action: 'executeDisc',
        discId,
        discName: metadata.name,
        changeDescription: `Executed disc: ${metadata.name}`,
        metadata: { contextKeys: Object.keys(context) }
      });

      if (this.hooks.onAuditLog) {
        const logs = this.auditLogger.getAllLogs();
        await this.hooks.onAuditLog(logs[logs.length - 1]);
      }
    }

    return result;
  }

  /**
   * Update disc configuration
   */
  async updateDiscConfig(discId: string, config: Record<string, any>, user: User): Promise<void> {
    const disc = this.discs.get(discId);
    if (!disc) {
      throw new Error(`Disc not found: ${discId}`);
    }

    const metadata = disc.getMetadata();

    // Check permissions
    if (!this.rbacManager.canPerformAction(user, metadata.requiredRole, [Permission.WRITE])) {
      throw new Error('Insufficient permissions to update disc configuration');
    }

    // Call before change hook
    if (this.hooks.onBeforeChange) {
      const allowed = await this.hooks.onBeforeChange({
        user,
        discId,
        action: 'updateDiscConfig',
        data: config
      });

      if (!allowed) {
        throw new Error('Change blocked by integration hook');
      }
    }

    const previousConfig = disc.getConfig();
    disc.updateConfig(config, user.id);
    this.stateManager.setState(discId, disc.getState());

    // Log action
    if (this.config.enableAuditLog) {
      this.auditLogger.log({
        userId: user.id,
        userName: user.name,
        action: 'updateDiscConfig',
        discId,
        discName: metadata.name,
        changeDescription: `Updated configuration for disc: ${metadata.name}`,
        previousState: previousConfig,
        newState: disc.getConfig()
      });

      if (this.hooks.onAuditLog) {
        const logs = this.auditLogger.getAllLogs();
        await this.hooks.onAuditLog(logs[logs.length - 1]);
      }
    }

    // Call after change hook
    if (this.hooks.onAfterChange) {
      await this.hooks.onAfterChange({
        user,
        discId,
        action: 'updateDiscConfig',
        data: config
      });
    }
  }

  /**
   * Create a state snapshot
   */
  async createSnapshot(user: User, description?: string): Promise<string> {
    // Check permissions
    if (!this.rbacManager.hasPermission(user, Permission.WRITE)) {
      throw new Error('Insufficient permissions to create snapshot');
    }

    const snapshotId = this.stateManager.createSnapshot(user.id, description);

    // Log action
    if (this.config.enableAuditLog) {
      this.auditLogger.log({
        userId: user.id,
        userName: user.name,
        action: 'createSnapshot',
        discId: 'system',
        discName: 'System',
        changeDescription: `Created snapshot: ${snapshotId}`,
        metadata: { snapshotId, description }
      });

      if (this.hooks.onAuditLog) {
        const logs = this.auditLogger.getAllLogs();
        await this.hooks.onAuditLog(logs[logs.length - 1]);
      }
    }

    return snapshotId;
  }

  /**
   * Rollback to a snapshot
   */
  async rollbackToSnapshot(snapshotId: string, user: User): Promise<void> {
    // Check permissions
    if (!this.rbacManager.canPerformAction(user, Role.ADMIN, [Permission.WRITE])) {
      throw new Error('Insufficient permissions to rollback');
    }

    // Call before rollback hook
    if (this.hooks.onBeforeRollback) {
      const allowed = await this.hooks.onBeforeRollback(snapshotId);
      if (!allowed) {
        throw new Error('Rollback blocked by integration hook');
      }
    }

    const success = this.stateManager.rollbackToSnapshot(snapshotId);
    if (!success) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    // Restore disc states
    const states = this.stateManager.getAllStates();
    for (const [discId, state] of states.entries()) {
      const disc = this.discs.get(discId);
      if (disc) {
        disc.setState(state, user.id);
      }
    }

    // Log action
    if (this.config.enableAuditLog) {
      this.auditLogger.log({
        userId: user.id,
        userName: user.name,
        action: 'rollbackToSnapshot',
        discId: 'system',
        discName: 'System',
        changeDescription: `Rolled back to snapshot: ${snapshotId}`,
        metadata: { snapshotId }
      });

      if (this.hooks.onAuditLog) {
        const logs = this.auditLogger.getAllLogs();
        await this.hooks.onAuditLog(logs[logs.length - 1]);
      }
    }

    // Call after rollback hook
    if (this.hooks.onAfterRollback) {
      await this.hooks.onAfterRollback(snapshotId);
    }
  }

  /**
   * Get audit logs
   */
  getAuditLogs(user: User) {
    // Check permissions
    if (!this.rbacManager.hasPermission(user, Permission.READ)) {
      throw new Error('Insufficient permissions to view audit logs');
    }

    // If user is not admin, only show their own logs
    if (!this.rbacManager.hasRole(user, Role.ADMIN)) {
      return this.auditLogger.getLogsByUser(user.id);
    }

    return this.auditLogger.getAllLogs();
  }

  /**
   * Get RBAC manager for external use
   */
  getRBACManager(): RBACManager {
    return this.rbacManager;
  }

  /**
   * Get state manager for external use
   */
  getStateManager(): StateManager {
    return this.stateManager;
  }

  /**
   * Get compliance validator for external use
   */
  getComplianceValidator(): ComplianceValidator {
    return this.complianceValidator;
  }

  /**
   * Export entire layer state
   * Note: This exports all snapshots and audit logs which can be large.
   * For production use with large datasets, consider implementing:
   * - Pagination or filtering options
   * - Streaming export for large datasets
   * - Selective export (e.g., only recent data)
   */
  exportState(): string {
    const discStates: Record<string, any> = {};
    for (const [id, disc] of this.discs.entries()) {
      discStates[id] = {
        metadata: disc.getMetadata(),
        state: disc.getState()
      };
    }

    return JSON.stringify({
      discs: discStates,
      snapshots: this.stateManager.getAllSnapshots(),
      auditLogs: this.auditLogger.getAllLogs()
    }, null, 2);
  }
}
