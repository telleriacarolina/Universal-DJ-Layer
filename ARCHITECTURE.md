# Architecture Overview

This document provides a detailed overview of the Universal DJ Control Layer architecture.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Host Application                         │
│  (Your app with integration hooks and UI)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Integration Hooks
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  DJ Control Layer                            │
│                                                              │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────────┐    │
│  │     RBAC     │  │   Audit   │  │     State        │    │
│  │   Manager    │  │   Logger  │  │    Manager       │    │
│  └──────────────┘  └───────────┘  └──────────────────┘    │
│                                                              │
│  ┌──────────────┐  ┌───────────┐                           │
│  │  Compliance  │  │   Hooks   │                           │
│  │  Validator   │  │  System   │                           │
│  └──────────────┘  └───────────┘                           │
│                                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Disc Management
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      Discs                                   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Theme   │  │ Feature  │  │  Custom  │  │  Custom  │  │
│  │  Disc    │  │   Flag   │  │  Disc 1  │  │  Disc 2  │  │
│  │          │  │   Disc   │  │          │  │          │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. DJControlLayer

The main orchestrator that manages all components and enforces rules.

**Responsibilities:**
- Manages disc lifecycle (add, remove, enable, disable)
- Enforces permission checks via RBAC
- Coordinates state changes and snapshots
- Triggers integration hooks
- Validates compliance rules
- Maintains audit logs

**Key Methods:**
- `addDisc()` - Register a new disc
- `removeDisc()` - Unregister a disc
- `enableDisc()` / `disableDisc()` - Control disc activation
- `executeDisc()` - Run disc logic
- `updateDiscConfig()` - Modify disc settings
- `createSnapshot()` / `rollbackToSnapshot()` - State management
- `getAuditLogs()` - Access audit trail

### 2. Disc (Base Class)

Abstract base class for all modular components.

**Responsibilities:**
- Define metadata (ID, name, required permissions)
- Maintain internal state and configuration
- Implement custom logic in `execute()`
- Validate data in `validate()`
- Handle initialization and cleanup

**Lifecycle:**
```
Created → Initialize → Enabled → Execute (multiple) → Disabled → Cleanup → Removed
```

### 3. RBACManager

Role-Based Access Control system for permission enforcement.

**Responsibilities:**
- Maintain role hierarchy (Viewer < Experimenter < Admin < Owner)
- Map roles to permissions
- Check user permissions before operations
- Support custom permission overrides

**Permission Model:**
```
Role.VIEWER → [READ]
Role.EXPERIMENTER → [READ, WRITE, EXECUTE]
Role.ADMIN → [READ, WRITE, EXECUTE, DELETE, CONFIGURE]
Role.OWNER → [READ, WRITE, EXECUTE, DELETE, CONFIGURE]
```

### 4. AuditLogger

Comprehensive logging system for tracking all changes.

**Responsibilities:**
- Record all operations with timestamp and user
- Store previous and new states
- Support filtering by user, disc, time, or action
- Export/import logs for persistence

**Log Entry Structure:**
```typescript
{
  timestamp: Date,
  userId: string,
  userName: string,
  action: string,
  discId: string,
  discName: string,
  changeDescription: string,
  previousState?: any,
  newState?: any,
  metadata?: Record<string, any>
}
```

### 5. StateManager

Manages snapshots and rollback functionality.

**Responsibilities:**
- Create point-in-time snapshots
- Store disc states
- Restore previous states
- Manage snapshot lifecycle (max snapshots)

**Snapshot Flow:**
```
1. Create snapshot → Store all disc states
2. Make changes → Modify disc states
3. Rollback → Restore from snapshot
```

### 6. ComplianceValidator

Enforces organizational policies and rules.

**Responsibilities:**
- Register compliance rules
- Validate actions against rules
- Report violations and warnings
- Block non-compliant changes

