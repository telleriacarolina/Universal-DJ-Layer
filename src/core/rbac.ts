import { User, Role, Permission } from './types';

/**
 * Role-Based Access Control (RBAC) system
 * Manages user roles and permissions
 */
export class RBACManager {
  private roleHierarchy: Map<Role, number> = new Map([
    [Role.VIEWER, 1],
    [Role.EXPERIMENTER, 2],
    [Role.ADMIN, 3],
    [Role.OWNER, 4],
  ]);

  // All permissions available in the system
  private static readonly ALL_PERMISSIONS = new Set([
    Permission.READ,
    Permission.WRITE,
    Permission.EXECUTE,
    Permission.DELETE,
    Permission.CONFIGURE,
  ]);

  private rolePermissions: Map<Role, Set<Permission>> = new Map([
    [Role.VIEWER, new Set([Permission.READ])],
    [Role.EXPERIMENTER, new Set([Permission.READ, Permission.WRITE, Permission.EXECUTE])],
    // ADMIN and OWNER have identical permissions by design - both have full system access
    // The distinction is semantic: OWNER represents the creator/ultimate authority
    [Role.ADMIN, new Set(RBACManager.ALL_PERMISSIONS)],
    [Role.OWNER, new Set(RBACManager.ALL_PERMISSIONS)],
  ]);

  /**
   * Check if a user has the required role
   */
  hasRole(user: User, requiredRole: Role): boolean {
    const userLevel = this.roleHierarchy.get(user.role) || 0;
    const requiredLevel = this.roleHierarchy.get(requiredRole) || 0;
    return userLevel >= requiredLevel;
  }

  /**
   * Check if a user has a specific permission
   */
  hasPermission(user: User, permission: Permission): boolean {
    // Check custom permissions first
    if (user.permissions && user.permissions.includes(permission)) {
      return true;
    }

    // Check role-based permissions
    const permissions = this.rolePermissions.get(user.role);
    return permissions ? permissions.has(permission) : false;
  }

  /**
   * Check if a user has all required permissions
   */
  hasAllPermissions(user: User, requiredPermissions: Permission[]): boolean {
    return requiredPermissions.every((permission) => this.hasPermission(user, permission));
  }

  /**
   * Get all permissions for a user
   */
  getUserPermissions(user: User): Permission[] {
    const rolePerms = this.rolePermissions.get(user.role) || new Set();
    const customPerms = user.permissions || [];
    return Array.from(new Set([...rolePerms, ...customPerms]));
  }

  /**
   * Validate if a user can perform an action
   */
  canPerformAction(user: User, requiredRole: Role, requiredPermissions: Permission[]): boolean {
    return this.hasRole(user, requiredRole) && this.hasAllPermissions(user, requiredPermissions);
  }
}
