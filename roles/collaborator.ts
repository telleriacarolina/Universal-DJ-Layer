/**
 * Collaborator Role - Can propose changes, requires approval
 * 
 * Collaborators can create and preview controls but need approval
 * from higher-level roles before changes are applied.
 * 
 * TODO: Implement collaborator role with proposal workflow
 */

import type { Role, RoleMetadata } from './creator';

export interface CollaboratorRoleConfig {
  /** User ID of the collaborator */
  userId: string;
  /** Specific permissions granted to this collaborator */
  permissions?: string[];
  /** Areas this collaborator can work on */
  workAreas?: string[];
  /** Who can approve this collaborator's changes */
  approvers?: string[];
}

export class CollaboratorRole implements Role {
  metadata: RoleMetadata;
  private config: CollaboratorRoleConfig;
  private permissions: Set<string>;

  constructor(config: CollaboratorRoleConfig) {
    this.config = config;
    this.metadata = {
      roleId: this.generateRoleId(),
      roleType: 'collaborator',
      userId: config.userId,
      grantedAt: Date.now(),
    };

    // Collaborator default permissions (preview and propose)
    this.permissions = new Set(
      config.permissions ?? [
        'preview-control',
        'propose-control',
        'list-controls',
        'view-audit:own',
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
   * Get hierarchy level (collaborator is 40)
   */
  getHierarchyLevel(): number {
    return 40;
  }

  /**
   * Check if collaborator can work on a specific area
   */
  canWorkOnArea(area: string): boolean {
    // If no work areas specified, can work on anything
    if (!this.config.workAreas || this.config.workAreas.length === 0) {
      return true;
    }
    return this.config.workAreas.includes(area);
  }

  /**
   * Check if a user can approve this collaborator's changes
   */
  canBeApprovedBy(userId: string): boolean {
    // If no approvers specified, any higher role can approve
    if (!this.config.approvers || this.config.approvers.length === 0) {
      return true;
    }
    return this.config.approvers.includes(userId);
  }

  /**
   * Add a work area to this collaborator
   */
  addWorkArea(area: string): void {
    // TODO: Add area to work areas
    // TODO: Persist change
    throw new Error('Not implemented');
  }

  /**
   * Add an approver for this collaborator
   */
  addApprover(approverId: string): void {
    // TODO: Add to approvers list
    // TODO: Persist change
    throw new Error('Not implemented');
  }

  private generateRoleId(): string {
    return `collaborator-${this.config.userId}-${Date.now()}`;
  }
}
