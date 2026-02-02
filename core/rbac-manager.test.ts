/**
 * Unit tests for RBACManager
 */

import { RBACManager } from './rbac-manager';
import { CreatorRole } from '../roles/creator';
import { AdminRole } from '../roles/admin';
import { ModeratorRole } from '../roles/moderator';
import { CollaboratorRole } from '../roles/collaborator';
import { AIAgentRole } from '../roles/ai-agent';
import { UserRole } from '../roles/user';
import { AuditLog } from '../audit/audit-log';

describe('RBACManager', () => {
  let rbacManager: RBACManager;
  let auditLog: AuditLog;

  beforeEach(() => {
    auditLog = new AuditLog({ enabled: true });
    rbacManager = new RBACManager({ auditLog, enableCache: false });
  });

  describe('Role Assignment', () => {
    it('should assign a role to a user', async () => {
      const role = new CreatorRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', role);

      expect(rbacManager.hasRole('user-1', role)).toBe(true);
    });

    it('should throw error when assigning duplicate role type', async () => {
      const role1 = new AdminRole({ userId: 'user-1' });
      const role2 = new AdminRole({ userId: 'user-1' });

      await rbacManager.assignRole('user-1', role1);
      await expect(rbacManager.assignRole('user-1', role2)).rejects.toThrow('already has role');
    });

    it('should allow multiple different roles for same user', async () => {
      const admin = new AdminRole({ userId: 'user-1' });
      const moderator = new ModeratorRole({ userId: 'user-1' });

      await rbacManager.assignRole('user-1', admin);
      await rbacManager.assignRole('user-1', moderator);

      expect(rbacManager.getUserRoles('user-1')).toHaveLength(2);
    });

    it('should log role assignment to audit log', async () => {
      const role = new UserRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', role);

      const entries = await auditLog.query({ action: 'role-change' });
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].metadata?.action).toBe('assign');
    });
  });

  describe('Role Revocation', () => {
    it('should revoke a role from a user', async () => {
      const role = new AdminRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', role);
      await rbacManager.revokeRole('user-1', role);

      expect(rbacManager.hasRole('user-1', role)).toBe(false);
    });

    it('should throw error when revoking non-existent role', async () => {
      const role = new AdminRole({ userId: 'user-1' });
      await expect(rbacManager.revokeRole('user-1', role)).rejects.toThrow('has no roles');
    });

    it('should log role revocation to audit log', async () => {
      const role = new AdminRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', role);
      await rbacManager.revokeRole('user-1', role);

      const entries = await auditLog.query({ action: 'role-change' });
      const revokeEntry = entries.find(e => e.metadata?.action === 'revoke');
      expect(revokeEntry).toBeDefined();
    });
  });

  describe('Role Checks', () => {
    it('should check if user has a specific role', async () => {
      const role = new AdminRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', role);

      expect(rbacManager.hasRole('user-1', role)).toBe(true);
    });

    it('should check if user has a specific role type', async () => {
      const role = new AdminRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', role);

      expect(rbacManager.hasRoleType('user-1', 'admin')).toBe(true);
      expect(rbacManager.hasRoleType('user-1', 'moderator')).toBe(false);
    });

    it('should return false for user with no roles', () => {
      const role = new AdminRole({ userId: 'user-1' });
      expect(rbacManager.hasRole('user-1', role)).toBe(false);
    });
  });

  describe('Permission Checks', () => {
    it('should check if user has a specific permission', async () => {
      const role = new AdminRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', role);

      expect(rbacManager.hasPermission('user-1', 'apply-control')).toBe(true);
    });

    it('should return false for permission user does not have', async () => {
      const role = new UserRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', role);

      expect(rbacManager.hasPermission('user-1', 'apply-control')).toBe(false);
    });

    it('should check if user has all required permissions', async () => {
      const role = new AdminRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', role);

      expect(rbacManager.hasAllPermissions('user-1', ['apply-control', 'view-audit'])).toBe(true);
    });

    it('should return false if user missing any permission', async () => {
      const role = new CollaboratorRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', role);

      expect(rbacManager.hasAllPermissions('user-1', ['preview-control', 'apply-control'])).toBe(false);
    });

    it('should check if user has any of the required permissions', async () => {
      const role = new CollaboratorRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', role);

      expect(rbacManager.hasAnyPermission('user-1', ['preview-control', 'apply-control'])).toBe(true);
      expect(rbacManager.hasAnyPermission('user-1', ['delete-all', 'full-control'])).toBe(false);
    });
  });

  describe('User Roles and Permissions', () => {
    it('should get all roles for a user', async () => {
      const admin = new AdminRole({ userId: 'user-1' });
      const moderator = new ModeratorRole({ userId: 'user-1' });

      await rbacManager.assignRole('user-1', admin);
      await rbacManager.assignRole('user-1', moderator);

      const roles = rbacManager.getUserRoles('user-1');
      expect(roles).toHaveLength(2);
    });

    it('should get all permissions for a role', () => {
      const role = new AdminRole({ userId: 'user-1' });
      const permissions = rbacManager.getRolePermissions(role);
      
      expect(permissions).toContain('apply-control');
      expect(permissions).toContain('view-audit');
    });

    it('should get aggregated permissions for a user', async () => {
      const admin = new AdminRole({ userId: 'user-1' });
      const moderator = new ModeratorRole({ userId: 'user-1' });

      await rbacManager.assignRole('user-1', admin);
      await rbacManager.assignRole('user-1', moderator);

      const permissions = rbacManager.getUserPermissions('user-1');
      expect(permissions.length).toBeGreaterThan(0);
    });
  });

  describe('Role Hierarchy', () => {
    it('should get highest role level for user', async () => {
      const admin = new AdminRole({ userId: 'user-1' });
      const user = new UserRole({ userId: 'user-1' });

      await rbacManager.assignRole('user-1', admin);
      await rbacManager.assignRole('user-1', user);

      expect(rbacManager.getUserHighestRoleLevel('user-1')).toBe(80); // Admin level
    });

    it('should check if user can perform action based on role level', async () => {
      const admin = new AdminRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', admin);

      expect(rbacManager.canPerformAction('user-1', 60)).toBe(true); // Can perform moderator-level actions
      expect(rbacManager.canPerformAction('user-1', 100)).toBe(false); // Cannot perform creator-level actions
    });

    it('should validate if user can manage a role', async () => {
      const creator = new CreatorRole({ userId: 'user-1' });
      const admin = new AdminRole({ userId: 'user-2' });

      await rbacManager.assignRole('user-1', creator);
      await rbacManager.assignRole('user-2', admin);

      expect(rbacManager.canManageRole('user-1', 'admin')).toBe(true); // Creator can manage admin
      expect(rbacManager.canManageRole('user-2', 'creator')).toBe(false); // Admin cannot manage creator
      expect(rbacManager.canManageRole('user-2', 'moderator')).toBe(true); // Admin can manage moderator
    });

    it('should get role hierarchy level', () => {
      expect(rbacManager.getRoleLevel('creator')).toBe(100);
      expect(rbacManager.getRoleLevel('admin')).toBe(80);
      expect(rbacManager.getRoleLevel('moderator')).toBe(60);
      expect(rbacManager.getRoleLevel('collaborator')).toBe(40);
      expect(rbacManager.getRoleLevel('ai-agent')).toBe(30);
      expect(rbacManager.getRoleLevel('user')).toBe(20);
    });

    it('should check minimum role level', async () => {
      const admin = new AdminRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', admin);

      expect(rbacManager.hasMinimumRoleLevel('user-1', 60)).toBe(true);
      expect(rbacManager.hasMinimumRoleLevel('user-1', 80)).toBe(true);
      expect(rbacManager.hasMinimumRoleLevel('user-1', 100)).toBe(false);
    });
  });

  describe('Caching', () => {
    it('should cache user roles when enabled', async () => {
      const cachedManager = new RBACManager({ enableCache: true, cacheTTL: 10000 });
      const role = new AdminRole({ userId: 'user-1' });
      
      await cachedManager.assignRole('user-1', role);
      const roles1 = cachedManager.getUserRoles('user-1');
      const roles2 = cachedManager.getUserRoles('user-1');
      
      expect(roles1).toBe(roles2); // Should return same cached instance
    });

    it('should clear cache when role is assigned', async () => {
      const cachedManager = new RBACManager({ enableCache: true });
      const role1 = new AdminRole({ userId: 'user-1' });
      
      await cachedManager.assignRole('user-1', role1);
      cachedManager.getUserRoles('user-1'); // Cache it
      
      const role2 = new ModeratorRole({ userId: 'user-1' });
      await cachedManager.assignRole('user-1', role2);
      
      const roles = cachedManager.getUserRoles('user-1');
      expect(roles).toHaveLength(2); // Cache was cleared and refreshed
    });

    it('should manually clear cache', () => {
      expect(() => rbacManager.clearCache()).not.toThrow();
    });

    it('should clear cache for specific user', async () => {
      const role = new AdminRole({ userId: 'user-1' });
      await rbacManager.assignRole('user-1', role);
      
      expect(() => rbacManager.clearUserCache('user-1')).not.toThrow();
    });
  });

  describe('Bulk Operations', () => {
    it('should get all users with a specific role', async () => {
      const admin1 = new AdminRole({ userId: 'user-1' });
      const admin2 = new AdminRole({ userId: 'user-2' });
      const user = new UserRole({ userId: 'user-3' });

      await rbacManager.assignRole('user-1', admin1);
      await rbacManager.assignRole('user-2', admin2);
      await rbacManager.assignRole('user-3', user);

      const admins = rbacManager.getUsersWithRole('admin');
      expect(admins).toHaveLength(2);
      expect(admins).toContain('user-1');
      expect(admins).toContain('user-2');
    });

    it('should get total user count', async () => {
      const role1 = new AdminRole({ userId: 'user-1' });
      const role2 = new UserRole({ userId: 'user-2' });

      await rbacManager.assignRole('user-1', role1);
      await rbacManager.assignRole('user-2', role2);

      expect(rbacManager.getUserCount()).toBe(2);
    });

    it('should remove all roles for a user', async () => {
      const admin = new AdminRole({ userId: 'user-1' });
      const moderator = new ModeratorRole({ userId: 'user-1' });

      await rbacManager.assignRole('user-1', admin);
      await rbacManager.assignRole('user-1', moderator);

      await rbacManager.removeAllRoles('user-1');
      expect(rbacManager.getUserRoles('user-1')).toHaveLength(0);
    });

    it('should get users by minimum level', async () => {
      const creator = new CreatorRole({ userId: 'user-1' });
      const admin = new AdminRole({ userId: 'user-2' });
      const user = new UserRole({ userId: 'user-3' });

      await rbacManager.assignRole('user-1', creator);
      await rbacManager.assignRole('user-2', admin);
      await rbacManager.assignRole('user-3', user);

      const highLevelUsers = rbacManager.getUsersByMinimumLevel(60);
      expect(highLevelUsers).toHaveLength(2); // Creator and Admin
      expect(highLevelUsers).toContain('user-1');
      expect(highLevelUsers).toContain('user-2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with no roles', () => {
      expect(rbacManager.getUserRoles('non-existent')).toHaveLength(0);
      expect(rbacManager.getUserHighestRoleLevel('non-existent')).toBe(0);
    });

    it('should handle unknown role type in hierarchy', () => {
      expect(rbacManager.getRoleLevel('unknown')).toBe(0);
    });

    it('should not throw when removing roles from user with no roles', async () => {
      await expect(rbacManager.removeAllRoles('non-existent')).resolves.not.toThrow();
    });
  });
});
