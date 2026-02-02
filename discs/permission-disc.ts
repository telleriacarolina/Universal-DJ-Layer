/**
 * PermissionDisc - Controls runtime access permissions
 * 
 * Enables dynamic modification of user permissions and access controls
 * without requiring application restart or redeployment.
 * Supports user-specific permissions, role-based permissions, TTL expiration,
 * and scope-based access control with audit trail tracking.
 */

import type { Disc, DiscMetadata } from './feature-disc';

export interface PermissionGrant {
  /** The permission string */
  permission: string;
  /** Expiration timestamp in milliseconds (optional) */
  expiresAt?: number;
  /** Timestamp when permission was granted */
  grantedAt: number;
  /** Actor who granted this permission */
  grantedBy?: string;
}

export interface PermissionConfig {
  /** Name identifier for this permission disc */
  name: string;
  /** Map of user IDs to their permission grants */
  userPermissions?: Record<string, PermissionGrant[]>;
  /** Map of role IDs to their permission strings */
  rolePermissions?: Record<string, string[]>;
  /** Actor performing the permission changes */
  actor?: string;
}

export interface AuditEntry {
  /** Timestamp of the action */
  timestamp: number;
  /** Type of action performed */
  action: 'grant' | 'revoke' | 'grant_role' | 'cleanup';
  /** Actor who performed the action */
  actor?: string;
  /** User ID affected */
  userId?: string;
  /** Role ID affected */
  roleId?: string;
  /** Permission affected */
  permission?: string;
  /** Permissions affected (for role operations) */
  permissions?: string[];
  /** State before the action */
  before?: any;
  /** State after the action */
  after?: any;
}

export class PermissionDisc implements Disc {
  metadata: DiscMetadata;
  private config: PermissionConfig;
  private previousState: Record<string, any> | null = null;
  private auditTrail: AuditEntry[] = [];

  constructor(config: PermissionConfig) {
    this.config = {
      name: config.name,
      userPermissions: config.userPermissions || {},
      rolePermissions: config.rolePermissions || {},
      actor: config.actor,
    };
    this.metadata = {
      id: this.generateId(),
      name: config.name,
      type: 'permission',
      version: '1.0.0',
      createdAt: Date.now(),
    };
  }

  /**
   * Grant a permission to a user
   * @param userId - User ID to grant permission to
   * @param permission - Permission string to grant
   * @param ttl - Optional time-to-live in milliseconds
   * @example
   * permissionDisc.grantPermission('user123', 'read:document:456', 3600000);
   */
  grantPermission(userId: string, permission: string, ttl?: number): void {
    if (!this.config.userPermissions) {
      this.config.userPermissions = {};
    }

    if (!this.config.userPermissions[userId]) {
      this.config.userPermissions[userId] = [];
    }

    const existingIndex = this.config.userPermissions[userId].findIndex(
      (grant) => grant.permission === permission
    );

    const before = existingIndex >= 0 ? { ...this.config.userPermissions[userId][existingIndex] } : null;

    const grant: PermissionGrant = {
      permission,
      grantedAt: Date.now(),
      grantedBy: this.config.actor,
      expiresAt: ttl ? Date.now() + ttl : undefined,
    };

    if (existingIndex >= 0) {
      this.config.userPermissions[userId][existingIndex] = grant;
    } else {
      this.config.userPermissions[userId].push(grant);
    }

    this.auditTrail.push({
      timestamp: Date.now(),
      action: 'grant',
      actor: this.config.actor,
      userId,
      permission,
      before,
      after: { ...grant },
    });

    this.metadata.updatedAt = Date.now();
  }

  /**
   * Revoke a permission from a user
   * @param userId - User ID to revoke permission from
   * @param permission - Permission string to revoke
   * @example
   * permissionDisc.revokePermission('user123', 'read:document:456');
   */
  revokePermission(userId: string, permission: string): void {
    if (!this.config.userPermissions || !this.config.userPermissions[userId]) {
      return;
    }

    const grants = this.config.userPermissions[userId];
    const existingIndex = grants.findIndex((grant) => grant.permission === permission);

    if (existingIndex >= 0) {
      const before = { ...grants[existingIndex] };
      grants.splice(existingIndex, 1);

      this.auditTrail.push({
        timestamp: Date.now(),
        action: 'revoke',
        actor: this.config.actor,
        userId,
        permission,
        before,
        after: null,
      });

      this.metadata.updatedAt = Date.now();
    }
  }

