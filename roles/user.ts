/**
 * User Role - Basic interaction, no control modifications
 * 
 * Regular users can view their own data and interact with the
 * application but cannot modify controls or system behavior.
 * 
 * TODO: Implement basic user role with read-only access
 */

import type { Role, RoleMetadata } from './creator';

export interface UserRoleConfig {
  /** User ID */
  userId: string;
  /** Additional permissions beyond default user permissions */
  additionalPermissions?: string[];
}

export class UserRole implements Role {
  metadata: RoleMetadata;
  private config: UserRoleConfig;
  private permissions: Set<string>;

  constructor(config: UserRoleConfig) {
    this.config = config;
    this.metadata = {
      roleId: this.generateRoleId(),
      roleType: 'user',
      userId: config.userId,
      grantedAt: Date.now(),
    };

    // User default permissions (very limited)
    this.permissions = new Set(
      config.additionalPermissions ?? [
        'view-own-data',
        'interact',
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
   * Get hierarchy level (user is 20)
   */
  getHierarchyLevel(): number {
    return 20;
  }

  /**
   * Check if user can access their own data
   */
  canAccessOwnData(): boolean {
    return this.hasPermission('view-own-data');
  }

  /**
   * Grant an additional permission to this user
   * (must be called by a higher-level role)
   */
  grantPermission(permission: string): void {
    // TODO: Validate permission is appropriate for user role
    // TODO: Add to permissions set
    // TODO: Persist change
    throw new Error('Not implemented');
  }

  private generateRoleId(): string {
    return `user-${this.config.userId}-${Date.now()}`;
  }
}
