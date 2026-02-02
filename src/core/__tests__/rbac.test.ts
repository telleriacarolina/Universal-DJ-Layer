import { RBACManager } from '../rbac';
import { Role, Permission, User } from '../types';

describe('RBACManager', () => {
  let rbacManager: RBACManager;

  beforeEach(() => {
    rbacManager = new RBACManager();
  });

  describe('hasRole', () => {
    it('should return true when user has the required role', () => {
      const user: User = { id: '1', name: 'Admin', role: Role.ADMIN };
      expect(rbacManager.hasRole(user, Role.EXPERIMENTER)).toBe(true);
    });

    it('should return true when user has a higher role', () => {
      const user: User = { id: '1', name: 'Owner', role: Role.OWNER };
      expect(rbacManager.hasRole(user, Role.ADMIN)).toBe(true);
    });

    it('should return false when user has a lower role', () => {
      const user: User = { id: '1', name: 'Viewer', role: Role.VIEWER };
      expect(rbacManager.hasRole(user, Role.ADMIN)).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true for viewer with read permission', () => {
      const user: User = { id: '1', name: 'Viewer', role: Role.VIEWER };
      expect(rbacManager.hasPermission(user, Permission.READ)).toBe(true);
    });

    it('should return false for viewer with write permission', () => {
      const user: User = { id: '1', name: 'Viewer', role: Role.VIEWER };
      expect(rbacManager.hasPermission(user, Permission.WRITE)).toBe(false);
    });

    it('should return true for experimenter with execute permission', () => {
      const user: User = { id: '1', name: 'Experimenter', role: Role.EXPERIMENTER };
      expect(rbacManager.hasPermission(user, Permission.EXECUTE)).toBe(true);
    });

    it('should respect custom permissions', () => {
      const user: User = {
        id: '1',
        name: 'Custom',
        role: Role.VIEWER,
        permissions: [Permission.WRITE],
      };
      expect(rbacManager.hasPermission(user, Permission.WRITE)).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all required permissions', () => {
      const user: User = { id: '1', name: 'Admin', role: Role.ADMIN };
      expect(rbacManager.hasAllPermissions(user, [Permission.READ, Permission.WRITE])).toBe(true);
    });

    it('should return false when user is missing a permission', () => {
      const user: User = { id: '1', name: 'Viewer', role: Role.VIEWER };
      expect(rbacManager.hasAllPermissions(user, [Permission.READ, Permission.WRITE])).toBe(false);
    });
  });

  describe('canPerformAction', () => {
    it('should return true when user has required role and permissions', () => {
      const user: User = { id: '1', name: 'Admin', role: Role.ADMIN };
      expect(rbacManager.canPerformAction(user, Role.EXPERIMENTER, [Permission.READ])).toBe(true);
    });

    it('should return false when user lacks required role', () => {
      const user: User = { id: '1', name: 'Viewer', role: Role.VIEWER };
      expect(rbacManager.canPerformAction(user, Role.ADMIN, [Permission.READ])).toBe(false);
    });

    it('should return false when user lacks required permissions', () => {
      const user: User = { id: '1', name: 'Experimenter', role: Role.EXPERIMENTER };
      expect(rbacManager.canPerformAction(user, Role.EXPERIMENTER, [Permission.DELETE])).toBe(
        false
      );
    });
  });
});
