# Universal DJ Control Layer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

The DJ Control Layer is a universal, pluggable system that enables safe collaboration, real-time experimentation, and role-based tuning in any host application. Modular "discs" allow reversible changes while preserving core logic, purpose, security, and creator ownership, with full auditing and observability.

## 🎯 Key Features

- **🔌 Pluggable Architecture**: Add modular "discs" to extend functionality without modifying core code
- **👥 Role-Based Access Control (RBAC)**: Four-tier permission system (Viewer, Experimenter, Admin, Owner)
- **📝 Complete Audit Logging**: Track all changes with detailed audit trails
- **⏮️ Reversible Changes**: State snapshots and rollback capabilities for safe experimentation
- **👤 Cross-User Isolation**: Isolated contexts for different users to prevent conflicts
- **✅ Compliance Validation**: Pluggable compliance rules to enforce organizational policies
- **🔗 Integration Hooks**: Lifecycle hooks for seamless host application integration
- **🔒 Security First**: Permission enforcement and validation at every level

## 📦 Installation

```bash
npm install universal-dj-layer
```

## 🚀 Quick Start

```typescript
import {
  DJControlLayer,
  Role,
  User,
  ThemeDisc,
  FeatureFlagDisc
} from 'universal-dj-layer';

// Initialize the DJ Control Layer
const djLayer = new DJControlLayer({
  enableAuditLog: true,
  maxSnapshots: 100,
  enableUserIsolation: true
});

// Create a user
const adminUser: User = {
  id: 'user-001',
  name: 'Admin User',
  role: Role.ADMIN
};

// Add a disc
const themeDisc = new ThemeDisc();
await djLayer.addDisc(themeDisc, adminUser);

// Enable the disc
await djLayer.enableDisc('theme-disc', adminUser);

// Execute the disc
const result = await djLayer.executeDisc('theme-disc', {}, adminUser);
```

## 📚 Core Concepts

### Discs

Discs are modular components that encapsulate specific functionality. Each disc:
- Has its own state and configuration
- Defines required permissions and roles
- Can be enabled/disabled independently
- Supports validation and cleanup

### Roles & Permissions

Four-tier role hierarchy:
1. **Viewer** - Read-only access
2. **Experimenter** - Can execute and modify disc configurations
3. **Admin** - Full control over discs and settings
4. **Owner** - Complete system access

Granular permissions:
- `READ` - View disc configurations and states
- `WRITE` - Modify disc configurations
- `EXECUTE` - Run disc operations
- `DELETE` - Remove discs
- `CONFIGURE` - Change system settings

### State Management

- **Snapshots**: Create point-in-time backups of all disc states
- **Rollback**: Restore to any previous snapshot
- **Isolation**: Per-user state contexts prevent conflicts

### Audit Logging

Every action is logged with:
- User identity and role
- Action type and timestamp
- Previous and new states
- Custom metadata

## 🛠️ Creating Custom Discs

```typescript
import { Disc, DiscMetadata, Role, Permission } from 'universal-dj-layer';

export class CustomDisc extends Disc {
  constructor() {
    const metadata: DiscMetadata = {
      id: 'custom-disc',
      name: 'Custom Disc',
      version: '1.0.0',
      description: 'My custom disc',
      author: 'Your Name',
      requiredRole: Role.EXPERIMENTER,
      requiredPermissions: [Permission.READ, Permission.WRITE]
    };
    super(metadata);
  }

  async initialize(): Promise<void> {
    // Initialize resources
  }

  async cleanup(): Promise<void> {
    // Clean up resources
  }

  async execute(context: any): Promise<any> {
    // Execute disc logic
    return { success: true };
  }

  async validate(data: any): Promise<boolean> {
    // Validate data
    return true;
  }
}
```

## 🔗 Integration Hooks

