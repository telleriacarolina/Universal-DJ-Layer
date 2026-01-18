# Foundation Infrastructure Documentation

## Overview

The Universal DJ Control Layer's foundation consists of two critical modules that enable reversible changes, observability, and safe experimentation:

- **StateManager**: Point-in-time snapshots and state rollback
- **AuditLog**: Comprehensive audit logging for compliance and debugging

These modules form the backbone for all higher-level features including DJEngine orchestration, policy enforcement, and RBAC.

---

## StateManager

### Purpose

The StateManager provides point-in-time snapshots of system state, enabling:
- Rollback to any previous snapshot
- Diff calculation between states
- Change history tracking
- Event emission for observability

### Architecture

```typescript
import { StateManager } from './core/state-manager';

const stateManager = new StateManager({
  maxSnapshots: 100,         // Maximum snapshots to retain
  enablePersistence: false,  // Enable persistent storage
  storageBackend: 'memory'   // 'memory' | 'file' | 'database'
});
```

### Key Features

#### 1. Snapshot Management

**Create Snapshots**
```typescript
const snapshot = stateManager.createSnapshot({
  reason: 'Before applying feature toggle',
  createdBy: 'user-123'
});

console.log(snapshot.snapshotId);  // snapshot-1234567890-abc123
console.log(snapshot.timestamp);   // 1234567890
console.log(snapshot.activeControls); // ['control-1', 'control-2']
```

**Retrieve Snapshots**
```typescript
// Get specific snapshot
const snapshot = stateManager.getSnapshot('snapshot-123');

// List all snapshots with filters
const snapshots = await stateManager.listSnapshots({
  controlId: 'control-1',
  startTime: Date.now() - 86400000, // Last 24 hours
  endTime: Date.now()
});
```

#### 2. State Rollback

```typescript
// Rollback to a previous state
stateManager.rollbackToSnapshot('snapshot-123');

// The current state is now restored to the snapshot
const currentState = stateManager.getCurrentState();
```

#### 3. State Diff Calculation

```typescript
// Calculate differences between two snapshots
const diffs = await stateManager.diff('snapshot-1', 'snapshot-2');

diffs.forEach(diff => {
  console.log(`${diff.path}: ${diff.type}`);
  // Output: value.nested.property: modified
  // Output: newField: added
  // Output: removedField: removed
});
```

#### 4. Disc Changes

```typescript
import { FeatureDisc } from './discs/feature-disc';

const disc = new FeatureDisc({
  name: 'dark-mode',
  enabled: true
});

// Apply disc changes
const stateChange = stateManager.applyDiscChanges('control-1', disc);

console.log(stateChange.before);  // State before change
console.log(stateChange.after);   // State after change
console.log(stateChange.changeType); // 'apply'

// Revert disc changes
const revertChange = stateManager.revertControlChanges('control-1');
```

#### 5. Cleanup

```typescript
// Remove snapshots older than 30 days
const removedCount = await stateManager.cleanup(30);

console.log(`Removed ${removedCount} old snapshots`);
```

### Event Hooks

StateManager emits events for observability:

```typescript
// Snapshot created
stateManager.on('snapshot-created', (snapshot) => {
  console.log('Snapshot created:', snapshot.snapshotId);
});

// Snapshot restored
stateManager.on('snapshot-restored', ({ snapshotId, snapshot }) => {
  console.log('Rolled back to:', snapshotId);
});

// State changed
stateManager.on('state-changed', (stateChange) => {
  console.log('State changed by:', stateChange.controlId);
});

// Snapshot deleted
stateManager.on('snapshot-deleted', ({ snapshotId, snapshot }) => {
  console.log('Snapshot deleted:', snapshotId);
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxSnapshots` | number | 100 | Maximum number of snapshots to retain |
| `enablePersistence` | boolean | false | Enable persistent storage |
| `storageBackend` | string | 'memory' | Storage backend ('memory', 'file', 'database') |

