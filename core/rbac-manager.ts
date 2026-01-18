/**
 * RBACManager - Role-Based Access Control Manager
 * 
 * Manages role assignment, revocation, and permission checks
 * with role hierarchy validation and audit logging.
 */

import type { Role } from '../roles/creator';
import type { AuditLog } from '../audit/audit-log';
import { CreatorRole } from '../roles/creator';
import { AdminRole } from '../roles/admin';
import { ModeratorRole } from '../roles/moderator';
import { CollaboratorRole } from '../roles/collaborator';
import { AIAgentRole } from '../roles/ai-agent';
import { UserRole } from '../roles/user';

export interface Permission {
  id: string;
  name: string;
  description: string;
  requiredLevel?: number;
}

export interface RBACManagerConfig {
  /** Audit log instance for logging role changes */
  auditLog?: AuditLog;
  /** Enable role caching for performance */
  enableCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
}

export class RBACManager {
  private userRoles: Map<string, Role[]> = new Map();
  private roleCache: Map<string, { roles: Role[]; expiry: number }> = new Map();
  private config: RBACManagerConfig;
  private auditLog?: AuditLog;

  // Role hierarchy levels (higher = more permissions)
  private static readonly ROLE_HIERARCHY: Record<string, number> = {
    user: 20,
    'ai-agent': 30,
    collaborator: 40,
    moderator: 60,
    admin: 80,
    creator: 100,
  };

  constructor(config: RBACManagerConfig = {}) {
    this.config = {
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL ?? 60000, // 1 minute default
    };
    this.auditLog = config.auditLog;
  }

  /**
   * Assign a role to a user
   */
  async assignRole(userId: string, role: Role): Promise<void> {
    const roles = this.userRoles.get(userId) ?? [];
    
    // Check if user already has this role
    const existingRole = roles.find(r => r.metadata.roleType === role.metadata.roleType);
    if (existingRole) {
      throw new Error(`User ${userId} already has role ${role.metadata.roleType}`);
    }

    roles.push(role);
    this.userRoles.set(userId, roles);

    // Clear cache for this user
    this.roleCache.delete(userId);

    // Log to audit log
    if (this.auditLog) {
      await this.auditLog.log({
        action: 'role-change',
        actorId: 'system', // In real implementation, this would be the granting user
        actorRole: 'system',
        result: 'success',
        metadata: {
          action: 'assign',
          userId,
          roleType: role.metadata.roleType,
          roleId: role.metadata.roleId,
        },
      });
    }
  }

  /**
   * Revoke a role from a user
   */
  async revokeRole(userId: string, role: Role): Promise<void> {
    const roles = this.userRoles.get(userId);
    if (!roles) {
      throw new Error(`User ${userId} has no roles`);
    }

    const index = roles.findIndex(r => r.metadata.roleId === role.metadata.roleId);
    if (index === -1) {
      throw new Error(`User ${userId} does not have role ${role.metadata.roleType}`);
    }

    roles.splice(index, 1);
    this.userRoles.set(userId, roles);

    // Clear cache for this user
    this.roleCache.delete(userId);

    // Log to audit log
    if (this.auditLog) {
      await this.auditLog.log({
        action: 'role-change',
        actorId: 'system',
        actorRole: 'system',
        result: 'success',
        metadata: {
          action: 'revoke',
          userId,
          roleType: role.metadata.roleType,
          roleId: role.metadata.roleId,
        },
      });
    }
  }

  /**
   * Check if user has a specific role
   */
  hasRole(userId: string, role: Role): boolean {
    const roles = this.getUserRoles(userId);
    return roles.some(r => r.metadata.roleType === role.metadata.roleType);
  }

  /**
   * Check if user has a specific role type
   */
  hasRoleType(userId: string, roleType: string): boolean {
    const roles = this.getUserRoles(userId);
    return roles.some(r => r.metadata.roleType === roleType);
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(userId: string, permission: string): boolean {
    const roles = this.getUserRoles(userId);
    return roles.some(role => role.hasPermission(permission));
  }

  /**
   * Check if user has all required permissions
   */
  hasAllPermissions(userId: string, permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(userId, permission));
  }

