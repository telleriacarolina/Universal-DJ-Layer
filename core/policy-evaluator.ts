/**
 * PolicyEvaluator - Evaluates policies and permissions for control operations
 * 
 * Responsibilities:
 * - Check role permissions against requested operations
 * - Enforce creator locks (immutable protections)
 * - Validate policy compliance (safety, anti-abuse, compliance)
 * - Detect policy violations before changes are applied
 * - Cache evaluation results for performance
 * - Log policy violations to AuditLog
 */

import type { Role } from '../roles/creator';
import type { Disc } from '../discs/feature-disc';
import type { Policy, PolicyResult } from '../policies/creator-locks';
import type { AuditLog } from '../audit/audit-log';

export interface PolicyEvaluationResult {
  /** Whether the operation is allowed */
  allowed: boolean;
  /** Reasons why operation was denied (if any) */
  denialReasons?: string[];
  /** Warnings that don't block but should be noted */
  warnings?: string[];
  /** Policies that were evaluated */
  evaluatedPolicies: string[];
}

export interface PolicyContext {
  /** The role attempting the operation */
  role: Role;
  /** The disc being applied/modified */
  disc: Disc;
  /** The operation being attempted */
  operation: 'preview' | 'apply' | 'revert' | 'list';
  /** User ID performing the operation */
  userId?: string;
  /** Current system state */
  currentState?: any;
  /** Additional context metadata */
  metadata?: Record<string, any>;
}

export interface PolicyViolation {
  /** Policy that was violated */
  policyId: string;
  /** Policy type */
  policyType: string;
  /** Reason for violation */
  reason: string;
  /** Severity of violation */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Timestamp of violation */
  timestamp: number;
}

export interface PolicyEvaluatorConfig {
  /** Enable policy caching */
  enableCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Audit log instance for logging violations */
  auditLog?: AuditLog;
}

export class PolicyEvaluator {
  private policies: Map<string, Policy> = new Map();
  private disabledPolicies: Set<string> = new Set();
  private creatorLocks: Set<string> = new Set();
  private cache: Map<string, { result: PolicyEvaluationResult; expiry: number }> = new Map();
  private config: PolicyEvaluatorConfig;
  private auditLog?: AuditLog;

  constructor(config: PolicyEvaluatorConfig = {}) {
    this.config = {
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL ?? 5000, // 5 seconds default
    };
    this.auditLog = config.auditLog;
  }

  /**
   * Register a new policy for evaluation
   */
  registerPolicy(policy: Policy): void {
    if (!policy.metadata || !policy.metadata.policyId) {
      throw new Error('Policy must have valid metadata with policyId, policyType, createdAt, createdBy, and priority fields');
    }

    if (!policy.validate()) {
      throw new Error(`Policy ${policy.metadata.policyId} failed validation. Check policy configuration.`);
    }

    this.policies.set(policy.metadata.policyId, policy);
    
    // Sort policies by priority when registering
    this.sortPolicies();
  }

  /**
   * Evaluate a specific policy by ID
   */
  async evaluatePolicy(policyId: string, context: PolicyContext): Promise<PolicyResult> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    if (this.disabledPolicies.has(policyId)) {
      return { allowed: true };
    }