### Best Practices

1. **Create snapshots before risky operations**
   ```typescript
   const snapshot = stateManager.createSnapshot({ reason: 'Before applying risky change' });
   try {
     applyRiskyChange();
   } catch (error) {
     stateManager.rollbackToSnapshot(snapshot.snapshotId);
   }
   ```

2. **Use metadata for context**
   ```typescript
   stateManager.createSnapshot({
     reason: 'Daily backup',
     createdBy: 'scheduled-task',
     environment: 'production'
   });
   ```

3. **Implement retention policies**
   ```typescript
   // Clean up old snapshots weekly
   setInterval(() => {
     stateManager.cleanup(30); // Keep last 30 days
   }, 7 * 24 * 60 * 60 * 1000);
   ```

### Performance Considerations

- **Deep Cloning**: StateManager uses deep cloning to prevent mutations. This has memory overhead for large state objects.
- **Snapshot Limit**: Configure `maxSnapshots` based on your memory constraints.
- **Circular References**: Handled automatically, but may indicate design issues.
- **Map Operations**: O(1) lookup for snapshots and controls using Map data structures.

---

## AuditLog

### Purpose

The AuditLog provides comprehensive audit logging for all control operations, enabling:
- Compliance and regulatory requirements
- Security analysis and forensics
- Debugging and troubleshooting
- Real-time monitoring

### Architecture

```typescript
import { AuditLog } from './audit/audit-log';

const auditLog = new AuditLog({
  enabled: true,                 // Enable logging
  storage: 'memory',             // 'memory' | 'file' | 'database'
  retentionDays: 365,            // Retention period in days
  includeSensitiveData: false,   // Sanitize sensitive data
  storagePath: './audit-logs'    // Path for file storage
});
```

### Key Features

#### 1. Logging Operations

```typescript
const entryId = await auditLog.log({
  action: 'apply',              // Action type
  actorId: 'user-123',          // Who performed the action
  actorRole: 'admin',           // Actor's role
  controlId: 'ctrl-456',        // Control ID (optional)
  discType: 'FeatureDisc',      // Disc type (optional)
  result: 'success',            // Result: 'success' | 'failure' | 'partial'
  changes: {                    // Changes made (optional)
    before: { enabled: false },
    after: { enabled: true }
  },
  error: 'Error message',       // Error if failed (optional)
  metadata: {                   // Additional metadata (optional)
    duration: 150,
    affectedUsers: 42
  },
  ipAddress: '192.168.1.1',     // IP address (optional)
  userAgent: 'Mozilla/5.0...'   // User agent (optional)
});

console.log('Logged with ID:', entryId);
```

#### 2. Querying

```typescript
// Query with filters
const entries = await auditLog.query({
  actorId: 'user-123',           // Filter by actor
  action: 'apply',               // Filter by action
  result: 'success',             // Filter by result
  controlId: 'ctrl-456',         // Filter by control
  startTime: Date.now() - 86400000, // Time range start
  endTime: Date.now(),           // Time range end
  limit: 50,                     // Pagination limit
  offset: 0,                     // Pagination offset
  sortDirection: 'desc'          // Sort direction: 'asc' | 'desc'
});

entries.forEach(entry => {
  console.log(`${entry.timestamp}: ${entry.actorId} performed ${entry.action}`);
});
```

#### 3. Real-time Streaming

```typescript
// Stream audit events in real-time
await auditLog.stream((entry) => {
  console.log('New audit entry:', entry);
  
  // Send to monitoring system
  if (entry.result === 'failure') {
    alertMonitoringSystem(entry);
  }
});

// Unsubscribe when done
auditLog.unsubscribe(callback);
```

#### 4. Export

```typescript
// Export to JSON
const jsonExport = await auditLog.export('json', {
  actorId: 'user-123',
  startTime: Date.now() - 86400000
});

// Export to CSV
const csvExport = await auditLog.export('csv');

// Save to file
const fs = require('fs');
fs.writeFileSync('audit-export.json', jsonExport);
```

