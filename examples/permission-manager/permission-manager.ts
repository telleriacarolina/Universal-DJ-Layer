import { Role, Permission } from '../../src/core/types';

/**
 * Permission grant with metadata
 */
export interface PermissionGrant {
  id: string;
  userId: string;
  userName: string;
  permission: Permission;
  resource?: string;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  expiresAt?: Date;
  grant?: PermissionGrant;
}

/**
 * Permission Manager - Dynamic permission management with expiration
 */
export class PermissionManager {
  private grants: Map<string, PermissionGrant> = new Map();
  private grantCounter = 0;

  /**
   * Initialize the permission manager
   */
  async initialize(): Promise<void> {
    console.log('Permission Manager initialized');
  }

  /**
   * Grant a permission to a user
   */
  async grantPermission(
    userId: string,
    userName: string,
    permission: Permission,
    grantedBy: string,
    options?: {
      resource?: string;
      expiresIn?: number;
      reason?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<PermissionGrant> {
    const grant: PermissionGrant = {
      id: `GRANT-${++this.grantCounter}`,
      userId,
      userName,
      permission,
      resource: options?.resource,
      grantedBy,
      grantedAt: new Date(),
      reason: options?.reason,
      metadata: options?.metadata
    };

    if (options?.expiresIn) {
      grant.expiresAt = new Date(Date.now() + options.expiresIn);
    }

    this.grants.set(grant.id, grant);
    return grant;
  }

  /**
   * Revoke a permission grant
   */
  async revokePermission(grantId: string): Promise<boolean> {
    return this.grants.delete(grantId);
  }

  /**
   * Check if a user has a permission
   */
  async hasPermission(
    userId: string,
    permission: Permission,
    resource?: string
  ): Promise<PermissionCheckResult> {
    const now = new Date();

    // Find matching grants
    const matchingGrants = Array.from(this.grants.values()).filter(grant => {
      // Check user match
      if (grant.userId !== userId) return false;

      // Check permission match
      if (grant.permission !== permission) return false;

      // Check resource match (if specified)
      if (resource && grant.resource && grant.resource !== resource) {
        return false;
      }

      // Check expiration
      if (grant.expiresAt && grant.expiresAt < now) {
        return false;
      }

      return true;
    });

    if (matchingGrants.length === 0) {
      return { granted: false, reason: 'No matching permission grant found' };
    }

    // Return the most recent grant
    const grant = matchingGrants.sort((a, b) => 
      b.grantedAt.getTime() - a.grantedAt.getTime()
    )[0];

    return {
      granted: true,
      expiresAt: grant.expiresAt,
      grant
    };
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<PermissionGrant[]> {
    const now = new Date();

    return Array.from(this.grants.values()).filter(grant => {
      // Check user match
      if (grant.userId !== userId) return false;

      // Check expiration
      if (grant.expiresAt && grant.expiresAt < now) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get all grants for a specific permission
   */
  async getPermissionGrants(permission: Permission): Promise<PermissionGrant[]> {
    const now = new Date();

    return Array.from(this.grants.values()).filter(grant => {
      // Check permission match
      if (grant.permission !== permission) return false;

      // Check expiration
      if (grant.expiresAt && grant.expiresAt < now) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get grants by resource
   */
  async getResourcePermissions(resource: string): Promise<PermissionGrant[]> {
    const now = new Date();

    return Array.from(this.grants.values()).filter(grant => {
      // Check resource match
      if (grant.resource !== resource) return false;

      // Check expiration
      if (grant.expiresAt && grant.expiresAt < now) {
        return false;
      }

      return true;
    });
  }

  /**
   * Remove expired permissions
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    let removedCount = 0;

    const entries = Array.from(this.grants.entries());
    for (const [id, grant] of entries) {
      if (grant.expiresAt && grant.expiresAt < now) {
        this.grants.delete(id);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Extend permission expiration
   */
  async extendPermission(grantId: string, additionalMs: number): Promise<boolean> {
    const grant = this.grants.get(grantId);
    
    if (!grant) {
      return false;
    }

    if (!grant.expiresAt) {
      // If no expiration, set from now
      grant.expiresAt = new Date(Date.now() + additionalMs);
    } else {
      // Extend existing expiration
      grant.expiresAt = new Date(grant.expiresAt.getTime() + additionalMs);
    }

    return true;
  }

  /**
   * Get grant by ID
   */
  async getGrant(grantId: string): Promise<PermissionGrant | undefined> {
    return this.grants.get(grantId);
  }

  /**
   * Get all grants
   */
  async getAllGrants(): Promise<PermissionGrant[]> {
    return Array.from(this.grants.values());
  }

  /**
   * Get expiring permissions (expiring within specified time)
   */
  async getExpiringPermissions(withinMs: number): Promise<PermissionGrant[]> {
    const now = new Date();
    const threshold = new Date(now.getTime() + withinMs);

    return Array.from(this.grants.values()).filter(grant => {
      if (!grant.expiresAt) return false;
      return grant.expiresAt > now && grant.expiresAt <= threshold;
    });
  }

  /**
   * Bulk grant permissions
   */
  async bulkGrant(
    grants: Array<{
      userId: string;
      userName: string;
      permission: Permission;
      resource?: string;
      expiresIn?: number;
      reason?: string;
    }>,
    grantedBy: string
  ): Promise<PermissionGrant[]> {
    const results: PermissionGrant[] = [];

    for (const grantData of grants) {
      const grant = await this.grantPermission(
        grantData.userId,
        grantData.userName,
        grantData.permission,
        grantedBy,
        {
          resource: grantData.resource,
          expiresIn: grantData.expiresIn,
          reason: grantData.reason
        }
      );
      results.push(grant);
    }

    return results;
  }

  /**
   * Bulk revoke permissions for a user
   */
  async revokeAllUserPermissions(userId: string): Promise<number> {
    let revokedCount = 0;

    const entries = Array.from(this.grants.entries());
    for (const [id, grant] of entries) {
      if (grant.userId === userId) {
        this.grants.delete(id);
        revokedCount++;
      }
    }

    return revokedCount;
  }

  /**
   * Generate permission report
   */
  async generateReport(): Promise<{
    totalGrants: number;
    activeGrants: number;
    expiredGrants: number;
    byPermission: Record<string, number>;
    byUser: Record<string, number>;
  }> {
    const now = new Date();
    const allGrants = Array.from(this.grants.values());

    const activeGrants = allGrants.filter(g => 
      !g.expiresAt || g.expiresAt > now
    );

    const expiredGrants = allGrants.filter(g => 
      g.expiresAt && g.expiresAt <= now
    );

    const byPermission: Record<string, number> = {};
    const byUser: Record<string, number> = {};

    for (const grant of activeGrants) {
      byPermission[grant.permission] = (byPermission[grant.permission] || 0) + 1;
      byUser[grant.userId] = (byUser[grant.userId] || 0) + 1;
    }

    return {
      totalGrants: allGrants.length,
      activeGrants: activeGrants.length,
      expiredGrants: expiredGrants.length,
      byPermission,
      byUser
    };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.grants.clear();
    console.log('Permission Manager cleaned up');
  }
}
