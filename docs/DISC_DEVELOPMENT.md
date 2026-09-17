# Disc Development Guide

Learn how to create custom discs for the Universal DJ Layer.

## Table of Contents

- [What is a Disc?](#what-is-a-disc)
- [Base Class Requirements](#base-class-requirements)
- [Lifecycle Hooks](#lifecycle-hooks)
- [State Management](#state-management)
- [Best Practices](#best-practices)
- [Testing Strategies](#testing-strategies)
- [Publishing Discs](#publishing-discs)
- [Examples](#examples)

## What is a Disc?

A **disc** is a modular control unit that modifies a specific aspect of your application's behavior at runtime. Think of discs as plugins that can be applied, previewed, and reverted without changing source code.

### Disc Types

Common disc types include:

- **FeatureDisc**: Toggle features on/off
- **UIDisc**: Modify interface elements and themes
- **PermissionDisc**: Adjust access controls
- **FlowDisc**: Alter user journeys and navigation
- **BehaviorDisc**: Change application logic patterns
- **CustomDisc**: Your own domain-specific controls

### When to Create a Custom Disc

Create a custom disc when you need to:
- Control a specific domain not covered by built-in discs
- Package reusable runtime controls
- Provide safe, reversible modifications
- Enable non-technical users to modify behavior

## Base Class Requirements

All discs must implement the `Disc` interface:

```typescript
interface Disc {
  /** Metadata about this disc */
  metadata: DiscMetadata;
  
  /** Apply the disc's changes */
  apply(context: any): Promise<any>;
  
  /** Revert the disc's changes */
  revert(context: any): Promise<any>;
  
  /** Preview what the disc would do */
  preview(context: any): Promise<any>;
  
  /** Validate the disc configuration */
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

### Minimal Disc Implementation

```typescript
import type { Disc, DiscMetadata } from 'universal-dj-layer';

export interface MyDiscConfig {
  name: string;
  // Your configuration options
  settings: Record<string, any>;
}

export class MyDisc implements Disc {
  metadata: DiscMetadata;
  private config: MyDiscConfig;

  constructor(config: MyDiscConfig) {
    this.config = config;
    this.metadata = {
      id: this.generateId(),
      name: config.name,
      type: 'my-disc',
      version: '1.0.0',
      createdAt: Date.now(),
    };
  }

  async apply(context: any): Promise<any> {
    // Implementation
  }

  async revert(context: any): Promise<any> {
    // Implementation
  }

  async preview(context: any): Promise<any> {
    // Implementation
  }

  async validate(): Promise<boolean> {
    // Implementation
  }

  private generateId(): string {
    return `my-disc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## Lifecycle Hooks

### initialize()

Called when the disc is first loaded. Use this to:
- Validate configuration
- Load resources
- Set up dependencies
- Connect to external services

```typescript
async initialize(): Promise<void> {
  // Validate configuration
  if (!this.config.apiKey) {
    throw new Error('API key is required');
  }

  // Load resources
  this.resources = await this.loadResources();

  // Set up dependencies
  await this.setupDependencies();
}
```

### apply()

Apply the disc's changes to the running system.

**Key responsibilities:**
- Apply changes atomically
- Emit events for observability
- Handle errors gracefully
- Return applied state

```typescript
async apply(context: any): Promise<any> {
  // Save original state for revert
  const originalState = this.captureState(context);

  try {
    // Apply changes
    const newState = this.applyChanges(context);

    // Store state for revert
    this.stateHistory.set(context.controlId, originalState);

    // Emit success event
    this.emit('applied', { controlId: context.controlId, newState });

    return {
      success: true,
      state: newState,
      appliedAt: Date.now(),
    };
  } catch (error) {
    // Rollback on error
    await this.revertChanges(context, originalState);
    throw error;
  }
}
```

### revert()

Revert the disc's changes to the previous state.

**Key responsibilities:**
- Restore original state
- Clean up resources
- Emit revert event
- Return reverted state

```typescript
async revert(context: any): Promise<any> {
  // Retrieve original state
  const originalState = this.stateHistory.get(context.controlId);
  
  if (!originalState) {
    throw new Error(`No state found for control: ${context.controlId}`);
  }

  try {
    // Revert changes
    const revertedState = await this.revertChanges(context, originalState);

    // Clean up
    this.stateHistory.delete(context.controlId);

    // Emit revert event
    this.emit('reverted', { controlId: context.controlId });

    return {
      success: true,
      state: revertedState,
      revertedAt: Date.now(),
    };
  } catch (error) {
    throw new Error(`Failed to revert: ${error.message}`);
  }
}
```

### preview()

Preview what the disc would do without actually applying changes.

**Key responsibilities:**
- Run in isolated sandbox
- Calculate affected systems
- Identify potential issues
- Return diff and safety assessment

```typescript
async preview(context: any): Promise<any> {
  // Create isolated context
  const sandboxContext = this.createSandbox(context);

  // Simulate changes
  const simulatedState = await this.simulateChanges(sandboxContext);

  // Calculate diff
  const diff = this.calculateDiff(context.currentState, simulatedState);

  // Assess safety
  const potentialIssues = this.assessSafety(diff);

  return {
    safe: potentialIssues.length === 0,
    diff,
    potentialIssues,
    affectedSystems: this.getAffectedSystems(diff),
  };
}
```

### validate()

Validate the disc's configuration.

**Key responsibilities:**
- Check required fields
- Validate dependencies
- Detect conflicts
- Return validation result

```typescript
async validate(): Promise<boolean> {
  // Check required configuration
  if (!this.config.name || !this.config.settings) {
    return false;
  }

  // Validate dependencies
  for (const dep of this.config.dependencies ?? []) {
    if (!await this.isDependencyAvailable(dep)) {
      console.error(`Missing dependency: ${dep}`);
      return false;
    }
  }

  // Check for circular dependencies
  if (this.hasCircularDependencies()) {
    return false;
  }

  return true;
}
```

### cleanup()

Called when the disc is unloaded. Use this to:
- Release resources
- Close connections
- Remove event listeners
- Clean up temporary data

```typescript
async cleanup(): Promise<void> {
  // Close connections
  await this.connection?.close();

  // Remove event listeners
  this.removeAllListeners();

  // Clean up temporary data
  this.stateHistory.clear();

  // Release resources
  this.resources = null;
}
```

## State Management

### Capturing State

Always capture the current state before applying changes:

```typescript
private captureState(context: any): any {
  return {
    timestamp: Date.now(),
    state: this.deepClone(context.currentState),
    metadata: {
      controlId: context.controlId,
      actor: context.actorId,
    },
  };
}

private deepClone(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}
```

### Storing State History

Keep track of state changes for revert operations:

```typescript
export class MyDisc implements Disc {
  private stateHistory: Map<string, any> = new Map();

  async apply(context: any): Promise<any> {
    const originalState = this.captureState(context);
    
    // Store for later revert
    this.stateHistory.set(context.controlId, originalState);
    
    // Apply changes...
  }

  async revert(context: any): Promise<any> {
    const originalState = this.stateHistory.get(context.controlId);
    // Restore state...
  }
}
```

### Atomic Operations

Ensure changes are applied atomically:

```typescript
async apply(context: any): Promise<any> {
  // Start transaction
  const transaction = await this.beginTransaction();

  try {
    // Apply all changes within transaction
    await this.applyChange1(transaction);
    await this.applyChange2(transaction);
    await this.applyChange3(transaction);

    // Commit if all succeed
    await transaction.commit();
  } catch (error) {
    // Rollback on any failure
    await transaction.rollback();
    throw error;
  }
}
```

## Best Practices

### 1. Make Discs Stateless

Avoid storing mutable state in disc instances. Use StateManager instead:

```typescript
// ❌ Bad - mutable instance state
export class MyDisc implements Disc {
  private currentFeatures: Record<string, boolean> = {};

  async apply(context: any): Promise<any> {
    this.currentFeatures = { ...this.config.features };
  }
}

// ✅ Good - use StateManager
export class MyDisc implements Disc {
  async apply(context: any): Promise<any> {
    await context.stateManager.applyDiscChanges(
      context.controlId,
      this.config.features
    );
  }
}
```

### 2. Emit Events for Observability

Emit events at key lifecycle points:

```typescript
export class MyDisc extends EventEmitter implements Disc {
  async apply(context: any): Promise<any> {
    this.emit('apply-started', { controlId: context.controlId });
    
    const result = await this.performApply(context);
    
    this.emit('apply-completed', { 
      controlId: context.controlId,
      result,
    });
    
    return result;
  }
}
```

### 3. Validate Early and Often

Validate configuration in constructor and before operations:

```typescript
constructor(config: MyDiscConfig) {
  this.config = config;
  
  // Validate immediately
  if (!this.isConfigValid(config)) {
    throw new Error('Invalid disc configuration');
  }
  
  // Continue initialization...
}

private isConfigValid(config: MyDiscConfig): boolean {
  return Boolean(
    config.name &&
    config.settings &&
    Object.keys(config.settings).length > 0
  );
}
```

### 4. Handle Errors Gracefully

Always provide meaningful error messages and rollback on failure:

```typescript
async apply(context: any): Promise<any> {
  try {
    return await this.performApply(context);
  } catch (error) {
    // Provide context
    const enrichedError = new Error(
      `Failed to apply disc '${this.metadata.name}': ${error.message}`
    );
    
    // Attempt rollback
    try {
      await this.revert(context);
    } catch (revertError) {
      console.error('Rollback failed:', revertError);
    }
    
    throw enrichedError;
  }
}
```

### 5. Check RBAC Permissions

Respect role-based access control:

```typescript
async apply(context: any): Promise<any> {
  // Check if role has permission
  if (!context.role.hasPermission('apply-control')) {
    throw new Error('Insufficient permissions');
  }

  // Check disc-specific permissions
  if (!this.canApply(context.role)) {
    throw new Error(`Role ${context.role.metadata.roleType} cannot apply this disc`);
  }

  // Proceed with apply...
}
```

### 6. Document Dependencies

Clearly document disc dependencies:

```typescript
/**
 * EmailNotificationDisc
 * 
 * Sends email notifications for events.
 * 
 * Dependencies:
 * - Email service must be configured
 * - User profile disc must be loaded first
 * - Network connectivity required
 * 
 * Configuration:
 * - apiKey: Email service API key (required)
 * - from: Sender email address (required)
 * - templates: Email templates (optional)
 */
export class EmailNotificationDisc implements Disc {
  // Implementation...
}
```

### 7. Keep Previews Fast

Preview should be quick since it runs before every apply:

```typescript
async preview(context: any): Promise<any> {
  // Use cached calculations when possible
  if (this.previewCache.has(context.controlId)) {
    return this.previewCache.get(context.controlId);
  }

  // Limit simulation depth
  const simulation = await this.quickSimulation(context);

  // Cache result
  this.previewCache.set(context.controlId, simulation);

  return simulation;
}
```

## Testing Strategies

### Unit Testing

Test each lifecycle method independently:

```typescript
import { MyDisc } from './my-disc';

describe('MyDisc', () => {
  let disc: MyDisc;
  let mockContext: any;

  beforeEach(() => {
    disc = new MyDisc({
      name: 'test-disc',
      settings: { key: 'value' },
    });

    mockContext = {
      controlId: 'test-control',
      currentState: {},
      stateManager: {
        applyDiscChanges: jest.fn(),
      },
    };
  });

  describe('apply', () => {
    it('should apply changes successfully', async () => {
      const result = await disc.apply(mockContext);
      
      expect(result.success).toBe(true);
      expect(mockContext.stateManager.applyDiscChanges).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockContext.stateManager.applyDiscChanges.mockRejectedValue(
        new Error('Apply failed')
      );

      await expect(disc.apply(mockContext)).rejects.toThrow();
    });
  });

  describe('revert', () => {
    it('should revert changes', async () => {
      await disc.apply(mockContext);
      const result = await disc.revert(mockContext);
      
      expect(result.success).toBe(true);
    });

    it('should throw if no state found', async () => {
      await expect(disc.revert(mockContext)).rejects.toThrow('No state found');
    });
  });

  describe('validate', () => {
    it('should validate correct configuration', async () => {
      const isValid = await disc.validate();
      expect(isValid).toBe(true);
    });

    it('should reject invalid configuration', async () => {
      const invalidDisc = new MyDisc({ name: '', settings: {} });
      const isValid = await invalidDisc.validate();
      expect(isValid).toBe(false);
    });
  });
});
```

### Integration Testing

Test disc integration with DJ Engine:

```typescript
import { DJEngine } from 'universal-dj-layer';
import { MyDisc } from './my-disc';

describe('MyDisc Integration', () => {
  let dj: DJEngine;
  let disc: MyDisc;
  let role: any;

  beforeEach(() => {
    dj = new DJEngine({ creatorId: 'test-creator' });
    disc = new MyDisc({ name: 'integration-test', settings: {} });
    role = createTestRole();
  });

  it('should apply via DJ Engine', async () => {
    const result = await dj.applyControl(disc, role);
    expect(result.status).toBe('success');
  });

  it('should revert via DJ Engine', async () => {
    const result = await dj.applyControl(disc, role);
    await dj.revertControl(result.controlId, role);
    
    const controls = await dj.listControls({ status: 'active' });
    expect(controls).toHaveLength(0);
  });
});
```

### Snapshot Testing

Test state snapshots and rollbacks:

```typescript
import { StateManager } from 'universal-dj-layer/core/state-manager';

describe('MyDisc Snapshots', () => {
  let stateManager: StateManager;
  let disc: MyDisc;

  beforeEach(() => {
    stateManager = new StateManager();
    disc = new MyDisc({ name: 'snapshot-test', settings: {} });
  });

  it('should create snapshot before apply', async () => {
    const snapshot = await stateManager.createSnapshot();
    
    await stateManager.applyDiscChanges('test-control', {
      modified: true,
    });

    const diffs = await stateManager.diff(
      snapshot.snapshotId,
      (await stateManager.listSnapshots())[0].snapshotId
    );

    expect(diffs).toContainEqual({
      path: 'modified',
      type: 'added',
      after: true,
    });
  });
});
```

## Publishing Discs

### 1. Package Structure

```
my-disc/
├── src/
│   ├── index.ts           # Main entry point
│   ├── my-disc.ts         # Disc implementation
│   └── types.ts           # Type definitions
├── tests/
│   └── my-disc.test.ts    # Unit tests
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

### 2. Package.json

```json
{
  "name": "@my-org/my-disc",
  "version": "1.0.0",
  "description": "Custom disc for Universal DJ Layer",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["universal-dj-layer", "disc", "control"],
  "peerDependencies": {
    "universal-dj-layer": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  }
}
```

### 3. Documentation

Include comprehensive README with:
- Installation instructions
- Configuration options
- Usage examples
- API reference
- Troubleshooting guide

### 4. Versioning

Follow semantic versioning:
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes

## Examples

### Example 1: Rate Limiter Disc

```typescript
interface RateLimitConfig {
  name: string;
  maxRequests: number;
  windowMs: number;
}

export class RateLimitDisc implements Disc {
  metadata: DiscMetadata;
  private config: RateLimitConfig;
  private requestCounts: Map<string, number> = new Map();

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.metadata = {
      id: `ratelimit-${Date.now()}`,
      name: config.name,
      type: 'rate-limit',
      version: '1.0.0',
      createdAt: Date.now(),
    };
  }

  async apply(context: any): Promise<any> {
    // Apply rate limiting rules
    context.app.use((req, res, next) => {
      const ip = req.ip;
      const count = this.requestCounts.get(ip) ?? 0;

      if (count >= this.config.maxRequests) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      this.requestCounts.set(ip, count + 1);
      setTimeout(() => {
        this.requestCounts.delete(ip);
      }, this.config.windowMs);

      next();
    });

    return { success: true };
  }

  async revert(context: any): Promise<any> {
    // Remove rate limiting
    this.requestCounts.clear();
    return { success: true };
  }

  async preview(context: any): Promise<any> {
    return {
      safe: true,
      affectedSystems: ['http-middleware'],
      diff: {
        maxRequests: this.config.maxRequests,
        windowMs: this.config.windowMs,
      },
    };
  }

  async validate(): Promise<boolean> {
    return this.config.maxRequests > 0 && this.config.windowMs > 0;
  }
}
```

### Example 2: Feature Rollout Disc

```typescript
interface RolloutConfig {
  name: string;
  feature: string;
  percentage: number;  // 0-100
}

export class FeatureRolloutDisc implements Disc {
  metadata: DiscMetadata;
  private config: RolloutConfig;

  constructor(config: RolloutConfig) {
    this.config = config;
    this.metadata = {
      id: `rollout-${Date.now()}`,
      name: config.name,
      type: 'rollout',
      version: '1.0.0',
      createdAt: Date.now(),
    };
  }

  async apply(context: any): Promise<any> {
    const enabledUsers = new Set<string>();

    // Determine which users get the feature
    for (const userId of context.allUsers) {
      if (this.isInRollout(userId)) {
        enabledUsers.add(userId);
      }
    }

    return {
      success: true,
      enabledUsers: Array.from(enabledUsers),
      percentage: this.config.percentage,
    };
  }

  private isInRollout(userId: string): boolean {
    // Consistent hash-based rollout
    const hash = this.hashUserId(userId);
    return (hash % 100) < this.config.percentage;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  async revert(context: any): Promise<any> {
    return { success: true, enabledUsers: [] };
  }

  async preview(context: any): Promise<any> {
    const estimatedUsers = Math.floor(
      context.allUsers.length * (this.config.percentage / 100)
    );

    return {
      safe: true,
      affectedSystems: ['feature-flags'],
      diff: {
        feature: this.config.feature,
        estimatedUsers,
        percentage: this.config.percentage,
      },
    };
  }

  async validate(): Promise<boolean> {
    return (
      this.config.percentage >= 0 &&
      this.config.percentage <= 100 &&
      Boolean(this.config.feature)
    );
  }
}
```

## See Also

- [API Documentation](./API.md)
- [Getting Started Guide](./GETTING_STARTED.md)
- [Security Guide](./SECURITY.md)
- [Examples Directory](../examples/)

## License

MIT © 2026 Carolina Telleria