#### 5. Audit Trails

```typescript
// Get complete audit trail for a control
const controlTrail = await auditLog.getControlAuditTrail('ctrl-123');

// Get complete audit trail for an actor
const actorTrail = await auditLog.getActorAuditTrail('user-123');
```

#### 6. Cleanup

```typescript
// Remove entries older than 90 days
const removedCount = await auditLog.cleanup(90);

console.log(`Removed ${removedCount} old audit entries`);
```

### Event Hooks

AuditLog emits events for integration:

```typescript
// Audit entry logged
auditLog.on('audit-logged', (entry) => {
  console.log('Entry logged:', entry.entryId);
});

// Query executed
auditLog.on('audit-query', ({ options, resultCount }) => {
  console.log(`Query returned ${resultCount} results`);
});

// Cleanup performed
auditLog.on('audit-cleanup', ({ removedCount, retentionDays }) => {
  console.log(`Cleaned up ${removedCount} entries (retention: ${retentionDays} days)`);
});
```

### Security Features

#### 1. Sensitive Data Sanitization

```typescript
const secureLog = new AuditLog({ includeSensitiveData: false });

await secureLog.log({
  action: 'apply',
  actorId: 'user-123',
  actorRole: 'admin',
  result: 'success',
  changes: {
    password: 'secret123',      // Will be [REDACTED]
    apiKey: 'key-abc',          // Will be [REDACTED]
    email: 'user@example.com'   // Not sanitized
  }
});
```

Sanitized fields:
- `password`
- `token`
- `secret`
- `apiKey`, `api_key`
- `accessToken`, `access_token`
- `privateKey`, `private_key`
- `ssn`
- `creditCard`, `credit_card`

#### 2. PII Protection

The AuditLog automatically identifies and redacts personally identifiable information when `includeSensitiveData` is `false`.

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | true | Enable audit logging |
| `storage` | string | 'memory' | Storage backend ('memory', 'file', 'database') |
| `retentionDays` | number | 365 | Retention period in days |
| `includeSensitiveData` | boolean | false | Include sensitive data in logs |
| `storagePath` | string | undefined | Custom storage path (for file storage) |

### Best Practices

1. **Log all state-changing operations**
   ```typescript
   try {
     const result = await applyControl(control);
     await auditLog.log({
       action: 'apply',
       actorId: actor.id,
       actorRole: actor.role,
       controlId: control.id,
       result: 'success'
     });
   } catch (error) {
     await auditLog.log({
       action: 'apply',
       actorId: actor.id,
       actorRole: actor.role,
       controlId: control.id,
       result: 'failure',
       error: error.message
     });
   }
   ```

2. **Include context in metadata**
   ```typescript
   await auditLog.log({
     action: 'apply',
     actorId: 'user-123',
     actorRole: 'admin',
     result: 'success',
     metadata: {
       environment: 'production',
       deploymentId: 'deploy-456',
       affectedServices: ['api', 'web'],
       duration: 2500
     }
   });
   ```

3. **Implement retention policies**
   ```typescript
   // Clean up old entries monthly
   setInterval(() => {
     auditLog.cleanup(90); // Keep last 90 days
   }, 30 * 24 * 60 * 60 * 1000);
   ```

4. **Use streaming for real-time alerts**
   ```typescript
   await auditLog.stream((entry) => {
     if (entry.result === 'failure' && entry.actorRole === 'admin') {
       sendSecurityAlert(entry);
     }
   });
   ```

### Performance Considerations

- **Filtering**: Queries use in-memory filtering. For large datasets, consider external database storage.
- **Indexing**: Control ID, Actor ID, and Action type are indexed for fast lookups.
- **Pagination**: Always use pagination for large result sets.
- **Memory**: Configure appropriate retention policies to manage memory usage.

---

## Integration Example

### Complete Workflow

