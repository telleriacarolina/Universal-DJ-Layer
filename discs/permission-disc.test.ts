import { PermissionDisc, PermissionConfig, PermissionGrant } from './permission-disc';

describe('PermissionDisc', () => {
  describe('Constructor and Metadata', () => {
    test('creates disc with correct metadata', () => {
      const config: PermissionConfig = {
        name: 'test-permissions',
        userPermissions: {},
        rolePermissions: {},
      };

      const disc = new PermissionDisc(config);

      expect(disc.metadata.name).toBe('test-permissions');
      expect(disc.metadata.type).toBe('permission');
      expect(disc.metadata.version).toBe('1.0.0');
      expect(disc.metadata.id).toContain('permission-');
      expect(disc.metadata.createdAt).toBeLessThanOrEqual(Date.now());
    });

    test('generates unique IDs for different instances', () => {
      const config: PermissionConfig = {
        name: 'test',
      };

      const disc1 = new PermissionDisc(config);
      const disc2 = new PermissionDisc(config);

      expect(disc1.metadata.id).not.toBe(disc2.metadata.id);
    });

    test('initializes with empty permissions if not provided', () => {
      const config: PermissionConfig = {
        name: 'test',
      };

      const disc = new PermissionDisc(config);
      const userPerms = disc.listUserPermissions('user123');

      expect(userPerms).toEqual([]);
    });
  });

  describe('Basic Grant and Revoke Operations', () => {
    test('grants permission to a user', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');

      expect(disc.hasPermission('user123', 'read')).toBe(true);
    });

    test('revokes permission from a user', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');
      disc.revokePermission('user123', 'read');

      expect(disc.hasPermission('user123', 'read')).toBe(false);
    });

    test('grants multiple permissions to same user', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');
      disc.grantPermission('user123', 'write');
      disc.grantPermission('user123', 'delete');

      expect(disc.hasPermission('user123', 'read')).toBe(true);
      expect(disc.hasPermission('user123', 'write')).toBe(true);
      expect(disc.hasPermission('user123', 'delete')).toBe(true);
    });

    test('returns false for permission user does not have', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');

      expect(disc.hasPermission('user123', 'write')).toBe(false);
    });

    test('returns false for non-existent user', () => {
      const disc = new PermissionDisc({ name: 'test' });

      expect(disc.hasPermission('nonexistent', 'read')).toBe(false);
    });

    test('lists all permissions for a user', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');
      disc.grantPermission('user123', 'write');

      const permissions = disc.listUserPermissions('user123');

      expect(permissions).toHaveLength(2);
      expect(permissions).toContain('read');
      expect(permissions).toContain('write');
    });

    test('returns empty array for user with no permissions', () => {
      const disc = new PermissionDisc({ name: 'test' });

      const permissions = disc.listUserPermissions('user123');

      expect(permissions).toEqual([]);
    });

    test('revoke does nothing for non-existent permission', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');
      disc.revokePermission('user123', 'write');

      expect(disc.hasPermission('user123', 'read')).toBe(true);
    });

    test('revoke does nothing for non-existent user', () => {
      const disc = new PermissionDisc({ name: 'test' });

      expect(() => {
        disc.revokePermission('nonexistent', 'read');
      }).not.toThrow();
    });

    test('updates updatedAt timestamp when granting permission', () => {
      const disc = new PermissionDisc({ name: 'test' });

      const before = Date.now();
      disc.grantPermission('user123', 'read');
      const after = Date.now();

      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
      expect(disc.metadata.updatedAt!).toBeLessThanOrEqual(after);
    });

    test('updates existing permission when granted again', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');
      const first = disc.listUserPermissions('user123');
      
      disc.grantPermission('user123', 'read');
      const second = disc.listUserPermissions('user123');

      expect(second).toEqual(first);
      expect(second).toHaveLength(1);
    });
  });

  describe('TTL Support', () => {
    test('grants permission with TTL', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read', 5000);

      expect(disc.hasPermission('user123', 'read')).toBe(true);
    });

    test('permission expires after TTL', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read', 50);

      expect(disc.hasPermission('user123', 'read')).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(disc.hasPermission('user123', 'read')).toBe(false);
    });

    test('expired permissions are not listed', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read', 50);
      disc.grantPermission('user123', 'write');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const permissions = disc.listUserPermissions('user123');

      expect(permissions).toHaveLength(1);
      expect(permissions).toContain('write');
      expect(permissions).not.toContain('read');
    });

    test('permanent permissions coexist with temporary ones', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read', 50);
      disc.grantPermission('user123', 'write');

      expect(disc.hasPermission('user123', 'read')).toBe(true);
      expect(disc.hasPermission('user123', 'write')).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(disc.hasPermission('user123', 'read')).toBe(false);
      expect(disc.hasPermission('user123', 'write')).toBe(true);
    });

    test('cleanup removes expired permissions', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read', 50);
      disc.grantPermission('user123', 'write', 50);

      await new Promise((resolve) => setTimeout(resolve, 100));

      disc.hasPermission('user123', 'read');

      const permissions = disc.listUserPermissions('user123');
      expect(permissions).toEqual([]);
    });

    test('permission without TTL never expires', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(disc.hasPermission('user123', 'read')).toBe(true);
    });
  });

  describe('Permission Scopes', () => {
    test('exact permission match', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read:document:456');

      expect(disc.hasPermission('user123', 'read:document:456')).toBe(true);
    });

    test('global permission matches resource-specific request', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');

      expect(disc.hasPermission('user123', 'read:document:456')).toBe(true);
    });

    test('scoped permission matches more specific request', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read:document');

      expect(disc.hasPermission('user123', 'read:document:456')).toBe(true);
    });

    test('resource-specific permission does not match global request', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read:document:456');

      expect(disc.hasPermission('user123', 'read')).toBe(false);
    });

    test('different action does not match', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read:document:456');

      expect(disc.hasPermission('user123', 'write:document:456')).toBe(false);
    });

    test('different resource does not match', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read:document:456');

      expect(disc.hasPermission('user123', 'read:document:789')).toBe(false);
    });

    test('supports wildcard-style hierarchical permissions', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'admin');

      expect(disc.hasPermission('user123', 'admin:users')).toBe(true);
      expect(disc.hasPermission('user123', 'admin:users:delete')).toBe(true);
      expect(disc.hasPermission('user123', 'admin:settings:update')).toBe(true);
    });
  });

  describe('Role Permissions', () => {
    test('grants permissions to a role', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantRolePermissions('admin', ['read', 'write', 'delete']);

      const allPerms = disc.getUserPermissionsWithInheritance('user123', 'admin');

      expect(allPerms).toContain('read');
      expect(allPerms).toContain('write');
      expect(allPerms).toContain('delete');
    });

    test('combines user and role permissions', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'custom');
      disc.grantRolePermissions('editor', ['read', 'write']);

      const allPerms = disc.getUserPermissionsWithInheritance('user123', 'editor');

      expect(allPerms).toHaveLength(3);
      expect(allPerms).toContain('custom');
      expect(allPerms).toContain('read');
      expect(allPerms).toContain('write');
    });

    test('prevents duplicate permissions in combined list', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');
      disc.grantRolePermissions('editor', ['read', 'write']);

      const allPerms = disc.getUserPermissionsWithInheritance('user123', 'editor');

      expect(allPerms).toHaveLength(2);
      expect(allPerms.filter((p) => p === 'read')).toHaveLength(1);
    });

    test('returns only user permissions when no role specified', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'custom');
      disc.grantRolePermissions('editor', ['read', 'write']);

      const allPerms = disc.getUserPermissionsWithInheritance('user123');

      expect(allPerms).toEqual(['custom']);
    });

    test('returns empty array for user with no permissions and no role', () => {
      const disc = new PermissionDisc({ name: 'test' });

      const allPerms = disc.getUserPermissionsWithInheritance('user123');

      expect(allPerms).toEqual([]);
    });

    test('returns role permissions for user with no user-specific permissions', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantRolePermissions('viewer', ['read']);

      const allPerms = disc.getUserPermissionsWithInheritance('user123', 'viewer');

      expect(allPerms).toEqual(['read']);
    });

    test('does not add duplicate permissions to role', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantRolePermissions('admin', ['read', 'write']);
      disc.grantRolePermissions('admin', ['write', 'delete']);

      const allPerms = disc.getUserPermissionsWithInheritance('user123', 'admin');

      expect(allPerms).toHaveLength(3);
      expect(allPerms.filter((p) => p === 'write')).toHaveLength(1);
    });

    test('handles non-existent role gracefully', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'custom');

      const allPerms = disc.getUserPermissionsWithInheritance('user123', 'nonexistent');

      expect(allPerms).toEqual(['custom']);
    });
  });

  describe('Audit Trail', () => {
    test('tracks permission grants', () => {
      const disc = new PermissionDisc({ name: 'test', actor: 'admin1' });

      disc.grantPermission('user123', 'read');

      const audit = disc.getAuditTrail();

      expect(audit).toHaveLength(1);
      expect(audit[0].action).toBe('grant');
      expect(audit[0].userId).toBe('user123');
      expect(audit[0].permission).toBe('read');
      expect(audit[0].actor).toBe('admin1');
      expect(audit[0].before).toBeNull();
      expect(audit[0].after).toBeDefined();
    });

    test('tracks permission revokes', () => {
      const disc = new PermissionDisc({ name: 'test', actor: 'admin1' });

      disc.grantPermission('user123', 'read');
      disc.revokePermission('user123', 'read');

      const audit = disc.getAuditTrail();

      expect(audit).toHaveLength(2);
      expect(audit[1].action).toBe('revoke');
      expect(audit[1].userId).toBe('user123');
      expect(audit[1].permission).toBe('read');
      expect(audit[1].before).toBeDefined();
      expect(audit[1].after).toBeNull();
    });

    test('tracks role permission grants', () => {
      const disc = new PermissionDisc({ name: 'test', actor: 'admin1' });

      disc.grantRolePermissions('editor', ['read', 'write']);

      const audit = disc.getAuditTrail();

      expect(audit).toHaveLength(1);
      expect(audit[0].action).toBe('grant_role');
      expect(audit[0].roleId).toBe('editor');
      expect(audit[0].permissions).toEqual(['read', 'write']);
      expect(audit[0].actor).toBe('admin1');
    });

    test('tracks permission updates', () => {
      const disc = new PermissionDisc({ name: 'test', actor: 'admin1' });

      disc.grantPermission('user123', 'read');
      disc.grantPermission('user123', 'read', 5000);

      const audit = disc.getAuditTrail();

      expect(audit).toHaveLength(2);
      expect(audit[0].before).toBeNull();
      expect(audit[1].before).toBeDefined();
    });

    test('tracks expired permission cleanup', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read', 50);

      await new Promise((resolve) => setTimeout(resolve, 100));

      disc.hasPermission('user123', 'read');

      const audit = disc.getAuditTrail();
      const cleanupEntry = audit.find((entry) => entry.action === 'cleanup');

      expect(cleanupEntry).toBeDefined();
      expect(cleanupEntry!.userId).toBe('user123');
      expect(cleanupEntry!.before).toBe(1);
      expect(cleanupEntry!.after).toBe(0);
    });

    test('includes timestamp for all audit entries', () => {
      const disc = new PermissionDisc({ name: 'test' });

      const before = Date.now();
      disc.grantPermission('user123', 'read');
      disc.revokePermission('user123', 'read');
      const after = Date.now();

      const audit = disc.getAuditTrail();

      for (const entry of audit) {
        expect(entry.timestamp).toBeGreaterThanOrEqual(before);
        expect(entry.timestamp).toBeLessThanOrEqual(after);
      }
    });

    test('getAuditTrail returns copy not affecting internal state', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');

      const audit1 = disc.getAuditTrail();
      audit1.push({
        timestamp: Date.now(),
        action: 'grant',
        userId: 'fake',
        permission: 'fake',
      });

      const audit2 = disc.getAuditTrail();

      expect(audit2).toHaveLength(1);
    });
  });

  describe('Base Disc Interface - Apply', () => {
    test('applies permissions to context', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');
      disc.grantRolePermissions('admin', ['write']);

      const context = {};
      const result = await disc.apply(context);

      expect(result.permissions).toBeDefined();
      expect(result.permissions.userPermissions).toBeDefined();
      expect(result.permissions.rolePermissions).toBeDefined();
      expect(result.permissions.userPermissions.user123).toBeDefined();
    });

    test('throws error for invalid context', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      await expect(disc.apply(null)).rejects.toThrow('Invalid context');
      await expect(disc.apply(undefined)).rejects.toThrow('Invalid context');
    });

    test('stores previous state for revert', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');

      const context: any = {
        permissions: {
          userPermissions: {
            user456: [{ permission: 'write', grantedAt: Date.now() }],
          },
        },
      };

      await disc.apply(context);

      expect(context.permissions.userPermissions.user123).toBeDefined();
      expect(context.permissions.userPermissions.user456).toBeDefined();
    });

    test('initializes permissions object if not present', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');

      const context: any = { someOtherData: 'value' };
      await disc.apply(context);

      expect(context.permissions).toBeDefined();
      expect(context.permissions.userPermissions).toBeDefined();
    });

    test('includes audit trail in applied context', async () => {
      const disc = new PermissionDisc({ name: 'test', actor: 'admin1' });

      disc.grantPermission('user123', 'read');

      const context = {};
      const result = await disc.apply(context);

      expect(result.permissions.auditTrail).toBeDefined();
      expect(result.permissions.auditTrail).toHaveLength(1);
    });
  });

  describe('Base Disc Interface - Revert', () => {
    test('reverts to previous state', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');

      const context: any = {
        permissions: {
          userPermissions: {
            user456: [{ permission: 'write', grantedAt: Date.now() }],
          },
        },
      };

      await disc.apply(context);
      await disc.revert(context);

      expect(context.permissions.userPermissions.user456).toBeDefined();
      expect(context.permissions.userPermissions.user123).toBeUndefined();
    });

    test('throws error when no previous state exists', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      const context = {};

      await expect(disc.revert(context)).rejects.toThrow('No previous state to revert to');
    });

    test('throws error for invalid context', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      const context = {};
      await disc.apply(context);

      await expect(disc.revert(null)).rejects.toThrow('Invalid context');
    });

    test('clears previous state after revert', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      const context = { permissions: {} };
      await disc.apply(context);
      await disc.revert(context);

      await expect(disc.revert(context)).rejects.toThrow('No previous state to revert to');
    });
  });

  describe('Base Disc Interface - Preview', () => {
    test('shows changes without applying', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');

      const context = {
        permissions: {
          userPermissions: {
            user456: [{ permission: 'write', grantedAt: Date.now() }],
          },
          rolePermissions: {},
        },
      };

      const preview = await disc.preview(context);

      expect(preview.discName).toBe('test');
      expect(preview.changesCount).toBe(1);
      expect(preview.changes.userPermissions.user123).toBeDefined();
      expect(preview.changes.userPermissions.user123.action).toBe('add');
    });

    test('identifies modifications to existing permissions', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');
      disc.grantPermission('user123', 'write');

      const context = {
        permissions: {
          userPermissions: {
            user123: [{ permission: 'read', grantedAt: Date.now() - 1000 }],
          },
          rolePermissions: {},
        },
      };

      const preview = await disc.preview(context);

      expect(preview.changes.userPermissions.user123).toBeDefined();
      expect(preview.changes.userPermissions.user123.action).toBe('modify');
    });

    test('shows role permission changes', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantRolePermissions('admin', ['read', 'write']);

      const context = {
        permissions: {
          userPermissions: {},
          rolePermissions: {},
        },
      };

      const preview = await disc.preview(context);

      expect(preview.changes.rolePermissions.admin).toBeDefined();
      expect(preview.changes.rolePermissions.admin.action).toBe('add');
      expect(preview.affectedRoles).toContain('admin');
    });

    test('returns empty changes for identical state', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');

      const context = {};
      await disc.apply(context);

      const preview = await disc.preview(context);

      expect(preview.changesCount).toBe(0);
    });

    test('lists affected users and roles', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');
      disc.grantPermission('user456', 'write');
      disc.grantRolePermissions('admin', ['delete']);

      const context = { permissions: {} };
      const preview = await disc.preview(context);

      expect(preview.affectedUsers).toContain('user123');
      expect(preview.affectedUsers).toContain('user456');
      expect(preview.affectedRoles).toContain('admin');
    });

    test('handles empty context', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');

      const preview = await disc.preview({});

      expect(preview.changesCount).toBe(1);
      expect(preview.changes.userPermissions.user123.action).toBe('add');
    });
  });

  describe('Base Disc Interface - Validate', () => {
    test('validates successfully with valid config', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read', 5000);
      disc.grantRolePermissions('admin', ['write', 'delete']);

      await expect(disc.validate()).resolves.toBe(true);
    });

    test('throws error for empty user ID', async () => {
      const disc = new PermissionDisc({
        name: 'test',
        userPermissions: {
          '': [{ permission: 'read', grantedAt: Date.now() }],
        },
      });

      await expect(disc.validate()).rejects.toThrow('User ID cannot be empty');
    });

    test('throws error for empty permission', async () => {
      const disc = new PermissionDisc({
        name: 'test',
        userPermissions: {
          user123: [{ permission: '', grantedAt: Date.now() }],
        },
      });

      await expect(disc.validate()).rejects.toThrow('permission cannot be empty');
    });

    test('throws error for invalid expiration time', async () => {
      const now = Date.now();
      const disc = new PermissionDisc({
        name: 'test',
        userPermissions: {
          user123: [
            {
              permission: 'read',
              grantedAt: now,
              expiresAt: now - 1000,
            },
          ],
        },
      });

      await expect(disc.validate()).rejects.toThrow('expiration must be after grant time');
    });

    test('throws error for empty role ID', async () => {
      const disc = new PermissionDisc({
        name: 'test',
        rolePermissions: {
          '': ['read'],
        },
      });

      await expect(disc.validate()).rejects.toThrow('Role ID cannot be empty');
    });

    test('throws error for empty role permission', async () => {
      const disc = new PermissionDisc({
        name: 'test',
        rolePermissions: {
          admin: ['read', ''],
        },
      });

      await expect(disc.validate()).rejects.toThrow('permission cannot be empty');
    });

    test('validates multiple errors at once', async () => {
      const disc = new PermissionDisc({
        name: 'test',
        userPermissions: {
          '': [{ permission: '', grantedAt: Date.now() }],
        },
        rolePermissions: {
          '': [''],
        },
      });

      await expect(disc.validate()).rejects.toThrow('Validation failed');
    });
  });

  describe('Edge Cases', () => {
    test('handles permission with all metadata', () => {
      const disc = new PermissionDisc({ name: 'test', actor: 'admin1' });

      disc.grantPermission('user123', 'read', 5000);

      const permissions = disc.listUserPermissions('user123');
      expect(permissions).toContain('read');
    });

    test('handles multiple users with different permissions', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user1', 'read');
      disc.grantPermission('user2', 'write');
      disc.grantPermission('user3', 'delete');

      expect(disc.hasPermission('user1', 'read')).toBe(true);
      expect(disc.hasPermission('user1', 'write')).toBe(false);
      expect(disc.hasPermission('user2', 'write')).toBe(true);
      expect(disc.hasPermission('user2', 'read')).toBe(false);
      expect(disc.hasPermission('user3', 'delete')).toBe(true);
    });

    test('handles complex permission hierarchies', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'api');
      disc.grantPermission('user456', 'api:users');
      disc.grantPermission('user789', 'api:users:read');

      expect(disc.hasPermission('user123', 'api:users:read:profile')).toBe(true);
      expect(disc.hasPermission('user456', 'api:users:read:profile')).toBe(true);
      expect(disc.hasPermission('user789', 'api:users:read:profile')).toBe(true);

      expect(disc.hasPermission('user789', 'api:users:write')).toBe(false);
      expect(disc.hasPermission('user789', 'api')).toBe(false);
    });

    test('handles empty permission strings gracefully', () => {
      const disc = new PermissionDisc({ name: 'test' });

      expect(disc.hasPermission('user123', '')).toBe(false);
    });

    test('cleanup only triggers when there are expired permissions', () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'read');
      disc.hasPermission('user123', 'read');

      const audit = disc.getAuditTrail();
      const cleanupEntries = audit.filter((entry) => entry.action === 'cleanup');

      expect(cleanupEntries).toHaveLength(0);
    });

    test('handles mixed expired and active permissions', async () => {
      const disc = new PermissionDisc({ name: 'test' });

      disc.grantPermission('user123', 'temp1', 50);
      disc.grantPermission('user123', 'permanent');
      disc.grantPermission('user123', 'temp2', 50);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const permissions = disc.listUserPermissions('user123');

      expect(permissions).toEqual(['permanent']);
    });

    test('handles initialization with existing config', () => {
      const existingGrants = [
        { permission: 'read', grantedAt: Date.now() },
        { permission: 'write', grantedAt: Date.now(), expiresAt: Date.now() + 10000 },
      ];

      const disc = new PermissionDisc({
        name: 'test',
        userPermissions: {
          user123: existingGrants,
        },
        rolePermissions: {
          admin: ['delete', 'manage'],
        },
      });

      expect(disc.hasPermission('user123', 'read')).toBe(true);
      expect(disc.hasPermission('user123', 'write')).toBe(true);

      const allPerms = disc.getUserPermissionsWithInheritance('user123', 'admin');
      expect(allPerms).toContain('read');
      expect(allPerms).toContain('write');
      expect(allPerms).toContain('delete');
      expect(allPerms).toContain('manage');
    });
  });
});