  /**
   * Check if user has any of the required permissions
   */
  hasAnyPermission(userId: string, permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(userId, permission));
  }

  /**
   * Get all roles for a user
   */
  getUserRoles(userId: string): Role[] {
    // Check cache first
    if (this.config.enableCache) {
      const cached = this.roleCache.get(userId);
      if (cached && cached.expiry > Date.now()) {
        return cached.roles;
      }
    }

    const roles = this.userRoles.get(userId) ?? [];

    // Cache the result
    if (this.config.enableCache) {
      this.roleCache.set(userId, {
        roles,
        expiry: Date.now() + (this.config.cacheTTL ?? 60000),
      });
    }

    return roles;
  }

  /**
   * Get all permissions for a role type
   */
  getRolePermissions(role: Role): string[] {
    return role.getPermissions();
  }

  /**
   * Get all permissions for a user (aggregated from all roles)
   */
  getUserPermissions(userId: string): string[] {
    const roles = this.getUserRoles(userId);
    const permissions = new Set<string>();

    for (const role of roles) {
      for (const permission of role.getPermissions()) {
        permissions.add(permission);
      }
    }

    return Array.from(permissions);
  }

  /**
   * Get highest role level for a user
   */
  getUserHighestRoleLevel(userId: string): number {
    const roles = this.getUserRoles(userId);
    if (roles.length === 0) {
      return 0;
    }

    return Math.max(...roles.map(r => r.getHierarchyLevel()));
  }

  /**
   * Check if user can perform an action based on role hierarchy
   */
  canPerformAction(userId: string, requiredLevel: number): boolean {
    return this.getUserHighestRoleLevel(userId) >= requiredLevel;
  }

  /**
   * Validate role hierarchy (e.g., ensure user can grant/revoke roles)
   */
  canManageRole(managerId: string, targetRoleType: string): boolean {
    const managerLevel = this.getUserHighestRoleLevel(managerId);
    const targetLevel = RBACManager.ROLE_HIERARCHY[targetRoleType] ?? 0;

    // Can only manage roles lower than your own level
    return managerLevel > targetLevel;
  }

  /**
   * Get role hierarchy level for a role type
   */
  getRoleLevel(roleType: string): number {
    return RBACManager.ROLE_HIERARCHY[roleType] ?? 0;
  }

  /**
   * Clear role cache
   */
  clearCache(): void {
    this.roleCache.clear();
  }

  /**
   * Clear cache for a specific user
   */
  clearUserCache(userId: string): void {
    this.roleCache.delete(userId);
  }

  /**
   * Get all users with a specific role type
   */
  getUsersWithRole(roleType: string): string[] {
    const users: string[] = [];

    for (const [userId, roles] of this.userRoles.entries()) {
      if (roles.some(r => r.metadata.roleType === roleType)) {
        users.push(userId);
      }
    }

    return users;
  }

  /**
   * Get total number of users
   */
  getUserCount(): number {
    return this.userRoles.size;
  }

  /**
   * Remove all roles for a user
   */
  async removeAllRoles(userId: string): Promise<void> {
    const roles = this.userRoles.get(userId);
    if (!roles) {
      return;
    }

    this.userRoles.delete(userId);
    this.roleCache.delete(userId);

    // Log to audit log
    if (this.auditLog) {
      await this.auditLog.log({
        action: 'role-change',
        actorId: 'system',
        actorRole: 'system',
        result: 'success',
        metadata: {
          action: 'remove-all',
          userId,
          rolesRemoved: roles.length,
        },
      });
    }
  }

  /**
   * Check if a user has at least the required role level
   */
  hasMinimumRoleLevel(userId: string, minLevel: number): boolean {
    return this.getUserHighestRoleLevel(userId) >= minLevel;
  }

  /**
   * Get users by minimum role level
   */
  getUsersByMinimumLevel(minLevel: number): string[] {
    const users: string[] = [];

    for (const [userId] of this.userRoles.entries()) {
      if (this.hasMinimumRoleLevel(userId, minLevel)) {
        users.push(userId);
      }
    }

    return users;
  }
}