```typescript
import { StateManager } from './core/state-manager';
import { AuditLog } from './audit/audit-log';
import { FeatureDisc } from './discs/feature-disc';

// Initialize
const stateManager = new StateManager({ maxSnapshots: 50 });
const auditLog = new AuditLog({ retentionDays: 30 });

// Hook up events
stateManager.on('state-changed', async (stateChange) => {
  await auditLog.log({
    action: stateChange.changeType === 'apply' ? 'apply' : 'revert',
    actorId: 'system',
    actorRole: 'system',
    controlId: stateChange.controlId,
    result: 'success',
    changes: {
      before: stateChange.before,
      after: stateChange.after
    }
  });
});

// Apply a control
async function applyControl(controlId: string, disc: FeatureDisc, actor: any) {
  // Create snapshot before change
  const snapshot = stateManager.createSnapshot({
    reason: `Before applying ${controlId}`,
    createdBy: actor.id
  });
  
  try {
    // Apply the change
    const stateChange = stateManager.applyDiscChanges(controlId, disc);
    
    // Log success
    await auditLog.log({
      action: 'apply',
      actorId: actor.id,
      actorRole: actor.role,
      controlId,
      discType: disc.constructor.name,
      result: 'success',
      metadata: { snapshotId: snapshot.snapshotId }
    });
    
    return { success: true, stateChange };
  } catch (error) {
    // Rollback on failure
    stateManager.rollbackToSnapshot(snapshot.snapshotId);
    
    // Log failure
    await auditLog.log({
      action: 'apply',
      actorId: actor.id,
      actorRole: actor.role,
      controlId,
      result: 'failure',
      error: error.message
    });
    
    throw error;
  }
}

// Revert a control
async function revertControl(controlId: string, actor: any) {
  try {
    const stateChange = stateManager.revertControlChanges(controlId);
    
    await auditLog.log({
      action: 'revert',
      actorId: actor.id,
      actorRole: actor.role,
      controlId,
      result: 'success'
    });
    
    return { success: true, stateChange };
  } catch (error) {
    await auditLog.log({
      action: 'revert',
      actorId: actor.id,
      actorRole: actor.role,
      controlId,
      result: 'failure',
      error: error.message
    });
    
    throw error;
  }
}

// Query audit trail
async function getControlHistory(controlId: string) {
  const auditTrail = await auditLog.getControlAuditTrail(controlId);
  const stateHistory = stateManager.getControlHistory(controlId);
  
  return {
    audit: auditTrail,
    state: stateHistory
  };
}
```

---

## Error Handling

### StateManager Errors

```typescript
try {
  stateManager.rollbackToSnapshot('invalid-id');
} catch (error) {
  console.error('Snapshot not found:', error.message);
}

try {
  stateManager.revertControlChanges('non-existent');
} catch (error) {
  console.error('Control not found:', error.message);
}
```

### AuditLog Errors

```typescript
try {
  await auditLog.export('invalid-format' as any);
} catch (error) {
  console.error('Unsupported export format:', error.message);
}
```

---

## Testing

Both modules have comprehensive test suites:

- **StateManager**: 43 tests, 91.54% coverage
- **AuditLog**: 43 tests, 98.16% coverage
- **Integration**: 15 tests

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

---

## Future Enhancements

### StateManager
- Database persistence backend
- State compression for memory efficiency
- Incremental snapshots
- Multi-region replication

### AuditLog
- External database integration
- Elasticsearch integration for advanced queries
- Real-time analytics dashboard
- Automated anomaly detection

---

## Support

For issues, questions, or contributions:
- GitHub Issues: [Universal-DJ-Layer/issues](https://github.com/telleriacarolina/Universal-DJ-Layer/issues)
- Documentation: [Universal-DJ-Layer/docs](https://github.com/telleriacarolina/Universal-DJ-Layer/tree/main/docs)

---

## License

MIT © 2026 Carolina Telleria
