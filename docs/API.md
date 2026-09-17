# API Documentation

Complete API reference for the Universal DJ Layer.

## Table of Contents

- [DJEngine](#djengine)
- [StateManager](#statemanager)
- [AuditLog](#auditlog)
- [Disc Base Class](#disc-base-class)
- [FeatureDisc](#featuredisc)
- [UIDisc](#uidisc)
- [Roles](#roles)
- [PolicyEvaluator](#policyevaluator)
- [Types](#types)

---

## DJEngine

The core orchestration engine that coordinates all control operations.

### Constructor

```typescript
new DJEngine(config: DJEngineConfig)
```

**Parameters:**

```typescript
interface DJEngineConfig {
  creatorId: string;                    // ID of the creator/owner
  enableAudit?: boolean;                // Enable audit logging (default: false)
  maxConcurrentControls?: number;       // Max concurrent controls (default: unlimited)
  policyEvaluator?: PolicyEvaluator;    // Custom policy evaluator
}
```

**Example:**

```typescript
const dj = new DJEngine({
  creatorId: 'user-123',
  enableAudit: true,
  maxConcurrentControls: 10,
});
```

### Methods

#### previewControl()

Preview a control change without applying it.

```typescript
async previewControl(disc: Disc, role: Role): Promise<PreviewResult>
```

**Parameters:**
- `disc`: The disc to preview
- `role`: Role of the actor

**Returns:**

```typescript
interface PreviewResult {
  safe: boolean;                      // Whether the control is safe to apply
  affectedSystems: string[];          // Systems that would be affected
  potentialIssues: string[];          // Potential issues or warnings
  diff: Record<string, any>;          // Diff showing what would change
}
```

**Example:**

```typescript
const preview = await dj.previewControl(betaFeatures, creatorRole);
if (preview.safe) {
  console.log('Safe to apply!');
} else {
  console.warn('Issues:', preview.potentialIssues);
}
```

**Status:** 🚧 Not yet implemented

---

#### applyControl()

Apply a control to the running system.

```typescript
async applyControl(
  disc: Disc,
  role: Role,
  options?: { previewFirst?: boolean }
): Promise<ControlResult>
```

**Parameters:**
- `disc`: The disc to apply
- `role`: Role of the actor
- `options.previewFirst`: Whether to preview before applying (default: false)

**Returns:**

```typescript
interface ControlResult {
  controlId: string;                  // Unique identifier for this control
  timestamp: number;                  // When control was applied
  affectedSystems: string[];          // Systems affected by this control
  status: 'success' | 'failed' | 'partial';
}
```

**Example:**

```typescript
const result = await dj.applyControl(betaFeatures, creatorRole, {
  previewFirst: true,
});
console.log('Control applied:', result.controlId);
```

**Status:** 🚧 Not yet implemented

---

#### revertControl()

Revert a previously applied control.

```typescript
async revertControl(controlId: string, role: Role): Promise<void>
```

**Parameters:**
- `controlId`: ID of the control to revert
- `role`: Role of the actor

**Throws:**
- Error if control not found
- Error if role lacks permission

**Example:**

```typescript
await dj.revertControl('ctrl-123', adminRole);
console.log('Control reverted successfully');
```

**Status:** 🚧 Not yet implemented

---

#### listControls()

List all controls matching the given criteria.

```typescript
async listControls(options?: ListControlsOptions): Promise<ControlResult[]>
```

**Parameters:**

```typescript
interface ListControlsOptions {
  status?: 'active' | 'reverted' | 'all';
  discType?: string;
  actorId?: string;
}
```

**Example:**

```typescript
const activeControls = await dj.listControls({ status: 'active' });
const featureControls = await dj.listControls({ discType: 'feature' });
```

**Status:** 🚧 Not yet implemented

---

#### getAuditLog()

Get audit log entries for a specific control or time range.

```typescript
async getAuditLog(options: {
  controlId?: string;
  timeRange?: { start: number; end: number };
}): Promise<any>
```

**Status:** 🚧 Not yet implemented

---

## StateManager

Manages application state, snapshots, and rollbacks.

### Constructor

```typescript
new StateManager(config?: StateManagerConfig)
```

**Parameters:**

```typescript
interface StateManagerConfig {
  maxSnapshots?: number;              // Max snapshots to keep (default: 100)
  enablePersistence?: boolean;        // Enable persistent storage (default: false)
  storageBackend?: 'memory' | 'file' | 'database';
}
```

**Example:**

```typescript
const stateManager = new StateManager({
  maxSnapshots: 100,
  enablePersistence: false,
});
```

### Methods

#### getCurrentState()

Get the current application state.

```typescript
async getCurrentState(): Promise<any>
```

**Returns:** Deep copy of current state

**Example:**

```typescript
const state = await stateManager.getCurrentState();
console.log('Current features:', state.features);
```

---

#### createSnapshot()

Create a snapshot of the current state.

```typescript
async createSnapshot(metadata?: Record<string, any>): Promise<StateSnapshot>
```

**Parameters:**
- `metadata`: Optional metadata to attach to snapshot

**Returns:**

```typescript
interface StateSnapshot {
  snapshotId: string;                 // Unique snapshot identifier
  timestamp: number;                  // When snapshot was taken
  state: any;                         // Full state at this point
  activeControls: string[];           // Active controls at this snapshot
  metadata?: Record<string, any>;     // Custom metadata
}
```

**Example:**

```typescript
const snapshot = await stateManager.createSnapshot({
  reason: 'Before major deployment',
  author: 'admin@example.com',
});
console.log('Snapshot ID:', snapshot.snapshotId);
```

---

#### applyDiscChanges()

Apply changes from a disc to the state.

```typescript
async applyDiscChanges(controlId: string, disc: any): Promise<StateChange>
```

**Parameters:**
- `controlId`: ID of the control applying changes
- `disc`: Disc object or state changes

**Returns:**

```typescript
interface StateChange {
  controlId: string;
  timestamp: number;
  before: any;                        // State before changes
  after: any;                         // State after changes
  changeType: 'apply' | 'revert' | 'modify';
}
```

**Example:**

```typescript
const change = await stateManager.applyDiscChanges('feature-flags', {
  darkMode: true,
  betaFeatures: ['search', 'collab'],
});
```

---

#### rollbackToSnapshot()

Rollback to a previous state snapshot.

```typescript
async rollbackToSnapshot(snapshotId: string): Promise<void>
```

**Parameters:**
- `snapshotId`: ID of the snapshot to restore

**Throws:**
- Error if snapshot not found

**Example:**

```typescript
await stateManager.rollbackToSnapshot('snapshot-123');
console.log('State restored');
```

---

#### revertControlChanges()

Revert changes from a specific control.

```typescript
async revertControlChanges(controlId: string): Promise<StateChange>
```

**Parameters:**
- `controlId`: ID of the control to revert

**Throws:**
- Error if control not found

**Example:**

```typescript
await stateManager.revertControlChanges('feature-flags');
```

---

#### listSnapshots()

List snapshots with optional filtering.

```typescript
async listSnapshots(filter?: {
  controlId?: string;
  startTime?: number;
  endTime?: number;
}): Promise<StateSnapshot[]>
```

**Example:**

```typescript
// Get all snapshots
const all = await stateManager.listSnapshots();

// Get snapshots from last 24 hours
const recent = await stateManager.listSnapshots({
  startTime: Date.now() - 86400000,
});

// Get snapshots for specific control
const controlSnapshots = await stateManager.listSnapshots({
  controlId: 'feature-flags',
});
```

---

#### diff()

Calculate diff between two snapshots.

```typescript
async diff(snapshotIdA: string, snapshotIdB: string): Promise<ChangeDiff[]>
```

**Returns:**

```typescript
interface ChangeDiff {
  path: string;                       // Path to changed property
  type: 'added' | 'removed' | 'modified';
  before?: any;                       // Old value (if modified/removed)
  after?: any;                        // New value (if added/modified)
}
```

**Example:**

```typescript
const diffs = await stateManager.diff('snapshot-1', 'snapshot-2');
diffs.forEach(diff => {
  console.log(`${diff.path}: ${diff.type}`);
});
```

---

#### cleanup()

Remove snapshots older than retention period.

```typescript
async cleanup(retentionDays: number): Promise<number>
```

**Parameters:**
- `retentionDays`: Number of days to retain snapshots

**Returns:** Number of snapshots removed

**Example:**

```typescript
const removed = await stateManager.cleanup(30);
console.log(`Removed ${removed} old snapshots`);
```

---

### Events

StateManager extends `EventEmitter` and emits the following events:

```typescript
stateManager.on('snapshot-created', (snapshot: StateSnapshot) => {
  console.log('New snapshot:', snapshot.snapshotId);
});

stateManager.on('state-changed', (change: StateChange) => {
  console.log('State changed:', change.controlId);
});

stateManager.on('snapshot-restored', (snapshotId: string) => {
  console.log('Rolled back to:', snapshotId);
});

stateManager.on('snapshot-deleted', (snapshotId: string) => {
  console.log('Snapshot deleted:', snapshotId);
});
```

---

## AuditLog

Records all control operations with full context for compliance and security.

### Constructor

```typescript
new AuditLog(config?: AuditLogConfig)
```

**Parameters:**

```typescript
interface AuditLogConfig {
  enabled?: boolean;                  // Enable audit logging (default: true)
  storage?: 'memory' | 'file' | 'database';
  retentionDays?: number;             // Retention period (default: 365)
  includeSensitiveData?: boolean;     // Include sensitive data (default: false)
  storagePath?: string;               // Storage path for file backend
  sensitiveFields?: string[];         // Fields to redact
}
```

**Example:**

```typescript
const auditLog = new AuditLog({
  enabled: true,
  retentionDays: 365,
  includeSensitiveData: false,
});
```

### Methods

#### log()

Log an audit entry.

```typescript
async log(entry: Omit<AuditEntry, 'entryId' | 'timestamp'>): Promise<string>
```

**Parameters:**

```typescript
interface AuditEntry {
  action: 'apply' | 'revert' | 'preview' | 'list' | 'policy-change' | 'role-change';
  actorId: string;                    // ID of the actor
  actorRole: string;                  // Role of the actor
  controlId?: string;                 // ID of the control
  discType?: string;                  // Type of disc
  result: 'success' | 'failure' | 'partial';
  changes?: Record<string, any>;      // Changes made
  error?: string;                     // Error message if failed
  metadata?: Record<string, any>;     // Additional metadata
  ipAddress?: string;                 // IP address
  userAgent?: string;                 // User agent
}
```

**Returns:** Entry ID

**Example:**

```typescript
const entryId = await auditLog.log({
  action: 'apply',
  actorId: 'user-123',
  actorRole: 'admin',
  controlId: 'feature-flags',
  discType: 'feature',
  result: 'success',
  changes: { darkMode: true },
});
```

---

#### query()

Query audit log entries with filtering.

```typescript
async query(options?: AuditQueryOptions): Promise<AuditEntry[]>
```

**Parameters:**

```typescript
interface AuditQueryOptions {
  controlId?: string;
  actorId?: string;
  action?: AuditEntry['action'];
  result?: AuditEntry['result'];
  startTime?: number;
  endTime?: number;
  limit?: number;                     // Default: 100
  offset?: number;                    // Default: 0
  sortDirection?: 'asc' | 'desc';     // Default: 'desc'
}
```

**Example:**

```typescript
// Get recent entries
const recent = await auditLog.query({
  limit: 50,
  sortDirection: 'desc',
});

// Get entries for specific user
const userEntries = await auditLog.query({
  actorId: 'user-123',
  startTime: Date.now() - 86400000, // Last 24 hours
});

// Get failed operations
const failures = await auditLog.query({
  result: 'failure',
  limit: 20,
});
```

---

#### stream()

Stream audit events in real-time.

```typescript
async stream(callback: (entry: AuditEntry) => void): Promise<() => void>
```

**Parameters:**
- `callback`: Function to call for each new audit entry

**Returns:** Unsubscribe function

**Example:**

```typescript
const unsubscribe = await auditLog.stream((entry) => {
  console.log('New audit entry:', entry.action, 'by', entry.actorId);
  
  if (entry.result === 'failure') {
    alertSystem.notify(entry);
  }
});

// Later: stop streaming
unsubscribe();
```

---

#### export()

Export audit log to specified format.

```typescript
async export(
  format: 'json' | 'csv',
  options?: AuditQueryOptions
): Promise<string>
```

**Parameters:**
- `format`: Export format
- `options`: Optional query options to filter exported entries

**Returns:** Formatted string

**Example:**

```typescript
// Export all entries as JSON
const jsonExport = await auditLog.export('json');

// Export user's entries as CSV
const csvExport = await auditLog.export('csv', {
  actorId: 'user-123',
});

// Save to file
fs.writeFileSync('audit-export.json', jsonExport);
```

---

#### cleanup()

Remove audit entries older than retention period.

```typescript
async cleanup(retentionDays: number): Promise<number>
```

**Parameters:**
- `retentionDays`: Number of days to retain entries

**Returns:** Number of entries removed

**Example:**

```typescript
const removed = await auditLog.cleanup(90);
console.log(`Removed ${removed} old entries`);
```

---

### Events

AuditLog extends `EventEmitter` and emits the following events:

```typescript
auditLog.on('audit-logged', (entry: AuditEntry) => {
  console.log('Logged:', entry.action, 'by', entry.actorId);
});

auditLog.on('audit-query', (options: any) => {
  console.log('Query executed');
});

auditLog.on('audit-cleanup', (info: any) => {
  console.log(`Cleanup: ${info.removed} entries removed`);
});
```

---

## Disc Base Class

Base interface that all discs must implement.

### Interface

```typescript
interface Disc {
  metadata: DiscMetadata;
  apply(context: any): Promise<any>;
  revert(context: any): Promise<any>;
  preview(context: any): Promise<any>;
  validate(): Promise<boolean>;
}

interface DiscMetadata {
  id: string;
  name: string;
  type: string;
  version: string;
  createdAt: number;
  updatedAt?: number;
}
```

### Methods

All disc implementations must provide these methods:

- `apply()`: Apply the disc's changes
- `revert()`: Revert the disc's changes
- `preview()`: Preview what the disc would do
- `validate()`: Validate the disc configuration

---

## FeatureDisc

Controls feature flags and toggles.

### Constructor

```typescript
new FeatureDisc(config: FeatureConfig)
```

**Parameters:**

```typescript
interface FeatureConfig {
  name: string;
  features: Record<string, boolean>;
  targeting?: Record<string, any>;
  dependencies?: string[];
}
```

**Example:**

```typescript
const betaFeatures = new FeatureDisc({
  name: 'beta-features',
  features: {
    'advanced-search': true,
    'dark-mode': false,
    'real-time-collab': true,
  },
  dependencies: ['user-auth'],
});
```

### Methods

#### isFeatureEnabled()

Check if a specific feature is enabled.

```typescript
isFeatureEnabled(featureKey: string): boolean
```

**Example:**

```typescript
if (betaFeatures.isFeatureEnabled('dark-mode')) {
  applyDarkTheme();
}
```

---

#### getAllFeatures()

Get all feature states.

```typescript
getAllFeatures(): Record<string, boolean>
```

**Example:**

```typescript
const features = betaFeatures.getAllFeatures();
console.log(features); // { 'advanced-search': true, 'dark-mode': false, ... }
```

**Status:** 🚧 Full implementation pending

---

## UIDisc

Controls UI elements, layouts, and themes.

### Constructor

```typescript
new UIDisc(config: UIConfig)
```

**Parameters:**

```typescript
interface UIConfig {
  name: string;
  layouts?: Record<string, UILayout>;
  themes?: Record<string, UITheme>;
  components?: Record<string, UIComponent>;
  activeTheme?: string;
}
```

**Example:**

```typescript
const darkTheme = new UIDisc({
  name: 'dark-theme',
  themes: {
    dark: {
      name: 'dark',
      colors: {
        background: '#000000',
        text: '#FFFFFF',
        primary: '#007AFF',
      },
    },
  },
  activeTheme: 'dark',
});
```

### Methods

#### getTheme()

Get a specific theme.

```typescript
getTheme(themeName: string): UITheme | null
```

---

#### getLayout()

Get a specific layout.

```typescript
getLayout(layoutName: string): UILayout | null
```

---

#### getComponent()

Get a component configuration.

```typescript
getComponent(componentId: string): UIComponent | null
```

**Status:** 🚧 Full implementation pending

---

## Roles

### CreatorRole

The original creator with veto power and full control.

#### Constructor

```typescript
new CreatorRole(config: CreatorRoleConfig)
```

**Parameters:**

```typescript
interface CreatorRoleConfig {
  userId: string;
  additionalPermissions?: string[];
  ownedResources?: string[];
}
```

**Example:**

```typescript
const creator = new CreatorRole({
  userId: 'user-123',
  ownedResources: ['app-1', 'app-2'],
});
```

#### Methods

```typescript
hasPermission(permission: string): boolean
getPermissions(): string[]
getHierarchyLevel(): number  // Returns 100 for creator
ownsResource(resourceId: string): boolean
```

**Status:** 🚧 Full implementation pending

---

## PolicyEvaluator

Evaluates policies and permissions for control operations.

**Status:** 🚧 Implementation pending

---

## Types

### Core Types

```typescript
// Control result from applying a control
interface ControlResult {
  controlId: string;
  timestamp: number;
  affectedSystems: string[];
  status: 'success' | 'failed' | 'partial';
}

// Preview result before applying
interface PreviewResult {
  safe: boolean;
  affectedSystems: string[];
  potentialIssues: string[];
  diff: Record<string, any>;
}

// State snapshot
interface StateSnapshot {
  snapshotId: string;
  timestamp: number;
  state: any;
  activeControls: string[];
  metadata?: Record<string, any>;
}

// State change record
interface StateChange {
  controlId: string;
  timestamp: number;
  before: any;
  after: any;
  changeType: 'apply' | 'revert' | 'modify';
}

// Audit log entry
interface AuditEntry {
  entryId: string;
  timestamp: number;
  action: 'apply' | 'revert' | 'preview' | 'list' | 'policy-change' | 'role-change';
  actorId: string;
  actorRole: string;
  controlId?: string;
  discType?: string;
  result: 'success' | 'failure' | 'partial';
  changes?: Record<string, any>;
  error?: string;
  metadata?: Record<string, any>;
}
```

---

## Status Legend

- ✅ Fully implemented and tested
- 🚧 Partially implemented or pending
- ❌ Not yet started

---

## See Also

- [Getting Started Guide](./GETTING_STARTED.md)
- [Disc Development Guide](./DISC_DEVELOPMENT.md)
- [Security Guide](./SECURITY.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

## License

MIT © 2026 Carolina Telleria
