# Permission Manager Example

A complete dynamic permission management system with expiration, resource-level permissions, and real-time permission checking.

## Features

- 🔐 **Dynamic Permissions**: Grant and revoke permissions at runtime
- ⏰ **Expiration**: Set time-limited permissions that auto-expire
- 📦 **Resource-Level**: Grant permissions for specific resources
- 🔍 **Real-Time Checking**: Validate permissions on demand
- 📊 **Reporting**: Generate permission reports and analytics
- 🔄 **Bulk Operations**: Grant or revoke multiple permissions at once
- ⚡ **Auto Cleanup**: Automatically remove expired permissions

## Usage

### Basic Setup

```typescript
import { PermissionManager } from './examples/permission-manager';
import { Permission } from './src/core/types';

const manager = new PermissionManager();
await manager.initialize();
```

### Granting Permissions

```typescript
// Grant permanent permission
const grant = await manager.grantPermission(
  'user-123',
  'Alice',
  Permission.READ,
  'admin-001',
  { reason: 'Standard user access' }
);

// Grant temporary permission (expires in 7 days)
await manager.grantPermission(
  'user-123',
  'Alice',
  Permission.WRITE,
  'admin-001',
  {
    expiresIn: 7 * 24 * 60 * 60 * 1000,
    reason: 'Temporary project access'
  }
);

// Grant resource-specific permission
await manager.grantPermission(
  'user-123',
  'Alice',
  Permission.WRITE,
  'admin-001',
  {
    resource: 'project-alpha',
    reason: 'Project team member'
  }
);
```

### Checking Permissions

```typescript
// Check basic permission
const result = await manager.hasPermission('user-123', Permission.READ);
if (result.granted) {
  console.log('User has READ permission');
  if (result.expiresAt) {
    console.log(`Expires: ${result.expiresAt}`);
  }
}

// Check resource-specific permission
const resourceResult = await manager.hasPermission(
  'user-123',
  Permission.WRITE,
  'project-alpha'
);
```

### Revoking Permissions

```typescript
// Revoke specific grant
await manager.revokePermission('GRANT-123');

// Revoke all permissions for a user
const count = await manager.revokeAllUserPermissions('user-123');
console.log(`Revoked ${count} permissions`);
```

### Managing Expiration

```typescript
// Extend permission expiration by 7 days
await manager.extendPermission('GRANT-123', 7 * 24 * 60 * 60 * 1000);

// Get expiring permissions
const expiring = await manager.getExpiringPermissions(
  7 * 24 * 60 * 60 * 1000 // Next 7 days
);

// Cleanup expired permissions
const removed = await manager.cleanupExpired();
console.log(`Removed ${removed} expired permissions`);
```

## Running the Demo

```bash
# Compile TypeScript
npm run build

# Run the demo
node dist/examples/permission-manager/demo.js
```

Or with ts-node:

```bash
npx ts-node examples/permission-manager/demo.ts
```

## Demo Output

The demo demonstrates:

1. **Basic Permission Grants**: Permanent and temporary permissions
2. **Permission Checking**: Real-time validation
3. **Resource-Specific Permissions**: Scoped to specific resources
4. **Temporary Permissions**: Auto-expiring after timeout
5. **User Permission Listing**: View all permissions for a user
6. **Expiration Extension**: Extending permission validity
7. **Bulk Operations**: Grant multiple permissions at once
8. **Expiring Permissions Report**: Identify soon-to-expire permissions
9. **Cleanup**: Remove expired permissions
10. **Permission Reports**: Analytics and statistics
11. **Revocation**: Remove user permissions

## Integration Example

### Express.js Middleware

```typescript
import express from 'express';
import { PermissionManager } from 'universal-dj-layer/examples/permission-manager';
import { Permission } from 'universal-dj-layer';

const app = express();
const permissionManager = new PermissionManager();

// Permission check middleware
function requirePermission(permission: Permission, resource?: string) {
  return async (req, res, next) => {
    const userId = req.user.id;
    
    const result = await permissionManager.hasPermission(
      userId,
      permission,
      resource
    );

    if (result.granted) {
      next();
    } else {
      res.status(403).json({
        error: 'Forbidden',
        message: result.reason || 'Insufficient permissions'
      });
    }
  };
}

// Protected routes
app.get('/api/data',
  requirePermission(Permission.READ),
  (req, res) => {
    res.json({ data: 'protected data' });
  }
);

app.post('/api/data',
  requirePermission(Permission.WRITE),
  (req, res) => {
    res.json({ success: true });
  }
);

app.delete('/api/data/:id',
  requirePermission(Permission.DELETE),
  (req, res) => {
    res.json({ success: true });
  }
);

// Resource-specific route
app.put('/api/projects/:projectId/data',
  async (req, res, next) => {
    const result = await permissionManager.hasPermission(
      req.user.id,
      Permission.WRITE,
      `project-${req.params.projectId}`
    );

    if (result.granted) {
      next();
    } else {
      res.status(403).json({ error: 'No access to this project' });
    }
  },
  (req, res) => {
    res.json({ success: true });
  }
);
```

### Admin API

