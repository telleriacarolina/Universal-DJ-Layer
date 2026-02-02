# Troubleshooting Guide

Common issues, solutions, and debugging strategies for the Universal DJ Layer.

## Table of Contents

- [Common Errors](#common-errors)
- [Debugging](#debugging)
- [Performance Issues](#performance-issues)
- [Configuration Problems](#configuration-problems)
- [Integration Issues](#integration-issues)
- [FAQ](#faq)

## Common Errors

### Error: "Snapshot not found"

**Problem:**
```typescript
Error: Snapshot not found: snapshot-123
```

**Cause:**
- Snapshot was deleted or cleaned up
- Invalid snapshot ID
- Snapshot expired due to retention policy

**Solution:**

```typescript
// Check if snapshot exists before rollback
const snapshot = await stateManager.getSnapshot(snapshotId);
if (!snapshot) {
  console.error('Snapshot not found, listing available snapshots...');
  const snapshots = await stateManager.listSnapshots();
  console.log('Available snapshots:', snapshots.map(s => s.snapshotId));
  return;
}

await stateManager.rollbackToSnapshot(snapshotId);
```

**Prevention:**
- Increase retention period
- Don't rely on old snapshots
- Check snapshot existence before operations

---

### Error: "Control not found"

**Problem:**
```typescript
Error: Control not found: control-456
```

**Cause:**
- Control was already reverted
- Invalid control ID
- Control was never applied

**Solution:**

```typescript
// List active controls first
const controls = await dj.listControls({ status: 'active' });
const controlExists = controls.some(c => c.controlId === controlId);

if (!controlExists) {
  console.error('Control not found or already reverted');
  return;
}

await dj.revertControl(controlId, role);
```

---

### Error: "Insufficient permissions"

**Problem:**
```typescript
Error: Insufficient permissions to apply control
```

**Cause:**
- Role lacks required permission
- Attempting to bypass creator lock
- Invalid role configuration

**Solution:**

```typescript
// Check permissions before operation
if (!role.hasPermission('apply-control')) {
  console.error('Role lacks apply-control permission');
  console.log('Available permissions:', role.getPermissions());
  return;
}

// Check for creator locks
if (policyEvaluator.isCreatorLocked(resourceId)) {
  console.error('Resource is creator-locked');
  return;
}

await dj.applyControl(disc, role);
```

**Debug:**
```typescript
console.log('Role:', role.metadata.roleType);
console.log('Hierarchy level:', role.getHierarchyLevel());
console.log('Permissions:', role.getPermissions());
```

---

### Error: "Not implemented"

**Problem:**
```typescript
Error: Not implemented
```

**Cause:**
- Using DJEngine methods that aren't implemented yet
- Core engine still under development

**Solution:**

Use the implemented modules directly:

```typescript
// ✅ Use StateManager directly
const stateManager = new StateManager();
await stateManager.createSnapshot();
await stateManager.applyDiscChanges('control-1', changes);

// ✅ Use AuditLog directly
const auditLog = new AuditLog();
await auditLog.log({
  action: 'apply',
  actorId: 'user-123',
  actorRole: 'admin',
  result: 'success',
});

// ❌ DJEngine not fully implemented yet
// const dj = new DJEngine({ creatorId: 'creator-1' });
// await dj.applyControl(disc, role);
```

---

### Error: "Maximum snapshots exceeded"

**Problem:**
```typescript
Warning: Maximum snapshots (100) exceeded, oldest snapshot deleted
```

**Cause:**
- Creating too many snapshots
- `maxSnapshots` limit reached

**Solution:**

```typescript
// Increase limit
const stateManager = new StateManager({
  maxSnapshots: 500, // Increase from default 100
});

// Or manually cleanup old snapshots
await stateManager.cleanup(30); // Remove snapshots older than 30 days
```

---

### Error: "Audit log disabled"

**Problem:**
```typescript
Warning: Audit logging is disabled
```

**Cause:**
- AuditLog created with `enabled: false`

**Solution:**

```typescript
// Enable audit logging
const auditLog = new AuditLog({
  enabled: true, // Ensure this is true
});

// Verify it's enabled
console.log('Audit enabled:', auditLog.config.enabled);
```

---

### Error: "Invalid disc configuration"

**Problem:**
```typescript
Error: Invalid disc configuration
```

**Cause:**
- Missing required fields
- Invalid data types
- Failed validation

**Solution:**

```typescript
// Validate before creating disc
const config = {
  name: 'my-disc',
  features: { 'feature-1': true },
};

if (!config.name) {
  throw new Error('Disc name is required');
}

const disc = new FeatureDisc(config);

// Validate after creation
const isValid = await disc.validate();
if (!isValid) {
  throw new Error('Disc validation failed');
}
```

---

## Debugging

### Enable Debug Logging

```typescript
// Set up event listeners for debugging
stateManager.on('snapshot-created', (snapshot) => {
  console.log('[DEBUG] Snapshot created:', snapshot.snapshotId);
});

stateManager.on('state-changed', (change) => {
  console.log('[DEBUG] State changed:', {
    controlId: change.controlId,
    changeType: change.changeType,
    timestamp: change.timestamp,
  });
});

auditLog.on('audit-logged', (entry) => {
  console.log('[DEBUG] Audit logged:', {
    action: entry.action,
    actorId: entry.actorId,
    result: entry.result,
  });
});
```

### Inspect State

```typescript
async function debugState() {
  // Get current state
  const state = await stateManager.getCurrentState();
  console.log('Current state:', JSON.stringify(state, null, 2));

  // List all snapshots
  const snapshots = await stateManager.listSnapshots();
  console.log('Snapshots:', snapshots.length);
  snapshots.forEach(s => {
    console.log(`  - ${s.snapshotId} (${new Date(s.timestamp).toISOString()})`);
  });

  // Get recent audit entries
  const entries = await auditLog.query({ limit: 10 });
  console.log('Recent audit entries:', entries.length);
  entries.forEach(e => {
    console.log(`  - ${e.action} by ${e.actorId}: ${e.result}`);
  });
}
```

### Trace Control Application

```typescript
async function traceControlApplication(controlId: string) {
  // Get control history
  const history = await stateManager.getControlHistory(controlId);
  console.log('Control history:', history);

  // Get audit entries
  const auditEntries = await auditLog.query({ controlId });
  console.log('Audit entries:', auditEntries);

  // Get current state
  const controlState = stateManager.getControlState(controlId);
  console.log('Control state:', controlState);
}
```

### Debug Diff Calculation

```typescript
async function debugDiff(snapshotId1: string, snapshotId2: string) {
  const snapshot1 = await stateManager.getSnapshot(snapshotId1);
  const snapshot2 = await stateManager.getSnapshot(snapshotId2);

  console.log('Snapshot 1:', JSON.stringify(snapshot1?.state, null, 2));
  console.log('Snapshot 2:', JSON.stringify(snapshot2?.state, null, 2));

  const diffs = await stateManager.diff(snapshotId1, snapshotId2);
  console.log('Diffs:', diffs.length);
  diffs.forEach(diff => {
    console.log(`  ${diff.type}: ${diff.path}`);
    if (diff.before !== undefined) {
      console.log(`    Before: ${JSON.stringify(diff.before)}`);
    }
    if (diff.after !== undefined) {
      console.log(`    After: ${JSON.stringify(diff.after)}`);
    }
  });
}
```

### Check Event Listeners

```typescript
function checkEventListeners() {
  console.log('StateManager listeners:');
  console.log('  snapshot-created:', stateManager.listenerCount('snapshot-created'));
  console.log('  state-changed:', stateManager.listenerCount('state-changed'));
  console.log('  snapshot-restored:', stateManager.listenerCount('snapshot-restored'));

  console.log('AuditLog listeners:');
  console.log('  audit-logged:', auditLog.listenerCount('audit-logged'));
  console.log('  audit-query:', auditLog.listenerCount('audit-query'));
}
```

---

## Performance Issues

### Slow Snapshot Creation

**Problem:** Creating snapshots takes too long

**Cause:**
- Large state objects
- Deep nested structures
- Frequent snapshot creation

**Solution:**

```typescript
// Use shallow snapshots for large states
class OptimizedStateManager extends StateManager {
  async createLightweightSnapshot(metadata?: any): Promise<StateSnapshot> {
    // Only store references, not deep copies
    const snapshot: StateSnapshot = {
      snapshotId: this.generateSnapshotId(),
      timestamp: Date.now(),
      state: this.currentState, // Reference, not copy
      activeControls: [...this.activeControls],
      metadata,
    };
    
    this.snapshots.set(snapshot.snapshotId, snapshot);
    return snapshot;
  }
}

// Or limit snapshot frequency
let lastSnapshotTime = 0;
const MIN_SNAPSHOT_INTERVAL = 5000; // 5 seconds

async function createThrottledSnapshot() {
  const now = Date.now();
  if (now - lastSnapshotTime < MIN_SNAPSHOT_INTERVAL) {
    console.log('Skipping snapshot (too soon)');
    return;
  }
  
  lastSnapshotTime = now;
  return await stateManager.createSnapshot();
}
```

### High Memory Usage

**Problem:** Memory usage growing over time

**Cause:**
- Too many snapshots in memory
- Large audit log in memory
- Event listener leaks

**Solution:**

```typescript
// Regular cleanup
setInterval(async () => {
  // Clean old snapshots
  const removed = await stateManager.cleanup(7); // Keep 7 days
  console.log(`Cleaned ${removed} old snapshots`);
  
  // Clean old audit entries
  const removedEntries = await auditLog.cleanup(30); // Keep 30 days
  console.log(`Cleaned ${removedEntries} old entries`);
}, 24 * 60 * 60 * 1000); // Daily

// Use persistence for large datasets
const stateManager = new StateManager({
  enablePersistence: true,
  storageBackend: 'file',
});

// Remove unused event listeners
function cleanup() {
  stateManager.removeAllListeners();
  auditLog.removeAllListeners();
}
```

### Slow Diff Calculation

**Problem:** Calculating diffs is slow for large states

**Cause:**
- Deep object comparison
- Large state objects

**Solution:**

```typescript
// Use shallow comparison for known structures
function quickDiff(before: any, after: any): ChangeDiff[] {
  const diffs: ChangeDiff[] = [];
  
  // Only compare top-level keys
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  
  for (const key of allKeys) {
    if (before[key] !== after[key]) {
      diffs.push({
        path: key,
        type: before[key] === undefined ? 'added' :
              after[key] === undefined ? 'removed' : 'modified',
        before: before[key],
        after: after[key],
      });
    }
  }
  
  return diffs;
}
```

---

## Configuration Problems

### Wrong Storage Backend

**Problem:** Data not persisting across restarts

**Cause:**
- Using `memory` storage backend (default)

**Solution:**

```typescript
// Use file-based storage
const stateManager = new StateManager({
  enablePersistence: true,
  storageBackend: 'file',
  storagePath: './data/snapshots',
});

const auditLog = new AuditLog({
  storage: 'file',
  storagePath: './data/audit',
});
```

### Missing Environment Variables

**Problem:** Configuration values are undefined

**Cause:**
- Environment variables not set

**Solution:**

```typescript
// Check required env vars
const requiredEnvVars = [
  'DJ_CREATOR_ID',
  'AUDIT_RETENTION_DAYS',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Use dotenv for development
import dotenv from 'dotenv';
dotenv.config();
```

---

## Integration Issues

### React Integration Problems

**Problem:** Hooks not updating when state changes

**Cause:**
- Not wrapped in `DJEngineProvider`
- Missing event listeners

**Solution:**

```tsx
// Ensure provider wraps app
function App() {
  return (
    <DJEngineProvider 
      djEngine={djEngine}
      stateManager={stateManager}
      auditLog={auditLog}
    >
      <YourComponents />
    </DJEngineProvider>
  );
}

// Force refresh in hooks
const { refreshControls } = useControlAPI(djEngine);

useEffect(() => {
  const interval = setInterval(() => {
    refreshControls();
  }, 5000); // Refresh every 5 seconds
  
  return () => clearInterval(interval);
}, [refreshControls]);
```

### Express.js Integration Issues

**Problem:** DJ Layer not accessible in routes

**Cause:**
- Not attached to request object
- Not initialized before server start

**Solution:**

```typescript
// Initialize before routes
const stateManager = new StateManager();
const auditLog = new AuditLog();

// Attach to request
app.use((req, res, next) => {
  req.stateManager = stateManager;
  req.auditLog = auditLog;
  next();
});

// Use in routes
app.post('/api/controls/apply', async (req, res) => {
  const { disc, role } = req.body;
  
  const change = await req.stateManager.applyDiscChanges(
    'control-id',
    disc
  );
  
  await req.auditLog.log({
    action: 'apply',
    actorId: req.user.id,
    actorRole: req.user.role,
    result: 'success',
  });
  
  res.json({ success: true, change });
});
```

---

## FAQ

### Q: How do I know which module is implemented?

**A:** Check the source code or look for "Not implemented" errors. Currently implemented:
- ✅ StateManager (fully implemented)
- ✅ AuditLog (fully implemented)
- 🚧 DJEngine (partially implemented)
- 🚧 Discs (interfaces defined, implementation pending)
- 🚧 Roles (interfaces defined, implementation pending)

### Q: Can I use DJ Layer in production?

**A:** StateManager and AuditLog are production-ready and fully tested. DJEngine is still under development. Use the implemented modules directly for now.

### Q: How do I handle errors in async operations?

**A:**
```typescript
try {
  await stateManager.applyDiscChanges('control-1', changes);
} catch (error) {
  console.error('Failed to apply changes:', error);
  
  // Log the error
  await auditLog.log({
    action: 'apply',
    actorId: 'user-123',
    actorRole: 'admin',
    result: 'failure',
    error: error.message,
  });
  
  // Handle gracefully
  throw error;
}
```

### Q: How do I migrate from memory to file storage?

**A:**
```typescript
// Export current data
const snapshots = await stateManager.listSnapshots();
const auditEntries = await auditLog.query({ limit: 10000 });

// Save to JSON
fs.writeFileSync('snapshots-backup.json', JSON.stringify(snapshots));
fs.writeFileSync('audit-backup.json', JSON.stringify(auditEntries));

// Create new instance with file storage
const newStateManager = new StateManager({
  enablePersistence: true,
  storageBackend: 'file',
});

// Import data
for (const snapshot of snapshots) {
  await newStateManager.restoreSnapshot(snapshot);
}
```

### Q: How often should I create snapshots?

**A:** It depends on your use case:
- **High-frequency changes**: Every 5-10 minutes
- **Moderate changes**: Hourly
- **Low-frequency changes**: Daily
- **Before critical operations**: Always

### Q: What's the performance overhead?

**A:**
- Snapshot creation: ~1-10ms for typical state sizes
- State change application: ~1-5ms
- Audit logging: ~1ms per entry
- Memory usage: ~1KB per snapshot, ~500 bytes per audit entry

### Q: Can I use custom storage backends?

**A:** Yes, extend the base classes:
```typescript
class RedisStateManager extends StateManager {
  async createSnapshot(metadata?: any): Promise<StateSnapshot> {
    const snapshot = await super.createSnapshot(metadata);
    await redis.set(`snapshot:${snapshot.snapshotId}`, JSON.stringify(snapshot));
    return snapshot;
  }
}
```

### Q: How do I debug circular reference errors?

**A:**
```typescript
// Use a custom replacer for JSON.stringify
function jsonSafeStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  }, 2);
}

console.log(jsonSafeStringify(state));
```

### Q: Can I use DJ Layer with TypeScript strict mode?

**A:** Yes, DJ Layer is built with strict TypeScript:
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

---

## Getting Help

If you're still experiencing issues:

1. Check the [API Documentation](./API.md)
2. Review [Getting Started Guide](./GETTING_STARTED.md)
3. Look through [Examples](../examples/)
4. Search [GitHub Issues](https://github.com/telleriacarolina/Universal-DJ-Layer/issues)
5. Open a new issue with:
   - Clear description of the problem
   - Minimal reproduction code
   - Error messages and stack traces
   - Environment details (Node.js version, OS, etc.)

## See Also

- [Getting Started Guide](./GETTING_STARTED.md)
- [API Documentation](./API.md)
- [Security Guide](./SECURITY.md)
- [Disc Development Guide](./DISC_DEVELOPMENT.md)

## License

MIT © 2026 Carolina Telleria
