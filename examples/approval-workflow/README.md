# Approval Workflow Example

A complete multi-step approval workflow implementation with configurable rules, role-based permissions, and progress tracking.

## Features

- 🔐 **Role-Based Approval**: Different roles can approve requests
- 📊 **Multi-Step Workflows**: Require multiple approvals for critical changes
- ⚡ **Auto-Approval**: Automatic approval for low-risk changes
- 🎯 **Conditional Rules**: Match requests to rules based on context
- 📈 **Progress Tracking**: Monitor approval progress in real-time
- ⏰ **Expiration**: Set time limits for pending approvals
- 🔍 **Approval Dashboard**: View and manage all requests

## Usage

### Basic Setup

```typescript
import { WorkflowEngine } from './examples/approval-workflow';
import { Role } from './src/core/types';

const engine = new WorkflowEngine();
await engine.initialize();
```

### Creating Approval Requests

```typescript
// Create a simple configuration change request
const request = await engine.createRequest(
  'Update API Rate Limit',
  'Increase rate limit from 100 to 200 requests/min',
  'alice',
  Role.EXPERIMENTER,
  { ruleId: 'config-change' }
);

// Request with expiration
const urgentRequest = await engine.createRequest(
  'Emergency Hotfix',
  'Fix critical security vulnerability',
  'bob',
  Role.ADMIN,
  { 
    ruleId: 'critical-change',
    expiresIn: 3600000 // 1 hour
  }
);
```

### Approving Requests

```typescript
// Approve a request
await engine.approve(
  request.id,
  'admin1',
  Role.ADMIN,
  'Looks good to me'
);

// Check progress
const progress = engine.getProgress(request.id);
console.log(`Progress: ${progress.current}/${progress.required}`);
// Output: Progress: 1/1
```

### Rejecting Requests

```typescript
// Reject with reason
await engine.reject(
  request.id,
  'owner1',
  Role.OWNER,
  'Need more details about performance impact'
);
```

### Cancelling Requests

```typescript
// Only requester can cancel
await engine.cancel(request.id, 'alice');
```

## Pre-defined Approval Rules

### Config Change
- **Required Approvers**: 1
- **Allowed Roles**: ADMIN, OWNER
- **Use Case**: Standard configuration changes

### Critical Change
- **Required Approvers**: 2
- **Allowed Roles**: ADMIN, OWNER
- **Use Case**: High-impact changes (database schema, production config)

### Feature Release
- **Required Approvers**: 1
- **Allowed Roles**: OWNER
- **Use Case**: New feature deployments

### Minor Change
- **Required Approvers**: 0 (auto-approved)
- **Allowed Roles**: EXPERIMENTER, ADMIN, OWNER
- **Auto-Approve Condition**: changeSize === 'minor'
- **Use Case**: Typo fixes, documentation updates

### Data Modification
- **Required Approvers**: 1
- **Allowed Roles**: ADMIN, OWNER
- **Condition**: operation === 'modify'
- **Use Case**: Data updates and modifications

### Deletion
- **Required Approvers**: 2
- **Allowed Roles**: OWNER
- **Condition**: operation === 'delete'
- **Use Case**: Permanent data deletion

### Bulk Operation
- **Required Approvers**: 1
- **Allowed Roles**: ADMIN, OWNER
- **Condition**: itemCount > 10
- **Use Case**: Operations affecting multiple items

### High Risk Change
- **Required Approvers**: 3
- **Allowed Roles**: ADMIN, OWNER
- **Use Case**: Maximum scrutiny for highest-risk changes

## Custom Approval Rules

```typescript
import { ApprovalRule } from './examples/approval-workflow';

// Define custom rule
const customRule: ApprovalRule = {
  id: 'security-review',
  name: 'Security Review',
  description: 'Requires security team approval',
  requiredApprovers: 2,
  allowedRoles: [Role.ADMIN, Role.OWNER],
  conditions: [
    {
      field: 'category',
      operator: 'equals',
      value: 'security'
    }
  ]
};

// Register custom rule
engine.registerRule(customRule);

// Use custom rule
const request = await engine.createRequest(
  'Update Security Policy',
  'Strengthen password requirements',
  'security-lead',
  Role.ADMIN,
  { category: 'security' }
);
```

## Conditional Matching

Rules can automatically match based on request context:

```typescript
// Automatic rule matching
const request = await engine.createRequest(
  'Delete User Accounts',
  'Remove 100 inactive accounts',
  'admin',
  Role.ADMIN,
  {
    operation: 'delete',
    itemCount: 100
  }
);
// Automatically matches 'deletion' rule (operation === 'delete')
```

### Supported Operators

- `equals`: Exact match
- `notEquals`: Not equal
- `greaterThan`: Numeric comparison
- `lessThan`: Numeric comparison
- `contains`: Array includes value

## Running the Demo

```bash
# Compile TypeScript
npm run build

# Run the demo
node dist/examples/approval-workflow/demo.js
```

Or with ts-node:

```bash
npx ts-node examples/approval-workflow/demo.ts
```

## Demo Output

The demo demonstrates:

