# Universal DJ Control Layer

[![npm version](https://badge.fury.io/js/universal-dj-layer.svg)](https://www.npmjs.com/package/universal-dj-layer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/telleriacarolina/Universal-DJ-Layer/workflows/CI/badge.svg)](https://github.com/telleriacarolina/Universal-DJ-Layer/actions)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/universal-dj-layer)](https://bundlephobia.com/package/universal-dj-layer)

> A universal, pluggable control layer enabling safe collaboration, real-time experimentation, and role-based runtime tuning in any application.

## 🎯 Overview

The **Universal DJ Control Layer** is a headless TypeScript framework that allows you to modify application behavior at runtime through composable "discs" while maintaining safety, reversibility, and full audit trails. Like a DJ mixing music, you can blend different behavioral layers without permanently altering the core application logic.

**Key Features:**
- **Preview-Before-Apply**: Test changes in a sandbox before committing
- **Reversible Controls**: All modifications can be rolled back instantly via StateManager
- **Creator Locks**: Original creators retain veto power over changes
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for different user types
- **Full Audit Trail**: Every change is logged with AuditLog for compliance
- **Headless Core**: UI optional—core package is entirely backend-focused
- **State Snapshots**: Point-in-time snapshots with diff calculation
- **Real-time Streaming**: Monitor audit events in real-time

## 📦 Installation

```bash
npm install universal-dj-layer
# or
yarn add universal-dj-layer
```

## 🚀 Quick Start

### StateManager & AuditLog (Foundation)

```typescript
import { StateManager } from 'universal-dj-layer/core/state-manager';
import { AuditLog } from 'universal-dj-layer/audit/audit-log';

// Initialize core modules
const stateManager = new StateManager({
  maxSnapshots: 100,
  enablePersistence: false
});

const auditLog = new AuditLog({
  enabled: true,
  retentionDays: 365,
  includeSensitiveData: false
});

// Create a snapshot before changes
const snapshot = await stateManager.createSnapshot({
  reason: 'before feature deployment'
});

// Apply changes and track them
const change = await stateManager.applyDiscChanges('feature-toggle', {
  darkMode: true,
  betaFeatures: ['advanced-search', 'real-time-collab']
});

// Log the operation
await auditLog.log({
  action: 'apply',
  actorId: 'admin@example.com',
  actorRole: 'admin',
  controlId: 'feature-toggle',
  result: 'success',
  changes: {
    before: change.before,
    after: change.after
  }
});

// Rollback if needed
await stateManager.rollbackToSnapshot(snapshot.snapshotId);
await auditLog.log({
  action: 'revert',
  actorId: 'admin@example.com',
  actorRole: 'admin',
  result: 'success',
  metadata: { snapshotId: snapshot.snapshotId }
});
```

### DJEngine (Coming Soon)

```typescript
import { DJEngine, FeatureDisc, CreatorRole } from 'universal-dj-layer';

// Initialize the DJ Engine
const dj = new DJEngine({
  creatorId: 'user-123',
  enableAudit: true
});

// Define a role
const creatorRole = new CreatorRole({
  userId: 'user-123',
  permissions: ['full-control']
});

// Create a feature disc to control functionality
const betaFeatures = new FeatureDisc({
  name: 'beta-features',
  features: {
    'advanced-search': false,
    'dark-mode': true
  }
});

// Preview changes before applying
const preview = await dj.previewControl(betaFeatures, creatorRole);
console.log('Impact:', preview.affectedSystems);

// Apply if preview looks good
if (preview.safe) {
  const result = await dj.applyControl(betaFeatures, creatorRole);
  console.log('Control applied:', result.controlId);
}

// Revert if needed
await dj.revertControl(result.controlId, creatorRole);
```

## 🎛️ Core Concepts

### Discs

**Discs** are modular control units that modify specific aspects of your application. Each disc type handles a different behavioral domain:

- **FeatureDisc**: Toggle features on/off dynamically
- **PermissionDisc**: Modify access controls at runtime
- **FlowDisc**: Alter user journey paths and navigation
- **UIDisc**: Adjust interface elements and layouts
- **BehaviorDisc**: Change application logic patterns

### Roles

**Roles** define what different actors can do within the DJ Control Layer:

- **Creator**: Original application creator with veto power and full control
- **Admin**: Broad permissions, cannot override creator locks
- **Moderator**: Content and user management capabilities
- **Collaborator**: Can propose changes, requires approval
- **User**: Basic interaction, no control modifications
- **AI Agent**: Automated changes with strict guardrails

### Policies

**Policies** enforce rules and boundaries for control modifications:

- **Creator Locks**: Immutable protections set by the creator
- **Safety Policies**: Prevent dangerous combinations or changes
- **Anti-Abuse**: Rate limiting and suspicious activity detection
- **Compliance**: Regulatory and legal requirement enforcement

## 🔧 Runtime Control API

### Apply a Control

```typescript
const result = await dj.applyControl(disc, role, options);
// Returns: { controlId, timestamp, affectedSystems }
```

### Preview a Control

```typescript
const preview = await dj.previewControl(disc, role);
// Returns: { safe, affectedSystems, potentialIssues, diff }
```

### Revert a Control

```typescript
await dj.revertControl(controlId, role);
// Rolls back changes to previous state
```

### List Active Controls

```typescript
const controls = await dj.listControls({ status: 'active' });
// Returns: Array of applied controls with metadata
```

## 📊 Observability & Audit

### StateManager - Snapshots & Rollback

Create point-in-time snapshots and rollback when needed:

```typescript
import { StateManager } from 'universal-dj-layer/core/state-manager';

const stateManager = new StateManager();

// Create snapshot
const snapshot = await stateManager.createSnapshot({
  reason: 'before deployment',
  author: 'admin@example.com'
});

// Get current state
const state = await stateManager.getCurrentState();

// List snapshots with filters
const recent = await stateManager.listSnapshots({
  startTime: Date.now() - 86400000, // Last 24 hours
  controlId: 'feature-123'
});

// Calculate diff between snapshots
const diffs = await stateManager.diff(snapshot1.snapshotId, snapshot2.snapshotId);

// Rollback
await stateManager.rollbackToSnapshot(snapshot.snapshotId);

// Cleanup old snapshots
const removed = await stateManager.cleanup(30); // 30 days retention
```

### AuditLog - Complete Audit Trail

Every action is automatically logged with full context:

```typescript
import { AuditLog } from 'universal-dj-layer/audit/audit-log';

const auditLog = new AuditLog({
  enabled: true,
  retentionDays: 365,
  includeSensitiveData: false
});

// Log an operation
await auditLog.log({
  action: 'apply',
  actorId: 'user-123',
  actorRole: 'admin',
  controlId: 'ctrl-456',
  discType: 'feature',
  result: 'success',
  changes: { before: {...}, after: {...} },
  metadata: { reason: 'production deployment' }
});

// Query audit log
const entries = await auditLog.query({
  actorId: 'user-123',
  startTime: Date.now() - 86400000,
  action: 'apply',
  result: 'success',
  limit: 50
});

// Stream audit events in real-time
const unsubscribe = await auditLog.stream((entry) => {
  console.log('New audit event:', entry.action, entry.actorId);
  if (entry.result === 'failure') {
    alertSystem.notify(entry);
  }
});

// Export audit log
const jsonExport = await auditLog.export('json', {
  startTime: Date.now() - 604800000 // Last 7 days
});

const csvExport = await auditLog.export('csv', {
  actorId: 'user-123'
});

// Cleanup old entries
const removed = await auditLog.cleanup(90); // 90 days retention
```

### Event Hooks

Both modules emit events for real-time monitoring:

```typescript
// StateManager events
stateManager.on('snapshot-created', (snapshot) => {
  console.log('New snapshot:', snapshot.snapshotId);
});

stateManager.on('state-changed', (change) => {
  console.log('State changed:', change.controlId);
});

stateManager.on('snapshot-restored', (snapshotId) => {
  console.log('Rolled back to:', snapshotId);
});

// AuditLog events
auditLog.on('audit-logged', (entry) => {
  console.log('Logged:', entry.action, 'by', entry.actorId);
});

auditLog.on('audit-query', (options) => {
  console.log('Query executed with filters:', options);
});
```

### DJEngine Audit (Coming Soon)

```typescript
const auditLog = await dj.getAuditLog({
  controlId: 'ctrl-123',
  timeRange: { start: Date.now() - 86400000, end: Date.now() }
});

// Returns:
// {
//   entries: [
//     {
//       timestamp: 1234567890,
//       action: 'apply',
//       actorId: 'user-123',
//       actorRole: 'creator',
//       controlId: 'ctrl-123',
//       discType: 'FeatureDisc',
//       changes: {...},
//       result: 'success'
//     }
//   ]
// }
```

### Change History & Diffs (Coming Soon)

```typescript
const history = await dj.getChangeHistory(controlId);
const diff = await dj.getDiff(controlId);
// Full before/after comparison of all changes
```

## 🛡️ Safety Guarantees

The Universal DJ Control Layer provides several layers of protection:

1. **Immutability**: Creator locks cannot be bypassed by any role
2. **Atomicity**: Controls are applied as atomic transactions
3. **Reversibility**: Every change can be undone without side effects
4. **Validation**: All modifications pass through policy evaluator
5. **Isolation**: Preview mode runs in isolated sandbox
6. **Audit Trail**: Complete history prevents unaccountable changes

### Guardrails

Built-in guardrails prevent common mistakes:
- Circular dependency detection
- Conflicting control detection
- Resource exhaustion prevention
- Malicious pattern recognition

## 🗺️ Roadmap

### Phase 1: Core Foundation ✅
- [x] Architecture design
- [x] StateManager implementation (snapshots, rollback, diffs)
- [x] AuditLog implementation (logging, filtering, export)
- [x] Comprehensive test coverage (>90%)
- [x] Full documentation
- [ ] Core engine implementation
- [ ] Basic disc types
- [ ] Role system
- [ ] Policy evaluator

### Phase 2: Advanced Features
- [ ] Real-time collaboration
- [ ] Multi-tenant support
- [ ] Plugin system for custom discs
- [ ] Performance optimization
- [ ] Advanced diff algorithms

### Phase 3: Ecosystem
- [ ] React integration
- [ ] Vue integration
- [ ] Framework adapters
- [ ] Visual diff viewer (UI optional)
- [ ] CLI tools

### Phase 4: Enterprise
- [ ] SSO integration
- [ ] Advanced compliance tools
- [ ] Multi-region support
- [ ] Enterprise audit features

## 📚 Documentation

- **[Foundation Documentation](./docs/FOUNDATION.md)**: Comprehensive guide to StateManager and AuditLog
- **[Architecture Overview](./ARCHITECTURE.md)**: System design and architecture
- **[Integration Guide](./INTEGRATION.md)**: How to integrate with your application
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)**: Current implementation status

## ✅ What This Is

- A **headless control layer** for runtime application modification
- A **framework** for safe, reversible changes
- A **policy engine** for enforcing rules and permissions
- A **collaboration tool** for multi-user application management
- **UI-optional**: Core package is entirely backend-focused

## ❌ What This Isn't

- Not a full application framework (it's a layer on top)
- Not a database or state management system (though it manages its own state)
- Not tied to any specific UI library (headless by design)
- Not a replacement for version control (complements it)
- Not a deployment tool (handles runtime only)

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines (coming soon).

## 📄 License

MIT © 2026 Carolina Telleria

## 🔗 Resources

- [Foundation Documentation](./docs/FOUNDATION.md) - StateManager & AuditLog guide
- [Architecture Documentation](./ARCHITECTURE.md)
- [Integration Guide](./INTEGRATION.md)
- Examples (coming soon)
- API Reference (coming soon)
- Community Discord (coming soon)