```typescript
const djLayer = new DJControlLayer({
  hooks: {
    onBeforeChange: async (context) => {
      console.log(`Change requested: ${context.action}`);
      return true; // Allow or block the change
    },
    onAfterChange: async (context) => {
      console.log(`Change completed: ${context.action}`);
    },
    onBeforeRollback: async (snapshotId) => {
      return true; // Allow or block the rollback
    },
    onAfterRollback: async (snapshotId) => {
      console.log(`Rolled back to: ${snapshotId}`);
    },
    onAuditLog: async (entry) => {
      // Send to external logging system
    }
  }
});
```

## ✅ Compliance Rules

```typescript
import { ComplianceRule } from 'universal-dj-layer';

const customRule: ComplianceRule = {
  id: 'data-privacy',
  name: 'Data Privacy Rule',
  description: 'Ensures compliance with data privacy policies',
  validate: async (context) => {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Your validation logic here
    if (context.data.includesPersonalData) {
      violations.push('Personal data not allowed');
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings
    };
  }
};

const djLayer = new DJControlLayer({
  complianceRules: [customRule]
});
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📖 API Documentation

### DJControlLayer

Main class for managing the control layer.

#### Methods

- `addDisc(disc, user)` - Add a disc to the layer
- `removeDisc(discId, user)` - Remove a disc from the layer
- `getDisc(discId)` - Get a disc by ID
- `getAllDiscs()` - Get all discs
- `enableDisc(discId, user)` - Enable a disc
- `disableDisc(discId, user)` - Disable a disc
- `executeDisc(discId, context, user)` - Execute a disc
- `updateDiscConfig(discId, config, user)` - Update disc configuration
- `createSnapshot(user, description?)` - Create a state snapshot
- `rollbackToSnapshot(snapshotId, user)` - Rollback to a snapshot
- `getAuditLogs(user)` - Get audit logs
- `exportState()` - Export entire layer state

### Disc (Base Class)

Abstract base class for all discs.

#### Methods

- `getMetadata()` - Get disc metadata
- `getState()` - Get disc state
- `setState(state, userId)` - Set disc state
- `enable(userId)` - Enable the disc
- `disable(userId)` - Disable the disc
- `isEnabled()` - Check if disc is enabled
- `updateConfig(config, userId)` - Update configuration
- `getConfig()` - Get configuration
- `initialize()` - Initialize the disc (abstract)
- `cleanup()` - Clean up the disc (abstract)
- `execute(context)` - Execute disc logic (abstract)
- `validate(data)` - Validate data (abstract)

## 📋 Example Discs

### ThemeDisc

Manages UI theme and visual settings.

```typescript
import { ThemeDisc } from 'universal-dj-layer';

const themeDisc = new ThemeDisc();
await djLayer.addDisc(themeDisc, adminUser);

// Update theme
await djLayer.updateDiscConfig('theme-disc', {
  primaryColor: '#ff6347',
  darkMode: true,
  fontSize: 'large'
}, experimenterUser);
```

### FeatureFlagDisc

Manages feature toggles with rollout control.

```typescript
import { FeatureFlagDisc } from 'universal-dj-layer';

const ffDisc = new FeatureFlagDisc();
await djLayer.addDisc(ffDisc, adminUser);

// Get the disc and set flags
const disc = djLayer.getDisc('feature-flag-disc') as FeatureFlagDisc;
disc.setFeatureFlag('new-feature', true, userId, {
  rolloutPercentage: 50,
  userWhitelist: ['user-123', 'user-456']
});

// Check if feature is enabled
const isEnabled = disc.isFeatureEnabled('new-feature', userId);
```

## 🔐 Security Considerations

1. **Always validate user permissions** before allowing operations
2. **Use compliance rules** to enforce organizational policies
3. **Enable audit logging** in production environments
4. **Regularly review audit logs** for suspicious activity
5. **Implement integration hooks** to add custom security checks
6. **Use snapshots** before making significant changes
7. **Isolate user contexts** to prevent cross-user data leakage

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

Carolina Telleria

## 🙏 Acknowledgments

- Designed for safe experimentation and collaboration
- Built with TypeScript for type safety
- Comprehensive test coverage with Jest
