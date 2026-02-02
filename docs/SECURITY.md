# Security Guide

Comprehensive security documentation for the Universal DJ Layer.

## Table of Contents

- [Security Overview](#security-overview)
- [RBAC Model](#rbac-model)
- [Role Definitions](#role-definitions)
- [Permission System](#permission-system)
- [Policy Configuration](#policy-configuration)
- [Audit Logging](#audit-logging)
- [Compliance Considerations](#compliance-considerations)
- [Security Best Practices](#security-best-practices)
- [Threat Model](#threat-model)

## Security Overview

The Universal DJ Layer implements multiple security layers to ensure safe, controlled runtime modifications:

### Security Principles

1. **Least Privilege**: Roles have minimum permissions needed
2. **Defense in Depth**: Multiple validation layers
3. **Creator Sovereignty**: Original creators retain ultimate control
4. **Auditability**: Every action is logged
5. **Reversibility**: All changes can be undone
6. **Isolation**: Preview mode runs in sandbox

### Security Guarantees

✅ **Provided:**
- Creator locks cannot be bypassed
- All operations are audited
- Changes are atomic and reversible
- Role permissions are enforced
- Sensitive data is redacted from logs

❌ **Not Provided:**
- Network security (use HTTPS, VPNs)
- Authentication (integrate with your auth system)
- Data encryption at rest (use encrypted storage)
- DDoS protection (use CDN, rate limiting)

## RBAC Model

Role-Based Access Control (RBAC) defines what different actors can do.

### Hierarchy

```
Creator (Level 100)
  └── Admin (Level 80)
        └── Moderator (Level 60)
              └── Collaborator (Level 40)
                    └── User (Level 20)
                          └── Guest (Level 10)
```

### Permission Inheritance

- Higher roles inherit permissions from lower roles
- Creator has all permissions
- Roles cannot escalate privileges
- Permission checks cascade up the hierarchy

### Example Permission Check

```typescript
function checkPermission(role: Role, permission: string): boolean {
  // Direct permission
  if (role.hasPermission(permission)) {
    return true;
  }

  // Check if higher in hierarchy than required level
  const requiredLevel = getPermissionLevel(permission);
  return role.getHierarchyLevel() >= requiredLevel;
}
```

## Role Definitions

### Creator Role

**Level**: 100 (Highest)  
**Description**: Original application creator with veto power

**Permissions:**
- `full-control`: Complete control over application
- `apply-control`: Apply any control
- `revert-control`: Revert any control
- `preview-control`: Preview any control
- `create-lock`: Create creator locks
- `modify-lock`: Modify creator locks
- `delete-lock`: Delete creator locks
- `grant-role`: Grant roles to others
- `revoke-role`: Revoke roles from others
- `view-audit`: View complete audit log
- `modify-policies`: Modify safety policies

**Use Cases:**
- Application owner
- Original developer
- Legal owner of the system

**Example:**

```typescript
import { CreatorRole } from 'universal-dj-layer';

const creator = new CreatorRole({
  userId: 'creator-123',
  ownedResources: ['app-1', 'api-1'],
});

// Creator can do anything
if (creator.hasPermission('full-control')) {
  // Allowed
}
```

### Admin Role

**Level**: 80  
**Description**: Broad permissions but cannot override creator locks

**Permissions:**
- `apply-control`: Apply most controls
- `revert-control`: Revert most controls
- `preview-control`: Preview controls
- `list-controls`: List active controls
- `view-audit`: View audit log
- `grant-role`: Grant limited roles
- `revoke-role`: Revoke limited roles

**Restrictions:**
- Cannot modify creator locks
- Cannot override creator veto
- Cannot delete audit logs
- Cannot modify core policies

**Use Cases:**
- System administrators
- DevOps engineers
- Senior developers

**Example:**

```typescript
import { AdminRole } from 'universal-dj-layer';

const admin = new AdminRole({
  userId: 'admin-456',
  permissions: ['apply-control', 'view-audit'],
});
```

### Moderator Role

**Level**: 60  
**Description**: Content and user management capabilities

**Permissions:**
- `apply-control`: Apply content-related controls
- `revert-control`: Revert content controls
- `preview-control`: Preview controls
- `moderate-content`: Moderate user content
- `manage-users`: Manage user accounts
- `view-reports`: View moderation reports

**Restrictions:**
- Cannot modify system-level controls
- Cannot grant admin permissions
- Limited audit log access

**Use Cases:**
- Community moderators
- Content managers
- Customer support leads

### Collaborator Role

**Level**: 40  
**Description**: Can propose changes but requires approval

**Permissions:**
- `preview-control`: Preview controls
- `propose-control`: Propose changes (requires approval)
- `view-own-controls`: View own controls
- `revert-own-control`: Revert own controls

**Restrictions:**
- Cannot apply controls directly
- Cannot view others' controls
- Cannot access audit log
- Changes require admin approval

**Use Cases:**
- Junior developers
- External contributors
- Beta testers

### User Role

**Level**: 20  
**Description**: Basic interaction, no control modifications

**Permissions:**
- `view-public-info`: View public information
- `use-features`: Use enabled features

**Restrictions:**
- Cannot apply any controls
- Cannot preview controls
- Cannot view audit log
- Cannot access admin features

**Use Cases:**
- End users
- Customers
- General audience

### AI Agent Role

**Level**: Varies (10-80)  
**Description**: Automated operations with strict guardrails

**Permissions:**
- Configurable based on use case
- Typically limited to specific domains
- Subject to rate limiting
- Enhanced audit logging

**Guardrails:**
- Maximum operations per hour
- Require human approval for critical changes
- Cannot modify security policies
- Cannot grant roles

**Use Cases:**
- Automated testing
- Scheduled maintenance
- AI-powered optimizations

**Example:**

```typescript
import { AIAgentRole } from 'universal-dj-layer';

const aiAgent = new AIAgentRole({
  agentId: 'ai-bot-1',
  maxOperationsPerHour: 100,
  allowedDiscTypes: ['feature', 'ui'],
  requireApproval: true,
});
```

## Permission System

### Permission Format

Permissions follow a hierarchical format:

```
<domain>:<action>:<resource>

Examples:
- control:apply:*           # Apply any control
- control:apply:feature     # Apply feature controls only
- control:revert:*          # Revert any control
- audit:view:*              # View all audit logs
- role:grant:collaborator   # Grant collaborator role
```

### Permission Wildcards

- `*`: Matches everything
- `feature:*`: Matches all feature operations
- `*:apply:*`: Matches all apply operations

### Custom Permissions

Define custom permissions for your discs:

```typescript
const customPermissions = [
  'email:send:*',
  'email:send:notification',
  'email:send:marketing',
  'payment:process:*',
  'payment:refund:*',
];

const role = new CustomRole({
  userId: 'user-123',
  permissions: customPermissions,
});
```

### Permission Validation

```typescript
function validatePermission(
  role: Role,
  permission: string,
  resource: string
): boolean {
  // Check exact match
  if (role.hasPermission(permission)) {
    return true;
  }

  // Check wildcard permissions
  const wildcardPermission = permission.split(':').slice(0, -1).join(':') + ':*';
  if (role.hasPermission(wildcardPermission)) {
    return true;
  }

  // Check resource-specific permissions
  const resourcePermission = `${permission}:${resource}`;
  if (role.hasPermission(resourcePermission)) {
    return true;
  }

  return false;
}
```

## Policy Configuration

### Creator Locks

Immutable protections set by the creator that cannot be bypassed.

```typescript
import { PolicyEvaluator } from 'universal-dj-layer';

const policyEvaluator = new PolicyEvaluator();

// Add creator lock
policyEvaluator.addCreatorLock('core-security', 'creator-123');

// Check if locked
const isLocked = policyEvaluator.isCreatorLocked('core-security');
// Returns: true

// Attempt to modify (will fail)
try {
  await dj.applyControl(securityDisc, adminRole);
} catch (error) {
  // Error: Resource is creator-locked
}
```

### Safety Policies

Prevent dangerous operations:

```typescript
const safetyPolicy = {
  name: 'prevent-unlimited-access',
  evaluate: (context) => {
    // Block controls that grant unlimited access
    if (context.disc.type === 'permission' &&
        context.disc.config.level === 'unlimited') {
      return {
        allowed: false,
        reason: 'Unlimited access is not permitted',
      };
    }
    return { allowed: true };
  },
};

policyEvaluator.registerPolicy(safetyPolicy);
```

### Anti-Abuse Policies

Rate limiting and suspicious activity detection:

```typescript
const antiAbusePolicy = {
  name: 'rate-limit-controls',
  maxControlsPerHour: 10,
  maxControlsPerDay: 50,
  
  evaluate: (context) => {
    const recentControls = getRecentControls(context.actorId);
    
    if (recentControls.lastHour > this.maxControlsPerHour) {
      return {
        allowed: false,
        reason: 'Hourly rate limit exceeded',
      };
    }
    
    if (recentControls.lastDay > this.maxControlsPerDay) {
      return {
        allowed: false,
        reason: 'Daily rate limit exceeded',
      };
    }
    
    return { allowed: true };
  },
};
```

### Compliance Policies

Enforce regulatory requirements:

```typescript
const compliancePolicy = {
  name: 'gdpr-compliance',
  
  evaluate: (context) => {
    // Require audit logging for all operations
    if (!context.auditEnabled) {
      return {
        allowed: false,
        reason: 'Audit logging required for compliance',
      };
    }
    
    // Prevent modification of user data without consent
    if (context.disc.affectsUserData &&
        !context.hasUserConsent) {
      return {
        allowed: false,
        reason: 'User consent required',
      };
    }
    
    return { allowed: true };
  },
};
```

## Audit Logging

### What Gets Logged

Every operation is logged with:
- Action performed
- Actor ID and role
- Timestamp
- Control ID (if applicable)
- Result (success/failure)
- Changes made (before/after)
- IP address and user agent
- Error details (if failed)

### Sensitive Data Redaction

Sensitive fields are automatically redacted:

```typescript
const auditLog = new AuditLog({
  includeSensitiveData: false,
  sensitiveFields: [
    'password',
    'token',
    'secret',
    'apiKey',
    'privateKey',
    'ssn',
    'creditCard',
  ],
});

// Before logging
const changes = {
  email: 'user@example.com',
  password: 'secret123',
  apiKey: 'sk_live_abc123',
};

// After redaction
// {
//   email: 'user@example.com',
//   password: '[REDACTED]',
//   apiKey: '[REDACTED]',
// }
```

### Audit Log Retention

Configure retention policies:

```typescript
const auditLog = new AuditLog({
  retentionDays: 365,  // Keep for 1 year
});

// Periodic cleanup
setInterval(async () => {
  await auditLog.cleanup(365);
}, 24 * 60 * 60 * 1000);
```

### Real-Time Monitoring

Stream audit events for security monitoring:

```typescript
const unsubscribe = await auditLog.stream((entry) => {
  // Alert on suspicious activity
  if (entry.result === 'failure' && entry.error?.includes('permission')) {
    alertSecurity({
      severity: 'high',
      message: `Unauthorized access attempt by ${entry.actorId}`,
      entry,
    });
  }

  // Monitor high-privilege operations
  if (entry.actorRole === 'admin' && entry.action === 'apply') {
    notifySecurityTeam(entry);
  }

  // Track anomalies
  if (isAnomalous(entry)) {
    flagForReview(entry);
  }
});
```

### Audit Export

Export audit logs for compliance:

```typescript
// Export as JSON
const jsonExport = await auditLog.export('json', {
  startTime: Date.now() - (90 * 24 * 60 * 60 * 1000), // Last 90 days
});

// Export as CSV for spreadsheet analysis
const csvExport = await auditLog.export('csv');

// Save to secure storage
await secureStorage.save('audit-export-2026-01.json', jsonExport);
```

## Compliance Considerations

### GDPR

**Right to Access:**
```typescript
async function exportUserData(userId: string) {
  // Export all audit entries for user
  const entries = await auditLog.query({ actorId: userId });
  
  // Export user's controls
  const controls = await dj.listControls({ actorId: userId });
  
  return { entries, controls };
}
```

**Right to Erasure:**
```typescript
async function deleteUserData(userId: string) {
  // Revert all user's controls
  const controls = await dj.listControls({ actorId: userId });
  for (const control of controls) {
    await dj.revertControl(control.controlId, systemRole);
  }
  
  // Anonymize audit entries
  await auditLog.anonymizeUser(userId);
}
```

### SOC 2

**Access Control:**
- Role-based permissions enforced
- Least privilege principle applied
- Regular permission audits

**Audit Logging:**
- All operations logged
- Logs are immutable
- Retention policies enforced

**Change Management:**
- Preview before apply
- Rollback capabilities
- Full change history

### HIPAA

**Protected Health Information (PHI):**
```typescript
// Redact PHI from audit logs
const auditLog = new AuditLog({
  includeSensitiveData: false,
  sensitiveFields: [
    'ssn',
    'dateOfBirth',
    'medicalRecordNumber',
    'healthPlanNumber',
  ],
});
```

**Access Controls:**
- Minimum necessary access
- Unique user identification
- Automatic logoff
- Audit controls

## Security Best Practices

### 1. Use Strong Authentication

Integrate with secure authentication systems:

```typescript
// Example with JWT
import jwt from 'jsonwebtoken';

function authenticateUser(token: string): User {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded as User;
  } catch (error) {
    throw new Error('Invalid authentication token');
  }
}
```

### 2. Validate All Inputs

Never trust user input:

```typescript
function validateDiscConfig(config: any): boolean {
  // Check required fields
  if (!config.name || typeof config.name !== 'string') {
    return false;
  }

  // Sanitize strings
  config.name = sanitizeString(config.name);

  // Validate data types
  if (config.maxUsers && typeof config.maxUsers !== 'number') {
    return false;
  }

  // Check ranges
  if (config.maxUsers < 0 || config.maxUsers > 10000) {
    return false;
  }

  return true;
}
```

### 3. Use HTTPS in Production

Always use HTTPS for API communication:

```typescript
if (process.env.NODE_ENV === 'production') {
  if (!request.secure) {
    throw new Error('HTTPS required in production');
  }
}
```

### 4. Implement Rate Limiting

Prevent abuse with rate limiting:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

app.use('/api/controls', limiter);
```

### 5. Regular Security Audits

Periodically review:
- Role assignments
- Permission grants
- Audit logs for suspicious activity
- Creator locks
- Policy configurations

```typescript
async function securityAudit() {
  // Review high-privilege roles
  const admins = await listUsersByRole('admin');
  console.log('Admin users:', admins);

  // Check for failed access attempts
  const failures = await auditLog.query({
    result: 'failure',
    startTime: Date.now() - (7 * 24 * 60 * 60 * 1000),
  });
  console.log('Failed operations:', failures.length);

  // Review creator locks
  const locks = await policyEvaluator.listCreatorLocks();
  console.log('Active creator locks:', locks.length);
}
```

### 6. Secure Environment Variables

Store secrets securely:

```bash
# .env.example
DJ_ENGINE_CREATOR_ID=
AUDIT_LOG_RETENTION_DAYS=365
JWT_SECRET=
DATABASE_URL=
ENCRYPTION_KEY=
```

Never commit actual secrets to version control.

### 7. Implement Monitoring

Monitor for security events:

```typescript
stateManager.on('state-changed', (change) => {
  if (isCriticalChange(change)) {
    alertSecurityTeam({
      type: 'critical-change',
      change,
      timestamp: Date.now(),
    });
  }
});

auditLog.on('audit-logged', (entry) => {
  if (entry.result === 'failure') {
    incrementFailureCounter(entry.actorId);
    
    if (getFailureCount(entry.actorId) > 5) {
      blockUser(entry.actorId);
    }
  }
});
```

## Threat Model

### Threats Addressed

✅ **Mitigated:**
- Unauthorized control application
- Privilege escalation
- Unaudited changes
- Irreversible modifications
- Creator lock bypass attempts

### Threats Not Addressed

❌ **Out of Scope:**
- Network attacks (DDoS, MITM)
- Authentication vulnerabilities
- Database security
- OS-level exploits
- Physical security

### Attack Scenarios

**Scenario 1: Unauthorized Control Application**
- **Attack**: User tries to apply control without permission
- **Mitigation**: Role permission check before apply
- **Result**: Operation blocked, logged

**Scenario 2: Privilege Escalation**
- **Attack**: User attempts to grant themselves admin role
- **Mitigation**: Only higher roles can grant permissions
- **Result**: Operation blocked, logged

**Scenario 3: Creator Lock Bypass**
- **Attack**: Admin tries to modify creator-locked resource
- **Mitigation**: Creator locks enforced at policy layer
- **Result**: Operation blocked, logged

**Scenario 4: Audit Log Tampering**
- **Attack**: Attacker tries to delete audit entries
- **Mitigation**: Audit log is append-only
- **Result**: Deletion blocked, attempt logged

## See Also

- [Getting Started Guide](./GETTING_STARTED.md)
- [API Documentation](./API.md)
- [Disc Development Guide](./DISC_DEVELOPMENT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

## License

MIT © 2026 Carolina Telleria
