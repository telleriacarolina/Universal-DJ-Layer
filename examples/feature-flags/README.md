# Feature Flags Example

A complete feature flag implementation demonstrating controlled rollouts, A/B testing, and user targeting.

## Features

- 🎯 **Feature Toggle UI**: Enable/disable features dynamically
- 📊 **Percentage Rollout**: Gradual rollout from 0% to 100%
- 👥 **User Targeting**: Allowlist and blocklist support
- 🧪 **A/B Testing**: Split traffic for experiments
- 📈 **Real-time Monitoring**: Dashboard for feature status

## Usage

### Basic Setup

```typescript
import { FeatureFlagManager } from './examples/feature-flags';
import { Role } from './src/core/types';

const manager = new FeatureFlagManager('admin', Role.ADMIN);
await manager.initialize();
```

### Creating Feature Flags

```typescript
// Create a disabled feature flag
await manager.createFlag('new-search', {
  enabled: false,
  rolloutPercentage: 0
});

// Create an enabled flag with partial rollout
await manager.createFlag('dark-mode', {
  enabled: true,
  rolloutPercentage: 50
});

// Create a flag with user whitelist
await manager.createFlag('beta-features', {
  enabled: true,
  rolloutPercentage: 100,
  userWhitelist: ['user-001', 'user-002']
});
```

### Gradual Rollout

```typescript
// Enable the feature
await manager.enableFlag('new-search');

// Gradually increase rollout
await manager.setRollout('new-search', 10);  // 10% of users
await manager.setRollout('new-search', 50);  // 50% of users
await manager.setRollout('new-search', 100); // All users
```

### Checking Feature Status

```typescript
// Check if feature is enabled for a specific user
const isEnabled = await manager.isEnabled('new-search', 'user-123');

if (isEnabled) {
  // Show new search UI
} else {
  // Show legacy search UI
}
```

### User Targeting

```typescript
// Add user to whitelist (always enabled)
await manager.addToWhitelist('new-feature', 'user-123');

// Add user to blacklist (always disabled)
await manager.addToBlacklist('new-feature', 'user-456');
```

### Dashboard Monitoring

```typescript
import { FeatureFlagDashboard } from './examples/feature-flags';

const dashboard = new FeatureFlagDashboard(manager);

// Display all feature flags
await dashboard.displayAllFlags();

// Display summary statistics
await dashboard.displaySummary();

// Display rollout progress for a feature
await dashboard.displayRolloutProgress('new-search');

// Check status for a specific user
await dashboard.displayFlagStatus('new-search', 'user-123');

// Test feature for multiple users
await dashboard.testFlagForUsers('new-search', [
  'user-001', 'user-002', 'user-003'
]);
```

## Running the Demo

```bash
# Compile TypeScript
npm run build

# Run the demo
node dist/examples/feature-flags/demo.js
```

Or with ts-node:

```bash
npx ts-node examples/feature-flags/demo.ts
```

## Demo Output

The demo demonstrates:

1. **Creating Feature Flags**: Multiple flags with different configurations
2. **Gradual Rollout**: 0% → 10% → 50% → 100% with visual progress
3. **User Targeting**: Whitelist/blacklist functionality
4. **A/B Testing**: 50/50 split for experiments
5. **Status Monitoring**: Real-time dashboard views

## Integration Example

```typescript
// In your application
import { FeatureFlagManager } from 'universal-dj-layer/examples/feature-flags';

class Application {
  private featureFlags: FeatureFlagManager;

  async initialize() {
    this.featureFlags = new FeatureFlagManager('system', Role.ADMIN);
    await this.featureFlags.initialize();

    // Set up initial flags
    await this.featureFlags.createFlag('new-ui', {
      enabled: true,
      rolloutPercentage: 25
    });
  }

  async renderForUser(userId: string) {
    const useNewUI = await this.featureFlags.isEnabled('new-ui', userId);
    
    if (useNewUI) {
      return this.renderNewUI();
    } else {
      return this.renderLegacyUI();
    }
  }
}
```

## API Reference

### FeatureFlagManager

#### Methods

- `initialize()`: Initialize the manager
- `createFlag(name, options)`: Create a new feature flag
- `enableFlag(name)`: Enable a feature flag
- `disableFlag(name)`: Disable a feature flag
- `setRollout(name, percentage)`: Set rollout percentage (0-100)
- `isEnabled(featureName, userId)`: Check if feature is enabled for user
- `addToWhitelist(featureName, userId)`: Add user to whitelist
- `addToBlacklist(featureName, userId)`: Add user to blacklist
- `getAllFlags()`: Get all feature flags
- `getStatus(featureName, userId)`: Get detailed status for user
- `deleteFlag(name)`: Delete a feature flag
- `cleanup()`: Cleanup resources

### FeatureFlagDashboard

#### Methods

- `displayAllFlags()`: Show all feature flags in table format
- `displaySummary()`: Show summary statistics
- `displayRolloutProgress(featureName)`: Show rollout progress bar
- `displayFlagStatus(featureName, userId)`: Show status for specific user
- `testFlagForUsers(featureName, userIds)`: Test flag for multiple users

## Best Practices

1. **Start Conservative**: Begin with low rollout percentages (5-10%)
2. **Monitor Metrics**: Watch for errors or performance issues during rollout
3. **Use Whitelists**: Add internal users to whitelist for early testing
4. **Document Flags**: Keep track of what each flag controls
5. **Clean Up**: Remove flags after full rollout is complete
6. **A/B Testing**: Use 50/50 splits for statistical significance

## Common Patterns

### Kill Switch

```typescript
// Quick disable if issues arise
await manager.disableFlag('problematic-feature');
```

### Canary Release

```typescript
// Release to small percentage first
await manager.setRollout('new-feature', 5);
// Monitor metrics...
// Gradually increase if stable
await manager.setRollout('new-feature', 25);
await manager.setRollout('new-feature', 50);
await manager.setRollout('new-feature', 100);
```

### Beta Program

```typescript
// Enable only for beta users
await manager.createFlag('beta-feature', {
  enabled: true,
  rolloutPercentage: 0,
  userWhitelist: betaUsers
});
```

## Related Examples

- [A/B Testing](../ab-testing/README.md) - Statistical experiment framework
- [Theme Switcher](../theme-switcher/README.md) - UI customization
- [Approval Workflow](../approval-workflow/README.md) - Change approval process

## Architecture

This example uses:
- **FeatureFlagDisc**: Core disc for feature flag logic
- **DJEngine**: Control layer orchestration
- **Role-Based Access**: ADMIN role required for flag management
- **State Management**: Persistent flag state via disc state

## Learn More

- [Getting Started Guide](../../docs/GETTING_STARTED.md)
- [Disc Development Guide](../../docs/DISC_DEVELOPMENT.md)
- [API Reference](../../docs/API.md)
