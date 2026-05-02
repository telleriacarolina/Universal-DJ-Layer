# Foundation Implementation: StateManager & AuditLog

This document provides comprehensive documentation for the core infrastructure modules that form the backbone of the Universal DJ Control Layer.

## Table of Contents

1. [Overview](#overview)
2. [StateManager](#statemanager)
3. [AuditLog](#auditlog)
4. [Integration](#integration)
5. [Best Practices](#best-practices)
6. [Performance Considerations](#performance-considerations)

---

## Overview

The Foundation modules provide:

- **StateManager**: Point-in-time snapshots, rollback capabilities, and change tracking
- **AuditLog**: Comprehensive audit trail with filtering, streaming, and export capabilities

These modules enable:
- Reversible changes through state snapshots
- Full observability of all operations
- Compliance and security through comprehensive audit logging
- Safe experimentation without risk

---

## StateManager

The StateManager provides state management with snapshot and rollback capabilities, enabling safe experimentation and change tracking.

### Architecture

```typescript
import { StateManager } from './core/state-manager';

const stateManager = new StateManager({
  maxSnapshots: 100,          // Maximum number of snapshots to retain
  enablePersistence: false,    // Enable persistent storage
  storageBackend: 'memory',    // 'memory' | 'file' | 'database'
  enableCache: true,           // Enable caching for performance (default: true)
  cacheTTL: 300000            // Cache TTL in milliseconds (default: 5 minutes)
});
```

### Key Features

1. **Snapshot Creation**: Create point-in-time snapshots of system state
2. **Rollback**: Restore to any previous snapshot
3. **Diff Calculation**: Compare two snapshots to see changes
4. **Change Tracking**: Track all state changes with metadata
5. **Event Emission**: Real-time notifications for state changes
6. **Retention Policies**: Automatic cleanup of old snapshots

### Basic Usage

#### Creating Snapshots

```typescript
// Create a snapshot with optional metadata
const snapshot = await stateManager.createSnapshot({
  reason: 'before major feature deployment',
  author: 'admin@example.com'
});

console.log('Snapshot created:', snapshot.snapshotId);
```

#### Applying Changes

```typescript
// Apply disc changes to state
const change = await stateManager.applyDiscChanges('control-123', {
  feature: 'darkMode',
  enabled: true,
  settings: { theme: 'midnight' }
});

console.log('Change applied:', change.controlId);
```

#### Rolling Back

```typescript
// Rollback to a previous snapshot
await stateManager.rollbackToSnapshot(snapshot.snapshotId);
console.log('State restored to snapshot:', snapshot.snapshotId);
```

#### Calculating Diffs

```typescript
// Compare two snapshots
const diffs = await stateManager.diff(snapshotA.snapshotId, snapshotB.snapshotId);

diffs.forEach(diff => {
  console.log(`${diff.path}: ${diff.type}`);
  if (diff.type === 'modified') {
    console.log(`  Before: ${diff.before}`);
    console.log(`  After: ${diff.after}`);
  }
});
```

### Event Hooks

StateManager emits events for observability:

```typescript
// Listen for snapshot creation
stateManager.on('snapshot-created', (snapshot) => {
  console.log('New snapshot:', snapshot.snapshotId);
});

// Listen for state changes
stateManager.on('state-changed', (change) => {
  console.log('State changed by control:', change.controlId);
});

// Listen for rollbacks
stateManager.on('snapshot-restored', (snapshotId) => {
  console.log('Restored to snapshot:', snapshotId);
});

// Listen for snapshot deletion
stateManager.on('snapshot-deleted', (snapshotId) => {
  console.log('Snapshot deleted:', snapshotId);
});
```

### Advanced Usage

#### Filtering Snapshots

```typescript
// Get snapshots for a specific control
const controlSnapshots = await stateManager.listSnapshots({
  controlId: 'control-123'
});

// Get snapshots within a time range
const recentSnapshots = await stateManager.listSnapshots({
  startTime: Date.now() - 86400000, // Last 24 hours
  endTime: Date.now()
});
```

#### Cleanup

```typescript
// Remove snapshots older than 30 days
const removed = await stateManager.cleanup(30);
console.log(`Removed ${removed} old snapshots`);
```

#### Control State Management

```typescript
// Get state for a specific control
const controlState = stateManager.getControlState('control-123');

// Get change history for a control
const history = stateManager.getControlHistory('control-123');

// Revert a specific control's changes
const revertChange = await stateManager.revertControlChanges('control-123');
```

---

## AuditLog

The AuditLog provides comprehensive audit logging for all operations with filtering, streaming, and export capabilities.

### Architecture

```typescript
import { AuditLog } from './audit/audit-log';

const auditLog = new AuditLog({
  enabled: true,                   // Enable/disable logging
  storage: 'memory',               // 'memory' | 'file' | 'database'
  retentionDays: 365,              // Retention period
  includeSensitiveData: false,     // Sanitize sensitive data
  storagePath: './audit-logs',     // Custom storage path (for file storage)
  enableCache: true,               // Enable caching for performance (default: true)
  cacheTTL: 60000                  // Cache TTL in milliseconds (default: 1 minute)
});
```

### Key Features

1. **Comprehensive Logging**: Record all operations with full context
2. **Flexible Filtering**: Query by actor, action, time, result, etc.
3. **Real-time Streaming**: Subscribe to audit events
4. **Export**: Export to JSON or CSV formats
5. **Security**: Automatic PII/sensitive data redaction
6. **Retention Policies**: Automatic cleanup of old entries

### Basic Usage

#### Logging Operations

```typescript
// Log a successful operation
const entryId = await auditLog.log({
  action: 'apply',
  actorId: 'user-123',
  actorRole: 'admin',
  controlId: 'control-456',
  discType: 'feature',
  result: 'success',
  changes: {
    before: { enabled: false },
    after: { enabled: true }
  },
  metadata: {
    reason: 'feature rollout'
  }
});

// Log a failed operation
await auditLog.log({
  action: 'revert',
  actorId: 'user-789',
  actorRole: 'user',
  controlId: 'control-456',
  result: 'failure',
  error: 'Insufficient permissions',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});
```

#### Querying Audit Log

```typescript
// Get all entries for a specific user
const userEntries = await auditLog.query({
  actorId: 'user-123',
  sortDirection: 'desc'
});

// Filter by action type
const applyActions = await auditLog.query({
  action: 'apply',
  result: 'success',
  limit: 50
});

// Filter by time range
const todayEntries = await auditLog.query({
  startTime: Date.now() - 86400000,
  endTime: Date.now()
});

// Paginated query
const page1 = await auditLog.query({ limit: 20, offset: 0 });
const page2 = await auditLog.query({ limit: 20, offset: 20 });
```

#### Real-time Streaming

```typescript
// Subscribe to audit events
const unsubscribe = await auditLog.stream((entry) => {
  console.log('New audit entry:', {
    action: entry.action,
    actor: entry.actorId,
    result: entry.result
  });

  // Send to external monitoring system
  if (entry.result === 'failure') {
    alertingSystem.send(entry);
  }
});

// Later: unsubscribe from stream
unsubscribe();
```

#### Export

```typescript
// Export to JSON
const jsonExport = await auditLog.export('json', {
  actorId: 'user-123',
  startTime: Date.now() - 86400000
});

// Export to CSV
const csvExport = await auditLog.export('csv', {
  action: 'apply',
  result: 'failure'
});

// Save to file
fs.writeFileSync('audit-log.json', jsonExport);
```

### Event Hooks

AuditLog emits events for observability:

```typescript
// Listen for new log entries
auditLog.on('audit-logged', (entry) => {
  console.log('Logged:', entry.action, 'by', entry.actorId);
});

// Listen for queries
auditLog.on('audit-query', (options) => {
  console.log('Query executed:', options);
});

// Listen for cleanup
auditLog.on('audit-cleanup', (info) => {
  console.log(`Cleaned up ${info.removed} entries`);
});
```

### Security Features

#### Sensitive Data Sanitization

When `includeSensitiveData: false`, the following fields are automatically redacted:

- password, userPassword
- token, apiKey, apiToken
- secret, privateKey
- ssn, socialSecurityNumber
- creditCard, cardNumber

```typescript
await auditLog.log({
  action: 'apply',
  actorId: 'user-123',
  actorRole: 'admin',
  result: 'success',
  changes: {
    password: 'secret123',      // Will be '[REDACTED]'
    apiKey: 'abc-def-ghi',      // Will be '[REDACTED]'
    username: 'john_doe'        // Will NOT be redacted
  }
});
```

---

## Integration

### StateManager + AuditLog Integration

Combining both modules provides comprehensive observability and safety:

```typescript
import { StateManager } from './core/state-manager';
import { AuditLog } from './audit/audit-log';

const stateManager = new StateManager();
const auditLog = new AuditLog();

// Apply a change with full audit trail
async function applyControlWithAudit(controlId, disc, actor) {
  // Create snapshot before change
  const beforeSnapshot = await stateManager.createSnapshot({
    reason: 'before applying control',
    controlId
  });

  await auditLog.log({
    action: 'apply',
    actorId: actor.id,
    actorRole: actor.role,
    controlId,
    result: 'success',
    metadata: { snapshotId: beforeSnapshot.snapshotId }
  });

  try {
    // Apply the change
    const change = await stateManager.applyDiscChanges(controlId, disc);

    await auditLog.log({
      action: 'apply',
      actorId: actor.id,
      actorRole: actor.role,
      controlId,
      result: 'success',
      changes: {
        before: change.before,
        after: change.after
      }
    });

    return { success: true, change };
  } catch (error) {
    // Rollback on failure
    await stateManager.rollbackToSnapshot(beforeSnapshot.snapshotId);

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
```

---

## Performance & Caching

### Caching Layer

Both StateManager and AuditLog include built-in caching capabilities to improve performance for repeated queries and reduce redundant computations.

#### StateManager Caching

StateManager caches:
- Snapshot retrievals by snapshot ID
- Filtered query results (by control ID, time range)

```typescript
// Enable caching with custom TTL
const stateManager = new StateManager({
  maxSnapshots: 100,
  enableCache: true,        // Enable caching (default: true)
  cacheTTL: 300000          // 5 minutes TTL (default)
});

// Get cache statistics
const stats = stateManager.getCacheStats();
console.log('Snapshot cache hit rate:', stats.snapshots.hitRate);
console.log('Query cache hit rate:', stats.queries.hitRate);

// Listen for cache events
stateManager.on('cache-hit', ({ type, key }) => {
  console.log(`Cache hit for ${type}: ${key}`);
});

stateManager.on('cache-miss', ({ type, key }) => {
  console.log(`Cache miss for ${type}: ${key}`);
});
```

Cache invalidation happens automatically:
- When new snapshots are created
- When state changes are applied
- When rollbacks occur
- When control changes are reverted
- When cleanup removes snapshots

```typescript
// Manual cache management
const stats = stateManager.getCacheStats();
console.log(`Snapshot cache: ${stats.snapshots.size} entries, ${stats.snapshots.hitRate}% hit rate`);
console.log(`Query cache: ${stats.queries.size} entries, ${stats.queries.hitRate}% hit rate`);

// Cleanup resources when done
stateManager.destroy();
```

#### AuditLog Caching

AuditLog caches query results based on filter parameters:

```typescript
// Enable caching with custom TTL
const auditLog = new AuditLog({
  enabled: true,
  storage: 'memory',
  enableCache: true,        // Enable caching (default: true)
  cacheTTL: 60000          // 1 minute TTL (default for audit logs)
});

// Get cache statistics
const stats = auditLog.getCacheStats();
console.log('Query cache hit rate:', stats.hitRate);
console.log('Cache size:', stats.size);

// Listen for cache events
auditLog.on('cache-hit', ({ type, key }) => {
  console.log(`Cache hit for query: ${key}`);
});

auditLog.on('cache-miss', ({ type, key }) => {
  console.log(`Cache miss for query: ${key}`);
});
```

Cache invalidation happens automatically:
- When new log entries are added
- When cleanup removes entries

```typescript
// The same query will hit cache on subsequent calls
const entries1 = await auditLog.query({ actorId: 'user-123' }); // Cache miss
const entries2 = await auditLog.query({ actorId: 'user-123' }); // Cache hit

// Different queries are cached separately
const entriesA = await auditLog.query({ action: 'apply' });
const entriesB = await auditLog.query({ action: 'revert' });

// Cleanup resources when done
auditLog.destroy();
```

#### Cache Configuration Best Practices

1. **TTL Selection**:
   - StateManager: 5-15 minutes (default: 5 minutes)
   - AuditLog: 30-60 seconds (default: 1 minute)
   - Adjust based on your update frequency

2. **Memory Management**:
   - Monitor cache sizes in production
   - Set appropriate TTLs to prevent unbounded growth
   - Use `destroy()` to cleanup resources when done

3. **Disable When Needed**:
   ```typescript
   // Disable caching if not needed
   const manager = new StateManager({ enableCache: false });
   const log = new AuditLog({ enableCache: false });
   ```

4. **Monitor Performance**:
   ```typescript
   // Periodically log cache statistics
   setInterval(() => {
     const stats = stateManager.getCacheStats();
     console.log('StateManager cache stats:', {
       snapshotHitRate: stats.snapshots.hitRate,
       queryHitRate: stats.queries.hitRate
     });
   }, 60000);
   ```

---

## Best Practices

### StateManager

1. **Create snapshots before major changes**: Always create a snapshot before applying significant changes
2. **Use meaningful metadata**: Include context in snapshot metadata for easier debugging
3. **Set appropriate retention**: Balance between history depth and storage requirements
4. **Handle rollback failures**: Implement error handling for rollback operations
5. **Deep clone considerations**: Be aware that deep cloning large objects can be expensive

### AuditLog

1. **Log all operations**: Don't skip logging even for "minor" operations
2. **Include context**: Always include actor information, timestamps, and relevant metadata
3. **Use appropriate retention**: Compliance requirements may dictate minimum retention periods
4. **Sanitize sensitive data**: Never log passwords, tokens, or PII unless absolutely necessary
5. **Monitor audit logs**: Set up alerts for suspicious patterns or failures

---

## Testing

Both modules include comprehensive test suites with >90% coverage:

```bash
# Run StateManager tests
npm test -- core/state-manager.test.ts

# Run StateManager caching tests
npm test -- core/state-manager-cache.test.ts

# Run AuditLog tests
npm test -- audit/audit-log.test.ts

# Run AuditLog caching tests
npm test -- audit/audit-log-cache.test.ts

# Run Cache module tests
npm test -- core/cache.test.ts

# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

---

## Next Steps

With StateManager and AuditLog implemented, you can now:

1. **Phase 2**: Implement Policy & Safety Layer (PolicyEvaluator, Guardrails)
2. **Phase 3**: Build DJEngine orchestration
3. **Phase 4**: Implement Disc types (Feature, Permission, Behavior, Flow, UI)
4. **Phase 5**: Create API layer and integration hooks

---

**Version:** 1.0.0  
**Last Updated:** January 2026  
**Status:** ✅ Complete
