/**
 * Admin Role - Broad permissions but cannot override creator locks
 * 
 * Admins can manage most aspects of the system but must respect
 * creator locks and creator-level policies.
 * 
 * TODO: Implement admin role with elevated but not absolute permissions
 */

import type { Role, RoleMetadata } from './creator';

export interface AdminRoleConfig {
  /** User ID of the admin */
  userId: string;
  /** Specific permissions granted to this admin */
  permissions?: string[];
  /** Scoped resources this admin can manage */
  scopedResources?: string[];
}

export class AdminRole implements Role {
  metadata: RoleMetadata;
  private config: AdminRoleConfig;
  private permissions: Set<string>;

  constructor(config: AdminRoleConfig) {
    this.config = config;
    this.metadata = {
      roleId: this.generateRoleId(),
      roleType: 'admin',
      userId: config.userId,
      grantedAt: Date.now(),
    };

    // Admin default permissions (extensive but not full-control)
    this.permissions = new Set(
      config.permissions ?? [
        'apply-control',
        'revert-control',
        'preview-control',
        'list-controls',
        'view-audit',
        'grant-role:moderator',
        'grant-role:collaborator',
        'grant-role:user',
        'revoke-role:moderator',
        'revoke-role:collaborator',
        'revoke-role:user',
        'modify-policies:safety',
        'modify-policies:anti-abuse',
      ]
    );
  }

  /**
   * Check if this role has a specific permission
   */
  hasPermission(permission: string): boolean {
    return this.permissions.has(permission);
  }

  /**
   * Get all permissions for this role
   */
  getPermissions(): string[] {
    return Array.from(this.permissions);
  }

  /**
   * Get hierarchy level (admin is 80)
   */
  getHierarchyLevel(): number {
    return 80;
  }

  /**
   * Check if admin can manage a specific resource
   */
  canManageResource(resourceId: string): boolean {
    // If no scoped resources, can manage all
    if (!this.config.scopedResources || this.config.scopedResources.length === 0) {
      return true;
    }
    return this.config.scopedResources.includes(resourceId);
  }

  /**
   * Add a permission to this admin role
   */
  addPermission(permission: string): void {
    // TODO: Validate permission is allowed for admin role
    // TODO: Add to permissions set
    // TODO: Persist change
    throw new Error('Not implemented');
  }

  /**
   * Remove a permission from this admin role
   */
  removePermission(permission: string): void {
    // TODO: Remove from permissions set
    // TODO: Persist change
    throw new Error('Not implemented');
  }

  private generateRoleId(): string {
    return `admin-${this.config.userId}-${Date.now()}`;
  }
}