    const policyContext = this.convertToPolicyContext(context);
    return await policy.evaluate(policyContext);
  }

  /**
   * Evaluate all registered policies
   */
  async evaluateAll(context: PolicyContext): Promise<PolicyResult[]> {
    const results: PolicyResult[] = [];

    // Get sorted policies by priority
    const sortedPolicies = this.getSortedPolicies();

    for (const policy of sortedPolicies) {
      if (this.disabledPolicies.has(policy.metadata.policyId)) {
        continue;
      }

      const policyContext = this.convertToPolicyContext(context);
      const result = await policy.evaluate(policyContext);
      results.push(result);

      // Log violations to audit log
      if (!result.allowed && this.auditLog) {
        await this.auditLog.log({
          action: 'policy-change',
          actorId: context.userId ?? 'unknown',
          actorRole: context.role.metadata.roleType,
          result: 'failure',
          error: result.reason,
          metadata: {
            policyId: policy.metadata.policyId,
            policyType: policy.metadata.policyType,
            operation: context.operation,
            discId: context.disc.metadata.id,
          },
        });
      }
    }

    return results;
  }

  /**
   * Evaluate whether an operation is allowed under current policies
   */
  async evaluate(context: PolicyContext): Promise<PolicyEvaluationResult> {
    // Check cache first
    if (this.config.enableCache) {
      const cached = this.getCachedResult(context);
      if (cached) {
        return cached;
      }
    }

    const denialReasons: string[] = [];
    const warnings: string[] = [];
    const evaluatedPolicies: string[] = [];

    // Evaluate all policies
    const results = await this.evaluateAll(context);

    for (const result of results) {
      if (!result.allowed) {
        if (result.reason) {
          denialReasons.push(result.reason);
        }
      }
      if (result.conditions) {
        warnings.push(...result.conditions);
      }
    }

    // Get evaluated policy IDs
    for (const policy of this.policies.values()) {
      if (!this.disabledPolicies.has(policy.metadata.policyId)) {
        evaluatedPolicies.push(policy.metadata.policyId);
      }
    }

    const finalResult: PolicyEvaluationResult = {
      allowed: denialReasons.length === 0,
      denialReasons: denialReasons.length > 0 ? denialReasons : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      evaluatedPolicies,
    };

    // Cache result
    if (this.config.enableCache) {
      this.cacheResult(context, finalResult);
    }

    return finalResult;
  }

  /**
   * Get policy violations for a context
   */
  async getPolicyViolations(context: PolicyContext): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];
    const results = await this.evaluateAll(context);

    let index = 0;
    for (const policy of this.getSortedPolicies()) {
      const result = results[index++];
      if (!result.allowed) {
        violations.push({
          policyId: policy.metadata.policyId,
          policyType: policy.metadata.policyType,
          reason: result.reason ?? 'Policy violation',
          severity: this.getSeverityForPolicy(policy.metadata.policyType),
          timestamp: Date.now(),
        });
      }
    }

    return violations;
  }

  /**
   * Enable a policy
   */
  enablePolicy(policyId: string): void {
    if (!this.policies.has(policyId)) {
      throw new Error(`Policy ${policyId} not found`);
    }
    this.disabledPolicies.delete(policyId);
    this.clearCache();
  }

  /**
   * Disable a policy
   */
  disablePolicy(policyId: string): void {
    if (!this.policies.has(policyId)) {
      throw new Error(`Policy ${policyId} not found`);
    }
    this.disabledPolicies.add(policyId);
    this.clearCache();
  }

  /**
   * Check if a specific resource is protected by a creator lock
   */
  isCreatorLocked(resourceId: string): boolean {
    return this.creatorLocks.has(resourceId);
  }

  /**
   * Add a creator lock to protect a resource
   */
  addCreatorLock(resourceId: string, creatorId: string): void {
    this.creatorLocks.add(resourceId);
    
    if (this.auditLog) {
      // Use void to explicitly ignore the promise
      void this.auditLog.log({
        action: 'policy-change',
        actorId: creatorId,
        actorRole: 'creator',
        result: 'success',
        metadata: {
          action: 'add-creator-lock',
          resourceId,
        },
      });
    }
  }

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: Role, permission: string): boolean {
    return role.hasPermission(permission);
  }

  /**
   * Validate that a disc doesn't violate any safety policies
   */
  validateDiscSafety(disc: Disc): string[] {
    const violations: string[] = [];
    
    // Basic validation checks
    if (!disc.metadata || !disc.metadata.id) {
      violations.push('Disc missing required metadata');
    }

    if (!disc.validate) {
      violations.push('Disc missing validate method');
    }

    return violations;
  }

  /**
   * Clear the evaluation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get all registered policies
   */
  getPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get a specific policy by ID
   */
  getPolicy(policyId: string): Policy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Sort policies by priority (higher priority first)
   */
  private sortPolicies(): void {
    // Policies are stored in a Map, so we don't need to sort the map itself
    // Sorting happens in getSortedPolicies()
  }

  /**
   * Get policies sorted by priority
   */
  private getSortedPolicies(): Policy[] {
    return Array.from(this.policies.values()).sort(
      (a, b) => b.metadata.priority - a.metadata.priority
    );
  }

  /**
   * Convert PolicyContext to PolicyEvaluationContext
   */
  private convertToPolicyContext(context: PolicyContext): any {
    return {
      operation: context.operation,
      actorId: context.userId ?? context.role.metadata.userId,
      roleType: context.role.metadata.roleType,
      resourceId: context.disc.metadata.id,
      metadata: context.metadata,
    };
  }

  /**
   * Get cached evaluation result
   */
  private getCachedResult(context: PolicyContext): PolicyEvaluationResult | null {
    const key = this.getCacheKey(context);
    const cached = this.cache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Cache an evaluation result
   */
  private cacheResult(context: PolicyContext, result: PolicyEvaluationResult): void {
    const key = this.getCacheKey(context);
    const expiry = Date.now() + (this.config.cacheTTL ?? 5000);
    this.cache.set(key, { result, expiry });
  }

  /**
   * Generate cache key for context
   */
  private getCacheKey(context: PolicyContext): string {
    return `${context.operation}-${context.disc.metadata.id}-${context.role.metadata.roleType}`;
  }

  /**
   * Get severity for a policy type
   */
  private getSeverityForPolicy(policyType: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (policyType) {
      case 'creator-lock':
        return 'critical';
      case 'safety':
        return 'high';
      case 'anti-abuse':
        return 'high';
      case 'compliance':
        return 'medium';
      default:
        return 'low';
    }
  }
}