```typescript
// Grant permission endpoint
app.post('/api/admin/permissions/grant', async (req, res) => {
  const { userId, userName, permission, resource, expiresIn, reason } = req.body;
  const adminId = req.user.id;

  try {
    const grant = await permissionManager.grantPermission(
      userId,
      userName,
      permission,
      adminId,
      { resource, expiresIn, reason }
    );

    res.json({ success: true, grant });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List user permissions
app.get('/api/admin/permissions/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const permissions = await permissionManager.getUserPermissions(userId);
  res.json({ permissions });
});

// Permission report
app.get('/api/admin/permissions/report', async (req, res) => {
  const report = await permissionManager.generateReport();
  res.json(report);
});
```

### Scheduled Cleanup

```typescript
import { PermissionManager } from 'universal-dj-layer/examples/permission-manager';

const manager = new PermissionManager();

// Cleanup expired permissions every hour
setInterval(async () => {
  const removed = await manager.cleanupExpired();
  if (removed > 0) {
    console.log(`Cleaned up ${removed} expired permissions`);
  }
}, 60 * 60 * 1000);

// Alert on expiring permissions (7 days warning)
setInterval(async () => {
  const expiring = await manager.getExpiringPermissions(
    7 * 24 * 60 * 60 * 1000
  );
  
  if (expiring.length > 0) {
    console.log(`${expiring.length} permissions expiring in next 7 days`);
    // Send notifications...
  }
}, 24 * 60 * 60 * 1000);
```

## API Reference

### PermissionManager

#### Methods

- `initialize()`: Initialize the permission manager
- `grantPermission(userId, userName, permission, grantedBy, options?)`: Grant a permission
- `revokePermission(grantId)`: Revoke a specific grant
- `hasPermission(userId, permission, resource?)`: Check if user has permission
- `getUserPermissions(userId)`: Get all permissions for a user
- `getPermissionGrants(permission)`: Get all grants for a permission
- `getResourcePermissions(resource)`: Get all permissions for a resource
- `cleanupExpired()`: Remove expired permissions
- `extendPermission(grantId, additionalMs)`: Extend permission expiration
- `getGrant(grantId)`: Get grant by ID
- `getAllGrants()`: Get all grants
- `getExpiringPermissions(withinMs)`: Get permissions expiring soon
- `bulkGrant(grants, grantedBy)`: Grant multiple permissions
- `revokeAllUserPermissions(userId)`: Revoke all permissions for a user
- `generateReport()`: Generate permission statistics
- `cleanup()`: Cleanup resources

### Interfaces

```typescript
interface PermissionGrant {
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

interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  expiresAt?: Date;
  grant?: PermissionGrant;
}

enum Permission {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  DELETE = 'delete',
  CONFIGURE = 'configure'
}
```

## Best Practices

1. **Set Expiration**: Always use expiration for temporary access
2. **Resource Scoping**: Use resource-specific permissions when possible
3. **Regular Cleanup**: Schedule periodic cleanup of expired permissions
4. **Audit Trail**: Log all permission grants and revocations
5. **Least Privilege**: Grant minimum necessary permissions
6. **Monitoring**: Alert on expiring permissions
7. **Bulk Operations**: Use bulk grant for efficiency with multiple users

## Common Patterns

### Temporary Maintenance Access

```typescript
// Grant 2-hour maintenance access
await manager.grantPermission(
  'engineer-123',
  'John Engineer',
  Permission.CONFIGURE,
  'admin-001',
  {
    expiresIn: 2 * 60 * 60 * 1000, // 2 hours
    reason: 'Emergency maintenance',
    metadata: { ticket: 'MAINT-123' }
  }
);
```

### Project Team Permissions

```typescript
// Grant project-scoped permissions to team
await manager.bulkGrant([
  {
    userId: 'user-001',
    userName: 'Alice',
    permission: Permission.WRITE,
    resource: 'project-alpha',
    reason: 'Project lead'
  },
  {
    userId: 'user-002',
    userName: 'Bob',
    permission: Permission.READ,
    resource: 'project-alpha',
    reason: 'Project observer'
  }
], 'admin-001');
```

### Trial Period Access

```typescript
// 30-day trial with full access
const grant = await manager.grantPermission(
  'trial-user-001',
  'Trial User',
  Permission.WRITE,
  'system',
  {
    expiresIn: 30 * 24 * 60 * 60 * 1000,
    reason: '30-day trial period'
  }
);

// Extend trial by 15 days
await manager.extendPermission(grant.id, 15 * 24 * 60 * 60 * 1000);
```

### Permission Escalation

```typescript
// Temporary admin access for incident
async function grantIncidentAccess(userId: string, userName: string, duration: number) {
  return await manager.grantPermission(
    userId,
    userName,
    Permission.CONFIGURE,
    'system',
    {
      expiresIn: duration,
      reason: 'Incident response',
      metadata: {
        incident: 'INC-001',
        escalatedAt: new Date()
      }
    }
  );
}
```

## Related Examples

- [Approval Workflow](../approval-workflow/README.md) - Approval process for permission grants
- [Feature Flags](../feature-flags/README.md) - Feature access control
- [A/B Testing](../ab-testing/README.md) - Experiment permissions

## Architecture

This example demonstrates:
- **Dynamic Permission System**: Runtime permission management
- **Expiration Management**: Time-based permission lifecycle
- **Resource Isolation**: Fine-grained permission control
- **Audit Capability**: Track all permission changes

## Learn More

- [Getting Started Guide](../../docs/GETTING_STARTED.md)
- [Disc Development Guide](../../docs/DISC_DEVELOPMENT.md)
- [API Reference](../../docs/API.md)