1. **Simple Configuration Change**: Single approval required
2. **Critical Change**: Multiple approvals required with progress tracking
3. **Auto-Approved Minor Change**: Automatic approval for low-risk changes
4. **Rejected Request**: Rejection with reason
5. **Cancelled Request**: Requester cancellation
6. **Custom Approval Rule**: Registering and using custom rules
7. **Approval Dashboard**: Summary of all requests
8. **Approver View**: Filtering requests by role
9. **Bulk Operation**: Condition-based rule matching

## Integration Example

### Express.js Integration

```typescript
import express from 'express';
import { WorkflowEngine } from 'universal-dj-layer/examples/approval-workflow';
import { Role } from 'universal-dj-layer';

const app = express();
const engine = new WorkflowEngine();

app.post('/api/approvals/request', async (req, res) => {
  const { title, description, context } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const request = await engine.createRequest(
      title,
      description,
      userId,
      userRole,
      context
    );

    res.json({ success: true, request });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/approvals/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    await engine.approve(id, userId, userRole, comment);
    const request = engine.getRequest(id);
    res.json({ success: true, request });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/approvals/pending', async (req, res) => {
  const userRole = req.user.role;
  const requests = engine.getRequestsForApprover(userRole);
  res.json({ requests });
});
```

### Scheduled Expiration Check

```typescript
import { WorkflowEngine } from 'universal-dj-layer/examples/approval-workflow';

const engine = new WorkflowEngine();

// Check for expired requests every 5 minutes
setInterval(async () => {
  const expiredCount = await engine.checkExpiredRequests();
  if (expiredCount > 0) {
    console.log(`Expired ${expiredCount} approval requests`);
    // Send notifications...
  }
}, 5 * 60 * 1000);
```

## API Reference

### WorkflowEngine

#### Methods

- `initialize()`: Initialize the workflow engine
- `registerRule(rule)`: Register a custom approval rule
- `createRequest(title, description, requestedBy, requestedByRole, context?)`: Create approval request
- `approve(requestId, approver, approverRole, comment?)`: Approve a request
- `reject(requestId, rejector, rejectorRole, reason)`: Reject a request
- `cancel(requestId, cancelledBy)`: Cancel a request
- `getRequest(requestId)`: Get request by ID
- `getAllRequests()`: Get all requests
- `getPendingRequests()`: Get pending requests
- `getRequestsByStatus(status)`: Get requests by status
- `getRequestsForApprover(approverRole)`: Get requests for a specific role
- `checkExpiredRequests()`: Check and expire old requests
- `getProgress(requestId)`: Get approval progress
- `cleanup()`: Cleanup resources

### Interfaces

```typescript
interface ApprovalRule {
  id: string;
  name: string;
  description: string;
  requiredApprovers: number;
  allowedRoles: Role[];
  autoApprove?: (context: any) => boolean;
  conditions?: ApprovalCondition[];
}

interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedByRole: Role;
  requestedAt: Date;
  status: ApprovalStatus;
  rule: ApprovalRule;
  approvals: Approval[];
  rejections: Rejection[];
  expiresAt?: Date;
  context: any;
}

enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}
```

## Best Practices

1. **Clear Descriptions**: Provide detailed descriptions for approval requests
2. **Set Expiration**: Use expiration for time-sensitive requests
3. **Custom Rules**: Create custom rules for organization-specific workflows
4. **Audit Trail**: Log all approvals and rejections
5. **Notifications**: Send notifications to approvers
6. **Progress Tracking**: Display progress to requesters
7. **Role Validation**: Verify user roles before creating requests

## Common Patterns

### Emergency Approval

```typescript
// Fast-track critical requests
const customRule: ApprovalRule = {
  id: 'emergency',
  name: 'Emergency',
  description: 'Single admin approval for emergencies',
  requiredApprovers: 1,
  allowedRoles: [Role.ADMIN, Role.OWNER],
  autoApprove: (context) => context.severity === 'P0'
};
```

### Escalation

```typescript
// Escalate to higher role if not approved in time
async function checkEscalation(requestId: string) {
  const request = engine.getRequest(requestId);
  const hoursSincePending = 
    (Date.now() - request.requestedAt.getTime()) / 3600000;

  if (hoursSincePending > 24 && request.status === 'pending') {
    // Escalate to owners
    await notifyOwners(request);
  }
}
```

### Approval Chain

```typescript
// Create dependent approvals
const designRequest = await engine.createRequest(
  'Design Review',
  'Review new UI design',
  'designer',
  Role.EXPERIMENTER,
  { ruleId: 'config-change' }
);

if (designRequest.status === ApprovalStatus.APPROVED) {
  const implRequest = await engine.createRequest(
    'Implementation',
    'Implement approved design',
    'developer',
    Role.EXPERIMENTER,
    { ruleId: 'feature-release' }
  );
}
```

## Related Examples

- [Permission Manager](../permission-manager/README.md) - Dynamic permission management
- [Feature Flags](../feature-flags/README.md) - Feature rollout control
- [A/B Testing](../ab-testing/README.md) - Experiment approval workflows

## Architecture

This example demonstrates:
- **Rule-Based Engine**: Flexible rule matching system
- **Role-Based Access Control**: Integration with RBAC system
- **State Management**: Request lifecycle management
- **Event-Driven**: Approval events and notifications

## Learn More

- [Getting Started Guide](../../docs/GETTING_STARTED.md)
- [Disc Development Guide](../../docs/DISC_DEVELOPMENT.md)
- [API Reference](../../docs/API.md)
