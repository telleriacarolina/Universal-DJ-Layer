/**
 * Creator Locks - Immutable protections set by the creator
 * 
 * Creator locks are the highest-priority policies that cannot be
 * bypassed by any role, including admins and other elevated roles.
 * 
 * TODO: Implement creator lock enforcement with persistence
 */

export interface PolicyMetadata {
  /** Unique policy identifier */
  policyId: string;
  /** Policy type */
  policyType: string;
  /** When the policy was created */
  createdAt: number;
  /** Who created the policy */
  createdBy: string;
  /** Priority level (higher = evaluated first) */
  priority: number;
}

export interface PolicyEvaluationContext {
  /** The operation being attempted */
  operation: string;
  /** The actor attempting the operation */
  actorId: string;
  /** The role of the actor */
  roleType: string;
  /** The resource being accessed */
  resourceId?: string;
  /** Additional context data */
  metadata?: Record<string, any>;
}

export interface PolicyResult {
  /** Whether the operation is allowed */
  allowed: boolean;
  /** Reason for denial (if not allowed) */
  reason?: string;
  /** Conditions that must be met */
  conditions?: string[];
}

export interface Policy {
  /** Policy metadata */
  metadata: PolicyMetadata;
  /** Evaluate the policy against a context */
  evaluate(context: PolicyEvaluationContext): Promise<PolicyResult>;
  /** Validate the policy configuration */
  validate(): boolean;
}

export interface CreatorLockConfig {
  /** ID of the creator setting the lock */
  creatorId: string;
  /** Resources that are locked */
  lockedResources: string[];
  /** Operations that are locked */
  lockedOperations?: string[];
  /** Reason for the lock */
  reason?: string;
}

export class CreatorLockPolicy implements Policy {
  metadata: PolicyMetadata;
  private config: CreatorLockConfig;
  private locks: Map<string, Set<string>> = new Map();

  constructor(config: CreatorLockConfig) {
    this.config = config;
    this.metadata = {
      policyId: this.generatePolicyId(),
      policyType: 'creator-lock',
      createdAt: Date.now(),
      createdBy: config.creatorId,
      priority: 1000, // Highest priority
    };

    // Initialize locks
    for (const resource of config.lockedResources) {
      this.locks.set(resource, new Set(config.lockedOperations ?? ['*']));
    }
  }

  /**
   * Evaluate if an operation is allowed under creator locks
   */
  async evaluate(context: PolicyEvaluationContext): Promise<PolicyResult> {
    // TODO: Check if resource is locked
    // TODO: Check if operation is locked for this resource
    // TODO: Allow only if actor is the creator
    // TODO: Return policy result
    
    const { resourceId, operation, actorId } = context;

    if (!resourceId) {
      return { allowed: true };
    }

    // Check if resource is locked
    const lockedOps = this.locks.get(resourceId);
    if (!lockedOps) {
      return { allowed: true };
    }

    // Check if operation is locked
    if (!lockedOps.has('*') && !lockedOps.has(operation)) {
      return { allowed: true };
    }

    // Only creator can bypass their own locks
    if (actorId === this.config.creatorId) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Resource ${resourceId} is protected by a creator lock`,
    };
  }

  /**
   * Validate the policy configuration
   */
  validate(): boolean {
    // TODO: Validate creator ID exists
    // TODO: Validate locked resources are valid
    // TODO: Validate locked operations are valid
    return this.config.lockedResources.length > 0;
  }

  /**
   * Add a resource lock
   */
  addLock(resourceId: string, operations: string[] = ['*']): void {
    // TODO: Add resource to locks
    // TODO: Persist lock
    // TODO: Emit lock-added event
    this.locks.set(resourceId, new Set(operations));
  }

  /**
   * Remove a resource lock (only creator can do this)
   */
  removeLock(resourceId: string, actorId: string): boolean {
    if (actorId !== this.config.creatorId) {
      return false;
    }
    // TODO: Remove lock
    // TODO: Persist change
    // TODO: Emit lock-removed event
    return this.locks.delete(resourceId);
  }

  /**
   * Check if a resource is locked
   */
  isLocked(resourceId: string): boolean {
    return this.locks.has(resourceId);
  }

  /**
   * Get all locked resources
   */
  getLockedResources(): string[] {
    return Array.from(this.locks.keys());
  }

  private generatePolicyId(): string {
    return `creator-lock-${this.config.creatorId}-${Date.now()}`;
  }
}
