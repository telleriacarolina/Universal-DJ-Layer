/**
 * Creator Role - The original creator with veto power
 * 
 * The creator has full control over the application and can set
 * immutable locks that other roles cannot override.
 * 
 * TODO: Implement creator role with full permissions and lock management
 */

export interface RoleMetadata {
  /** Unique role identifier */
  roleId: string;
  /** Role type */
  roleType: string;
  /** User ID associated with this role */
  userId: string;
  /** Timestamp when role was granted */
  grantedAt: number;
}

export interface Role {
  /** Role metadata */
  metadata: RoleMetadata;
  /** Check if role has a specific permission */
  hasPermission(permission: string): boolean;
  /** Get all permissions for this role */
  getPermissions(): string[];
  /** Get role hierarchy level */
  getHierarchyLevel(): number;
}

export interface CreatorRoleConfig {
  /** User ID of the creator */
  userId: string;
  /** Additional permissions beyond default creator permissions */
  additionalPermissions?: string[];
  /** Resources this creator owns */
  ownedResources?: string[];
}

export class CreatorRole implements Role {
  metadata: RoleMetadata;
  private config: CreatorRoleConfig;
  private permissions: Set<string>;

  constructor(config: CreatorRoleConfig) {
    this.config = config;
    this.metadata = {
      roleId: this.generateRoleId(),
      roleType: 'creator',
      userId: config.userId,
      grantedAt: Date.now(),
    };

    // Creator has all permissions by default
    this.permissions = new Set([
      'full-control',
      'apply-control',
      'revert-control',
      'preview-control',
      'list-controls',
      'create-lock',
      'modify-lock',
      'delete-lock',
      'grant-role',
      'revoke-role',
      'view-audit',
      'modify-policies',
      ...(config.additionalPermissions ?? []),
    ]);
  }

  /**
   * Check if this role has a specific permission
   */
  hasPermission(permission: string): boolean {
    // Creator has all permissions
    return this.permissions.has(permission) || this.permissions.has('full-control');
  }

  /**
   * Get all permissions for this role
   */
  getPermissions(): string[] {
    return Array.from(this.permissions);
  }

  /**
   * Get hierarchy level (creator is highest at 100)
   */
  getHierarchyLevel(): number {
    return 100;
  }

  /**
   * Check if this creator owns a specific resource
   */
  ownsResource(resourceId: string): boolean {
    return this.config.ownedResources?.includes(resourceId) ?? false;
  }

  /**
   * Add a resource to owned resources
   */
  addOwnedResource(resourceId: string): void {
    // TODO: Add resource to owned resources list
    // TODO: Persist change
    throw new Error('Not implemented');
  }

  private generateRoleId(): string {
    return `creator-${this.config.userId}-${Date.now()}`;
  }
}