**Validation Flow:**
```
1. Action requested
2. Gather context
3. Run all applicable rules
4. Collect violations
5. Allow or block based on results
```

### 7. Integration Hooks

Event system for host application integration.

**Available Hooks:**
- `onBeforeChange` - Pre-change validation and blocking
- `onAfterChange` - Post-change notifications
- `onBeforeRollback` - Pre-rollback validation
- `onAfterRollback` - Post-rollback notifications
- `onAuditLog` - Real-time audit log streaming

## Data Flow

### Adding a Disc

```
1. User calls addDisc(disc, user)
2. Check user has ADMIN role + CONFIGURE permission
3. Validate compliance rules
4. Call onBeforeChange hook (can block)
5. Initialize disc
6. Register disc in layer
7. Update state manager
8. Log to audit
9. Call onAfterChange hook
```

### Executing a Disc

```
1. User calls executeDisc(discId, context, user)
2. Check disc exists and is enabled
3. Check user has required role + EXECUTE permission
4. Apply user isolation (if enabled)
5. Execute disc logic
6. Store user context (if isolation enabled)
7. Log to audit
8. Return result
```

### Creating a Snapshot and Rolling Back

```
Create Snapshot:
1. User calls createSnapshot(user, description)
2. Check user has WRITE permission
3. Capture all disc states
4. Store snapshot with ID
5. Log to audit

Rollback:
1. User calls rollbackToSnapshot(snapshotId, user)
2. Check user has ADMIN role + WRITE permission
3. Call onBeforeRollback hook (can block)
4. Restore states from snapshot
5. Update all discs with restored states
6. Log to audit
7. Call onAfterRollback hook
```

## Security Model

### Permission Layers

1. **Role Check** - User must have minimum required role
2. **Permission Check** - User must have specific permissions
3. **Compliance Check** - Change must pass compliance rules
4. **Hook Check** - Integration hooks can block changes

### User Isolation

When enabled:
- Each user gets isolated context
- User data stored separately
- No cross-user data leakage
- Context passed to disc execution

### Audit Trail

Every operation is logged:
- Who performed the action
- What was changed
- When it happened
- Previous and new states

## Extension Points

### 1. Custom Discs

Extend `Disc` base class:
```typescript
export class MyDisc extends Disc {
  async initialize() { /* setup */ }
  async cleanup() { /* teardown */ }
  async execute(context) { /* logic */ }
  async validate(data) { /* validation */ }
}
```

### 2. Custom Compliance Rules

Implement `ComplianceRule` interface:
```typescript
const myRule: ComplianceRule = {
  id: 'my-rule',
  name: 'My Rule',
  description: 'Custom validation',
  validate: async (context) => {
    // Your logic
    return { passed: true, violations: [], warnings: [] };
  }
};
```

### 3. Integration Hooks

Provide hooks during initialization:
```typescript
const djLayer = new DJControlLayer({
  hooks: {
    onBeforeChange: async (context) => { /* logic */ },
    onAfterChange: async (context) => { /* logic */ },
    // ... more hooks
  }
});
```

## Performance Considerations

1. **Snapshot Size** - Limit max snapshots to prevent memory issues
2. **Audit Log Size** - Configure max log entries
3. **Disc Execution** - Keep disc logic lightweight
4. **State Serialization** - Use efficient data structures
5. **Hook Execution** - Avoid heavy operations in hooks

## Scalability

The DJ Control Layer is designed for:
- Small to medium applications (100-1000 discs)
- Multiple concurrent users
- Reasonable snapshot history (< 1000 snapshots)
- Moderate audit log size (< 100,000 entries)

For larger scale:
- Implement persistent storage for snapshots
- Stream audit logs to external system
- Use database for state management
- Implement disc lazy loading

## Thread Safety

- The layer is single-threaded (JavaScript)
- Use async/await for concurrent operations
- State changes are atomic per operation
- No built-in locking mechanism (add if needed)
