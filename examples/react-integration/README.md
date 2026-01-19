# React Integration for Universal DJ Layer

Complete React integration for the Universal DJ Layer, providing hooks, components, and patterns for building DJ-powered React applications.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Hooks](#hooks)
- [Components](#components)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Installation

```bash
npm install universal-dj-layer react react-dom
# or
yarn add universal-dj-layer react react-dom
```

Peer dependencies:
- `react` >= 16.8.0 (hooks support)
- `react-dom` >= 16.8.0

## Quick Start

### 1. Set up DJ Engine Provider

Wrap your app with the `DJEngineProvider` to make DJ Layer available to all components:

```tsx
import React from 'react';
import { DJEngine } from 'universal-dj-layer';
import { StateManager } from 'universal-dj-layer/core/state-manager';
import { AuditLog } from 'universal-dj-layer/audit/audit-log';
import { DJEngineProvider } from './react-integration/components';

// Initialize DJ Layer
const djEngine = new DJEngine({
  creatorId: 'creator-123',
  enableAudit: true,
});

const stateManager = new StateManager({
  maxSnapshots: 100,
});

const auditLog = new AuditLog({
  enabled: true,
  retentionDays: 365,
});

function App() {
  return (
    <DJEngineProvider 
      djEngine={djEngine}
      stateManager={stateManager}
      auditLog={auditLog}
    >
      <YourApp />
    </DJEngineProvider>
  );
}
```

### 2. Use Hooks in Components

```tsx
import { useFeatureFlag, useControlAPI } from './react-integration/hooks';
import { useDJEngine } from './react-integration/components';

function MyComponent() {
  const djEngine = useDJEngine();
  const { enabled, toggle } = useFeatureFlag(djEngine, 'dark-mode');
  
  return (
    <div>
      <p>Dark mode is {enabled ? 'ON' : 'OFF'}</p>
      <button onClick={toggle}>Toggle</button>
    </div>
  );
}
```

### 3. Use Pre-built Components

```tsx
import { FeatureToggle, ControlPanel } from './react-integration/components';

function Dashboard() {
  return (
    <div>
      <FeatureToggle feature="beta-features">
        <BetaFeaturePanel />
      </FeatureToggle>
      
      <ControlPanel role={adminRole} />
    </div>
  );
}
```

## Hooks

### useFeatureFlag

Manage feature flags with reactive state.

```tsx
const { enabled, toggle, loading, error } = useFeatureFlag(djEngine, 'feature-key');
```

**Parameters:**
- `djEngine`: DJEngine instance
- `featureKey`: Feature flag identifier

**Returns:**
- `enabled`: Boolean indicating if feature is enabled
- `toggle`: Function to toggle the feature
- `loading`: Boolean indicating loading state
- `error`: Error object if operation failed

**Example:**

```tsx
function FeatureDemo() {
  const djEngine = useDJEngine();
  const { enabled, toggle, loading } = useFeatureFlag(djEngine, 'advanced-search');
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>Advanced Search</h2>
      <label>
        <input type="checkbox" checked={enabled} onChange={toggle} />
        Enable Advanced Search
      </label>
      {enabled && <AdvancedSearchComponent />}
    </div>
  );
}
```

### useTheme

Manage application theme via DJ Layer.

```tsx
const { theme, setTheme, loading, error } = useTheme(djEngine);
```

**Example:**

```tsx
function ThemeSelector() {
  const djEngine = useDJEngine();
  const { theme, setTheme, loading } = useTheme(djEngine);
  
  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="auto">Auto</option>
    </select>
  );
}
```

### useControlAPI

Full access to DJ Engine control operations.

```tsx
const {
  controls,
  loading,
  error,
  applyControl,
  revertControl,
  previewControl,
  refreshControls,
} = useControlAPI(djEngine);
```

**Example:**

```tsx
function ControlManager() {
  const djEngine = useDJEngine();
  const { controls, applyControl, revertControl } = useControlAPI(djEngine);
  
  const handleApply = async () => {
    const disc = new FeatureDisc({
      name: 'beta-features',
      features: { 'new-ui': true },
    });
    
    await applyControl(disc, adminRole);
  };
  
  return (
    <div>
      <button onClick={handleApply}>Apply Control</button>
      <ul>
        {controls.map(control => (
          <li key={control.controlId}>
            {control.controlId}
            <button onClick={() => revertControl(control.controlId, adminRole)}>
              Revert
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### useStateSnapshots

Manage state snapshots and rollbacks.

```tsx
const {
  snapshots,
  loading,
  error,
  createSnapshot,
  rollback,
  loadSnapshots,
} = useStateSnapshots(stateManager);
```

**Example:**

```tsx
function SnapshotControls() {
  const stateManager = useStateManager();
  const { snapshots, createSnapshot, rollback } = useStateSnapshots(stateManager);
  
  return (
    <div>
      <button onClick={() => createSnapshot({ reason: 'Manual backup' })}>
        Create Snapshot
      </button>
      <ul>
        {snapshots.map(snapshot => (
          <li key={snapshot.snapshotId}>
            {new Date(snapshot.timestamp).toLocaleString()}
            <button onClick={() => rollback(snapshot.snapshotId)}>
              Rollback
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### useAuditLog

Stream audit log entries in real-time.

```tsx
const { entries, loading, error } = useAuditLog(auditLog, options);
```

**Example:**

```tsx
function AuditStream() {
  const auditLog = useAuditLogContext();
  const { entries } = useAuditLog(auditLog, { limit: 20 });
  
  return (
    <div>
      <h2>Recent Activity</h2>
      {entries.map(entry => (
        <div key={entry.entryId}>
          {entry.action} by {entry.actorId} - {entry.result}
        </div>
      ))}
    </div>
  );
}
```

## Components

### DJEngineProvider

Root provider component that injects DJ Layer context.

```tsx
<DJEngineProvider 
  djEngine={djEngine}
  stateManager={stateManager}
  auditLog={auditLog}
>
  <App />
</DJEngineProvider>
```

### FeatureToggle

Conditional rendering based on feature flags.

```tsx
<FeatureToggle feature="dark-mode" fallback={<LightModeUI />}>
  <DarkModeUI />
</FeatureToggle>
```

**Props:**
- `feature`: Feature flag key
- `children`: Content to render when enabled
- `fallback`: Optional content when disabled

### ThemeProvider

Automatic theme application and management.

```tsx
<ThemeProvider>
  <App />
</ThemeProvider>
```

Automatically applies theme to `document.documentElement` via `data-theme` attribute.

### ControlPanel

Admin panel for managing active controls.

```tsx
<ControlPanel role={adminRole} />
```

**Features:**
- List active controls
- View control details
- Revert controls
- Real-time updates

### AuditLogViewer

Display and filter audit log entries.

```tsx
<AuditLogViewer actorId="user-123" limit={50} />
```

**Props:**
- `actorId`: Optional filter by actor
- `limit`: Maximum entries to show

### SnapshotManager

Manage state snapshots with UI.

```tsx
<SnapshotManager />
```

**Features:**
- Create new snapshots
- View snapshot history
- Rollback to previous states
- Real-time updates

### ControlPreview

Preview control changes before applying.

```tsx
<ControlPreview 
  disc={featureDisc} 
  role={userRole}
  onApply={() => console.log('Applied')}
  onCancel={() => console.log('Cancelled')}
/>
```

**Props:**
- `disc`: Disc to preview
- `role`: User role
- `onApply`: Callback when applied
- `onCancel`: Callback when cancelled

## Examples

### Complete Feature Flag Example

```tsx
import React from 'react';
import { DJEngine, FeatureDisc } from 'universal-dj-layer';
import { DJEngineProvider, FeatureToggle } from './react-integration/components';
import { useFeatureFlag, useDJEngine } from './react-integration/hooks';

const djEngine = new DJEngine({ creatorId: 'creator-1' });

function FeatureFlagDemo() {
  const djEngine = useDJEngine();
  const darkMode = useFeatureFlag(djEngine, 'dark-mode');
  const betaUI = useFeatureFlag(djEngine, 'beta-ui');
  
  return (
    <div>
      <h1>Feature Flags Demo</h1>
      
      <div>
        <label>
          <input type="checkbox" checked={darkMode.enabled} onChange={darkMode.toggle} />
          Dark Mode
        </label>
      </div>
      
      <div>
        <label>
          <input type="checkbox" checked={betaUI.enabled} onChange={betaUI.toggle} />
          Beta UI
        </label>
      </div>
      
      <FeatureToggle feature="beta-ui">
        <div>🎉 Beta UI is enabled!</div>
      </FeatureToggle>
    </div>
  );
}

export default function App() {
  return (
    <DJEngineProvider djEngine={djEngine}>
      <FeatureFlagDemo />
    </DJEngineProvider>
  );
}
```

### Admin Dashboard Example

```tsx
import React from 'react';
import { 
  ControlPanel, 
  AuditLogViewer, 
  SnapshotManager 
} from './react-integration/components';

function AdminDashboard({ role }: { role: any }) {
  return (
    <div className="admin-dashboard">
      <h1>DJ Control Dashboard</h1>
      
      <section>
        <ControlPanel role={role} />
      </section>
      
      <section>
        <SnapshotManager />
      </section>
      
      <section>
        <AuditLogViewer limit={100} />
      </section>
    </div>
  );
}
```

### Real-time Collaboration Example

```tsx
import React, { useEffect } from 'react';
import { useAuditLog, useControlAPI } from './react-integration/hooks';

function CollaborationPanel() {
  const auditLog = useAuditLogContext();
  const { entries } = useAuditLog(auditLog);
  const { controls, refreshControls } = useControlAPI(useDJEngine());
  
  // Refresh controls when audit entries change
  useEffect(() => {
    refreshControls();
  }, [entries, refreshControls]);
  
  return (
    <div>
      <h2>Team Activity</h2>
      <div className="activity-feed">
        {entries.slice(0, 10).map(entry => (
          <div key={entry.entryId} className="activity-item">
            <strong>{entry.actorId}</strong> {entry.action} 
            {entry.controlId && <span> control {entry.controlId}</span>}
            <span className="time">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Best Practices

### 1. Provider Placement

Place `DJEngineProvider` at the root of your app to ensure all components have access:

```tsx
// ✅ Good
<DJEngineProvider djEngine={djEngine}>
  <Router>
    <App />
  </Router>
</DJEngineProvider>

// ❌ Bad - Provider inside router loses context
<Router>
  <DJEngineProvider djEngine={djEngine}>
    <App />
  </DJEngineProvider>
</Router>
```

### 2. Error Handling

Always handle errors from hooks:

```tsx
const { enabled, error } = useFeatureFlag(djEngine, 'feature');

if (error) {
  return <ErrorBoundary error={error} />;
}
```

### 3. Loading States

Show loading indicators during async operations:

```tsx
const { loading, controls } = useControlAPI(djEngine);

if (loading) {
  return <LoadingSpinner />;
}
```

### 4. Memoization

Memoize callbacks to prevent unnecessary re-renders:

```tsx
const handleToggle = useCallback(async () => {
  await toggle();
}, [toggle]);
```

### 5. Cleanup

Hooks automatically handle cleanup, but ensure you don't leak subscriptions:

```tsx
useEffect(() => {
  const unsubscribe = auditLog.stream(handleEntry);
  return () => unsubscribe();
}, [auditLog]);
```

### 6. Context Usage

Use context hooks only within provider:

```tsx
function MyComponent() {
  // ✅ Good - check if provider exists
  try {
    const djEngine = useDJEngine();
  } catch (error) {
    return <div>DJ Engine not available</div>;
  }
}
```

### 7. Optimistic Updates

Update UI optimistically for better UX:

```tsx
const handleToggle = async () => {
  setEnabled(prev => !prev); // Optimistic update
  try {
    await toggle();
  } catch (error) {
    setEnabled(prev => !prev); // Rollback on error
  }
};
```

## TypeScript Support

All hooks and components are fully typed:

```tsx
import type { ControlResult, PreviewResult } from 'universal-dj-layer';
import type { Disc } from 'universal-dj-layer/discs/feature-disc';

function TypedComponent() {
  const { controls }: { controls: ControlResult[] } = useControlAPI(djEngine);
  const { preview }: { preview: PreviewResult | null } = useState(null);
}
```

## CSS Styling

Add your own styles or use these base classes:

```css
.control-panel { /* ... */ }
.control-item { /* ... */ }
.audit-log { /* ... */ }
.audit-entry { /* ... */ }
.snapshot-manager { /* ... */ }
.snapshot-item { /* ... */ }
.control-preview { /* ... */ }
```

## Related Documentation

- [Getting Started Guide](../../docs/GETTING_STARTED.md)
- [API Documentation](../../docs/API.md)
- [Core Concepts](../../README.md#core-concepts)
- [Disc Development](../../docs/DISC_DEVELOPMENT.md)

## License

MIT © 2026 Carolina Telleria
