# Getting Started with Universal DJ Layer

A comprehensive guide to installing, configuring, and using the Universal DJ Layer in your applications.

## Table of Contents

- [What is Universal DJ Layer?](#what-is-universal-dj-layer)
- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [Quick Start](#quick-start)
- [Your First Control Application](#your-first-control-application)
- [Common Patterns](#common-patterns)
- [Next Steps](#next-steps)

## What is Universal DJ Layer?

Universal DJ Layer is a headless TypeScript framework that enables **runtime control** of application behavior without modifying source code. Think of it as a control panel for your running application.

### Key Benefits

- **Preview-Before-Apply**: Test changes safely before committing
- **Instant Rollback**: Revert any change without downtime
- **Role-Based Access**: Fine-grained permissions for different users
- **Full Audit Trail**: Every change is logged for compliance
- **Headless Design**: No UI dependencies, works anywhere
- **Type-Safe**: Built with TypeScript for reliability

### When to Use DJ Layer

✅ **Great for:**
- Feature flags and A/B testing
- Runtime configuration changes
- Multi-tenant customization
- Collaborative application management
- Gradual rollouts and experiments

❌ **Not designed for:**
- Source code version control (use Git)
- Data persistence (use a database)
- Authentication systems (integrate with your auth)

## Installation

### Prerequisites

- Node.js >= 14.0.0
- TypeScript >= 4.5.0 (optional but recommended)

### NPM Installation

```bash
npm install universal-dj-layer
```

### Yarn Installation

```bash
yarn add universal-dj-layer
```

### Verify Installation

```bash
npm list universal-dj-layer
```

## Core Concepts

### 1. DJEngine

The **orchestrator** that coordinates all operations. Think of it as the control center.

```typescript
import { DJEngine } from 'universal-dj-layer';

const dj = new DJEngine({
  creatorId: 'user-123',
  enableAudit: true,
});
```

### 2. Discs

**Modular control units** that modify specific aspects of your application. Each disc type handles a different domain:

- **FeatureDisc**: Toggle features on/off
- **UIDisc**: Modify interface elements
- **PermissionDisc**: Change access controls
- **FlowDisc**: Alter user journeys
- **BehaviorDisc**: Adjust application logic

```typescript
import { FeatureDisc } from 'universal-dj-layer';

const betaFeatures = new FeatureDisc({
  name: 'beta-features',
  features: {
    'advanced-search': true,
    'dark-mode': false,
  },
});
```

### 3. Roles

Define **who can do what** in your application:

- **Creator**: Original owner with full control
- **Admin**: Broad permissions, no override power
- **Moderator**: Content management
- **Collaborator**: Propose changes
- **User**: Basic access
- **AI Agent**: Automated operations

```typescript
import { CreatorRole } from 'universal-dj-layer';

const creator = new CreatorRole({
  userId: 'user-123',
});
```

### 4. StateManager

Manages **snapshots and rollbacks** of your application state:

```typescript
import { StateManager } from 'universal-dj-layer/core/state-manager';

const stateManager = new StateManager({
  maxSnapshots: 100,
  enablePersistence: false,
});
```

### 5. AuditLog

Records **every action** for compliance and debugging:

```typescript
import { AuditLog } from 'universal-dj-layer/audit/audit-log';

const auditLog = new AuditLog({
  enabled: true,
  retentionDays: 365,
});
```

## Quick Start

### Step 1: Initialize Core Components

Create a new file `dj-setup.ts`:

```typescript
import { StateManager } from 'universal-dj-layer/core/state-manager';
import { AuditLog } from 'universal-dj-layer/audit/audit-log';

// Initialize StateManager
export const stateManager = new StateManager({
  maxSnapshots: 100,
  enablePersistence: false,
});

// Initialize AuditLog
export const auditLog = new AuditLog({
  enabled: true,
  retentionDays: 365,
  includeSensitiveData: false,
});

// Set up event listeners
stateManager.on('state-changed', (change) => {
  console.log('State changed:', change.controlId);
});

auditLog.on('audit-logged', (entry) => {
  console.log('Audit logged:', entry.action, 'by', entry.actorId);
});
```

### Step 2: Create Your First Snapshot

```typescript
import { stateManager, auditLog } from './dj-setup';

async function main() {
  // Create initial snapshot
  const snapshot = await stateManager.createSnapshot({
    reason: 'Initial state',
    author: 'admin@example.com',
  });

  console.log('Snapshot created:', snapshot.snapshotId);

  // Log the snapshot creation
  await auditLog.log({
    action: 'preview',
    actorId: 'admin@example.com',
    actorRole: 'admin',
    result: 'success',
    metadata: { snapshotId: snapshot.snapshotId },
  });
}

main();
```

### Step 3: Apply State Changes

```typescript
import { stateManager, auditLog } from './dj-setup';

async function applyFeatureFlags() {
  // Apply feature flag changes
  const change = await stateManager.applyDiscChanges('feature-flags', {
    darkMode: true,
    betaFeatures: ['advanced-search', 'real-time-collab'],
    experimentalUI: false,
  });

  // Log the change
  await auditLog.log({
    action: 'apply',
    actorId: 'admin@example.com',
    actorRole: 'admin',
    controlId: 'feature-flags',
    discType: 'feature',
    result: 'success',
    changes: {
      before: change.before,
      after: change.after,
    },
  });

  console.log('Features applied successfully');
}

applyFeatureFlags();
```

### Step 4: Query and Rollback

```typescript
import { stateManager, auditLog } from './dj-setup';

async function manageState() {
  // List all snapshots
  const snapshots = await stateManager.listSnapshots();
  console.log('Available snapshots:', snapshots.length);

  // Query audit log
  const entries = await auditLog.query({
    actorId: 'admin@example.com',
    startTime: Date.now() - 86400000, // Last 24 hours
    limit: 50,
  });
  console.log('Audit entries:', entries.length);

  // Rollback if needed
  if (snapshots.length > 0) {
    const latestSnapshot = snapshots[0];
    await stateManager.rollbackToSnapshot(latestSnapshot.snapshotId);
    
    await auditLog.log({
      action: 'revert',
      actorId: 'admin@example.com',
      actorRole: 'admin',
      result: 'success',
      metadata: { snapshotId: latestSnapshot.snapshotId },
    });
  }
}

manageState();
```

## Your First Control Application

Let's build a complete feature flag system:

### 1. Define the Application

```typescript
// app.ts
interface AppConfig {
  features: {
    darkMode: boolean;
    advancedSearch: boolean;
    realTimeCollab: boolean;
  };
  theme: string;
  limits: {
    maxUsers: number;
    maxProjects: number;
  };
}

let currentConfig: AppConfig = {
  features: {
    darkMode: false,
    advancedSearch: false,
    realTimeCollab: false,
  },
  theme: 'light',
  limits: {
    maxUsers: 100,
    maxProjects: 50,
  },
};

export function getConfig(): AppConfig {
  return { ...currentConfig };
}

export function updateConfig(newConfig: Partial<AppConfig>): void {
  currentConfig = { ...currentConfig, ...newConfig };
}
```

### 2. Create Control Layer

```typescript
// control-layer.ts
import { StateManager } from 'universal-dj-layer/core/state-manager';
import { AuditLog } from 'universal-dj-layer/audit/audit-log';
import { getConfig, updateConfig } from './app';

const stateManager = new StateManager();
const auditLog = new AuditLog();

export async function applyFeatureControl(
  userId: string,
  userRole: string,
  features: Record<string, boolean>
) {
  // Create snapshot before changes
  const snapshot = await stateManager.createSnapshot({
    reason: 'Before feature update',
    author: userId,
  });

  try {
    // Get current config
    const currentConfig = getConfig();

    // Apply changes
    const change = await stateManager.applyDiscChanges('feature-control', {
      features: { ...currentConfig.features, ...features },
    });

    // Update app config
    updateConfig({ features: { ...currentConfig.features, ...features } });

    // Log success
    await auditLog.log({
      action: 'apply',
      actorId: userId,
      actorRole: userRole,
      controlId: 'feature-control',
      discType: 'feature',
      result: 'success',
      changes: {
        before: change.before,
        after: change.after,
      },
    });

    return { success: true, snapshotId: snapshot.snapshotId };
  } catch (error) {
    // Rollback on error
    await stateManager.rollbackToSnapshot(snapshot.snapshotId);
    
    await auditLog.log({
      action: 'apply',
      actorId: userId,
      actorRole: userRole,
      controlId: 'feature-control',
      result: 'failure',
      error: (error as Error).message,
    });

    throw error;
  }
}

export async function revertToSnapshot(
  userId: string,
  userRole: string,
  snapshotId: string
) {
  await stateManager.rollbackToSnapshot(snapshotId);

  // Apply the reverted state to app
  const currentState = await stateManager.getCurrentState();
  if (currentState.features) {
    updateConfig({ features: currentState.features });
  }

  await auditLog.log({
    action: 'revert',
    actorId: userId,
    actorRole: userRole,
    result: 'success',
    metadata: { snapshotId },
  });
}

export { stateManager, auditLog };
```

### 3. Use in Application

```typescript
// main.ts
import { applyFeatureControl, revertToSnapshot, auditLog } from './control-layer';
import { getConfig } from './app';

async function main() {
  console.log('Initial config:', getConfig());

  // Admin enables dark mode
  await applyFeatureControl('admin@example.com', 'admin', {
    darkMode: true,
  });

  console.log('After dark mode:', getConfig());

  // Admin enables advanced search
  await applyFeatureControl('admin@example.com', 'admin', {
    advancedSearch: true,
  });

  console.log('After advanced search:', getConfig());

  // View audit log
  const entries = await auditLog.query({ limit: 10 });
  console.log('Audit trail:', entries.length, 'entries');

  // Stream real-time changes
  const unsubscribe = await auditLog.stream((entry) => {
    console.log('Real-time:', entry.action, 'by', entry.actorId);
  });

  // Later: cleanup
  // unsubscribe();
}

main();
```

## Common Patterns

### Pattern 1: Feature Flag with Fallback

```typescript
async function getFeatureState(feature: string): Promise<boolean> {
  const state = await stateManager.getCurrentState();
  return state.features?.[feature] ?? false;
}

// Usage
const isDarkModeEnabled = await getFeatureState('darkMode');
```

### Pattern 2: Snapshot Before Critical Operations

```typescript
async function criticalOperation(userId: string) {
  const snapshot = await stateManager.createSnapshot({
    reason: 'Before critical operation',
    author: userId,
  });

  try {
    // Perform operation
    await riskyOperation();
  } catch (error) {
    // Rollback on error
    await stateManager.rollbackToSnapshot(snapshot.snapshotId);
    throw error;
  }
}
```

### Pattern 3: Audit Log Query with Filters

```typescript
async function getUserActivity(userId: string, days: number = 7) {
  const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  const entries = await auditLog.query({
    actorId: userId,
    startTime,
    sortDirection: 'desc',
  });

  return entries;
}
```

### Pattern 4: Real-Time Monitoring

```typescript
function setupMonitoring() {
  // Monitor state changes
  stateManager.on('state-changed', async (change) => {
    console.log(`State changed by control: ${change.controlId}`);
    
    // Alert on critical changes
    if (isCriticalChange(change)) {
      await sendAlert(change);
    }
  });

  // Monitor audit events
  auditLog.on('audit-logged', (entry) => {
    if (entry.result === 'failure') {
      console.error(`Failed operation: ${entry.action} by ${entry.actorId}`);
    }
  });
}
```

### Pattern 5: Diff Calculation

```typescript
async function compareSnapshots(snapshotId1: string, snapshotId2: string) {
  const diffs = await stateManager.diff(snapshotId1, snapshotId2);
  
  console.log('Changes:');
  diffs.forEach(diff => {
    console.log(`  ${diff.path}: ${diff.type}`);
    if (diff.type === 'modified') {
      console.log(`    Before: ${diff.before}`);
      console.log(`    After: ${diff.after}`);
    }
  });
}
```

### Pattern 6: Periodic Cleanup

```typescript
async function scheduleCleanup() {
  // Run every day
  setInterval(async () => {
    // Clean old snapshots (keep 30 days)
    const removedSnapshots = await stateManager.cleanup(30);
    console.log(`Removed ${removedSnapshots} old snapshots`);

    // Clean old audit entries (keep 90 days)
    const removedEntries = await auditLog.cleanup(90);
    console.log(`Removed ${removedEntries} old audit entries`);
  }, 24 * 60 * 60 * 1000); // 24 hours
}
```

### Pattern 7: Export Audit Data

```typescript
async function exportAuditData(format: 'json' | 'csv' = 'json') {
  const data = await auditLog.export(format, {
    startTime: Date.now() - (30 * 24 * 60 * 60 * 1000), // Last 30 days
  });

  // Save to file
  const fs = require('fs');
  const filename = `audit-export-${Date.now()}.${format}`;
  fs.writeFileSync(filename, data);
  console.log(`Exported to ${filename}`);
}
```

## Next Steps

### Learn More

- **[API Documentation](./API.md)**: Detailed API reference
- **[Disc Development](./DISC_DEVELOPMENT.md)**: Create custom discs
- **[Security Guide](./SECURITY.md)**: RBAC and security best practices
- **[Troubleshooting](./TROUBLESHOOTING.md)**: Common issues and solutions

### Explore Examples

- [Feature Flags](../examples/feature-flags/README.md)
- [A/B Testing](../examples/ab-testing/README.md)
- [Theme Switcher](../examples/theme-switcher/README.md)
- [React Integration](../examples/react-integration/README.md)
- [Express.js Integration](../examples/express-integration/README.md)

### Join the Community

- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share ideas
- Contributing: Help improve the project

## Need Help?

- Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Review [API Documentation](./API.md)
- Browse [Examples](../examples/)
- Open a GitHub Issue

## License

MIT © 2026 Carolina Telleria