  /**
   * Check if a user has a specific permission
   * @param userId - User ID to check
   * @param permission - Permission string to check
   * @returns True if user has the permission
   * @example
   * const hasAccess = permissionDisc.hasPermission('user123', 'read:document:456');
   */
  hasPermission(userId: string, permission: string): boolean {
    this.cleanupExpiredPermissions(userId);

    if (!this.config.userPermissions || !this.config.userPermissions[userId]) {
      return false;
    }

    const grants = this.config.userPermissions[userId];
    const now = Date.now();

    for (const grant of grants) {
      if (grant.expiresAt && grant.expiresAt <= now) {
        continue;
      }

      if (this.matchesPermission(grant.permission, permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * List all active permissions for a user
   * @param userId - User ID to list permissions for
   * @returns Array of permission strings
   * @example
   * const permissions = permissionDisc.listUserPermissions('user123');
   */
  listUserPermissions(userId: string): string[] {
    this.cleanupExpiredPermissions(userId);

    if (!this.config.userPermissions || !this.config.userPermissions[userId]) {
      return [];
    }

    const now = Date.now();
    return this.config.userPermissions[userId]
      .filter((grant) => !grant.expiresAt || grant.expiresAt > now)
      .map((grant) => grant.permission);
  }

  /**
   * Grant multiple permissions to a role
   * @param roleId - Role ID to grant permissions to
   * @param permissions - Array of permission strings
   * @example
   * permissionDisc.grantRolePermissions('admin', ['read', 'write', 'delete']);
   */
  grantRolePermissions(roleId: string, permissions: string[]): void {
    if (!this.config.rolePermissions) {
      this.config.rolePermissions = {};
    }

    const before = this.config.rolePermissions[roleId] ? [...this.config.rolePermissions[roleId]] : null;

    if (!this.config.rolePermissions[roleId]) {
      this.config.rolePermissions[roleId] = [];
    }

    for (const permission of permissions) {
      if (!this.config.rolePermissions[roleId].includes(permission)) {
        this.config.rolePermissions[roleId].push(permission);
      }
    }

    this.auditTrail.push({
      timestamp: Date.now(),
      action: 'grant_role',
      actor: this.config.actor,
      roleId,
      permissions,
      before,
      after: [...this.config.rolePermissions[roleId]],
    });

    this.metadata.updatedAt = Date.now();
  }

  /**
   * Get all permissions for a user including role inheritance
   * @param userId - User ID to get permissions for
   * @param roleId - Optional role ID to merge permissions from
   * @returns Array of all permission strings
   * @example
   * const allPerms = permissionDisc.getUserPermissionsWithInheritance('user123', 'editor');
   */
  getUserPermissionsWithInheritance(userId: string, roleId?: string): string[] {
    const userPerms = this.listUserPermissions(userId);
    const rolePerms = roleId && this.config.rolePermissions
      ? this.config.rolePermissions[roleId] || []
      : [];

    const allPerms = new Set([...userPerms, ...rolePerms]);
    return Array.from(allPerms);
  }

  /**
   * Apply permission changes to the system
   * @param context - Context object to apply permissions to
   * @returns Updated context with applied permissions
   * @throws Error if context is invalid
   * @example
   * const result = await permissionDisc.apply({ permissions: {} });
   */
  async apply(context: any): Promise<any> {
    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context: must be an object');
    }

    this.previousState = context.permissions ? JSON.parse(JSON.stringify(context.permissions)) : {};

    if (!context.permissions) {
      context.permissions = {};
    }

    if (!context.permissions.userPermissions) {
      context.permissions.userPermissions = {};
    }

    if (!context.permissions.rolePermissions) {
      context.permissions.rolePermissions = {};
    }

    const configUserPerms = this.config.userPermissions || {};
    for (const [userId, grants] of Object.entries(configUserPerms)) {
      context.permissions.userPermissions[userId] = JSON.parse(JSON.stringify(grants));
    }

    const configRolePerms = this.config.rolePermissions || {};
    for (const [roleId, permissions] of Object.entries(configRolePerms)) {
      context.permissions.rolePermissions[roleId] = JSON.parse(JSON.stringify(permissions));
    }

    context.permissions.auditTrail = [...this.auditTrail];

    return context;
  }

  /**
   * Revert permissions to previous state
   * @param context - Context object to revert
   * @returns Context with reverted permissions
   * @throws Error if no previous state exists or context is invalid
   * @example
   * const result = await permissionDisc.revert(context);
   */
  async revert(context: any): Promise<any> {
    if (!this.previousState) {
      throw new Error('No previous state to revert to');
    }

    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context: must be an object');
    }

    context.permissions = JSON.parse(JSON.stringify(this.previousState));
    this.previousState = null;

    return context;
  }

  /**
   * Preview permission changes without applying
   * @param context - Context object to preview against
   * @returns Preview object showing changes
   * @example
   * const preview = await permissionDisc.preview(context);
   */
  async preview(context: any): Promise<any> {
    const changes: Record<string, any> = {
      userPermissions: {},
      rolePermissions: {},
    };

    const currentPerms = context?.permissions || {};
    const currentUserPerms = currentPerms.userPermissions || {};
    const currentRolePerms = currentPerms.rolePermissions || {};

    for (const [userId, grants] of Object.entries(this.config.userPermissions || {})) {
      const currentGrants = currentUserPerms[userId] || [];
      if (JSON.stringify(currentGrants) !== JSON.stringify(grants)) {
        changes.userPermissions[userId] = {
          current: currentGrants,
          proposed: grants,
          action: currentGrants.length === 0 ? 'add' : 'modify',
        };
      }
    }

    for (const [roleId, perms] of Object.entries(this.config.rolePermissions || {})) {
      const currentRolePermsForRole = currentRolePerms[roleId] || [];
      if (JSON.stringify(currentRolePermsForRole) !== JSON.stringify(perms)) {
        changes.rolePermissions[roleId] = {
          current: currentRolePermsForRole,
          proposed: perms,
          action: currentRolePermsForRole.length === 0 ? 'add' : 'modify',
        };
      }
    }

    const userChangesCount = Object.keys(changes.userPermissions).length;
    const roleChangesCount = Object.keys(changes.rolePermissions).length;

    return {
      discName: this.metadata.name,
      changesCount: userChangesCount + roleChangesCount,
      changes,
      affectedUsers: Object.keys(changes.userPermissions),
      affectedRoles: Object.keys(changes.rolePermissions),
    };
  }

  /**
   * Validate permission disc configuration
   * @returns True if valid
   * @throws Error with validation details
   * @example
   * const isValid = await permissionDisc.validate();
   */
  async validate(): Promise<boolean> {
    const errors: string[] = [];

    if (this.config.userPermissions) {
      for (const [userId, grants] of Object.entries(this.config.userPermissions)) {
        if (!userId) {
          errors.push('User ID cannot be empty');
        }

        for (const grant of grants) {
          if (!grant.permission) {
            errors.push(`User '${userId}': permission cannot be empty`);
          }

          if (grant.expiresAt !== undefined) {
            if (grant.expiresAt <= grant.grantedAt) {
              errors.push(`User '${userId}': expiration must be after grant time`);
            }
          }
        }
      }
    }

    if (this.config.rolePermissions) {
      for (const [roleId, permissions] of Object.entries(this.config.rolePermissions)) {
        if (!roleId) {
          errors.push('Role ID cannot be empty');
        }

        for (const permission of permissions) {
          if (!permission) {
            errors.push(`Role '${roleId}': permission cannot be empty`);
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed:\n${errors.join('\n')}`);
    }

    return true;
  }

  /**
   * Get the audit trail of all permission changes
   * @returns Array of audit entries
   * @example
   * const audit = permissionDisc.getAuditTrail();
   */
  getAuditTrail(): AuditEntry[] {
    return [...this.auditTrail];
  }

  /**
   * Clean up expired permissions for a user
   * @private
   */
  private cleanupExpiredPermissions(userId: string): void {
    if (!this.config.userPermissions || !this.config.userPermissions[userId]) {
      return;
    }

    const now = Date.now();
    const before = this.config.userPermissions[userId].length;
    
    this.config.userPermissions[userId] = this.config.userPermissions[userId].filter(
      (grant) => !grant.expiresAt || grant.expiresAt > now
    );

    const after = this.config.userPermissions[userId].length;

    if (before !== after) {
      this.auditTrail.push({
        timestamp: Date.now(),
        action: 'cleanup',
        userId,
        before,
        after,
      });
    }
  }

  /**
   * Match a granted permission against a requested permission
   * Supports exact matches and scope-based matching (e.g., "read" matches "read:document:123")
   * @private
   */
  private matchesPermission(granted: string, requested: string): boolean {
    if (granted === requested) {
      return true;
    }

    const grantedParts = granted.split(':');
    const requestedParts = requested.split(':');

    if (grantedParts.length > requestedParts.length) {
      return false;
    }

    for (let i = 0; i < grantedParts.length; i++) {
      if (grantedParts[i] !== requestedParts[i]) {
        return false;
      }
    }

    return true;
  }

  private generateId(): string {
    return `permission-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
