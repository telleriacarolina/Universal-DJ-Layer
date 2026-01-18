# Integration Guide

This guide explains how to integrate the Universal DJ Control Layer into your host application.

## Basic Integration

### Step 1: Install the Package

```bash
npm install universal-dj-layer
```

### Step 2: Initialize the Layer

```typescript
import { DJControlLayer } from 'universal-dj-layer';

const djLayer = new DJControlLayer({
  enableAuditLog: true,
  maxSnapshots: 100,
  enableUserIsolation: true
});
```

### Step 3: Define Users

```typescript
import { User, Role } from 'universal-dj-layer';

const currentUser: User = {
  id: 'user-123',
  name: 'John Doe',
  role: Role.EXPERIMENTER
};
```

### Step 4: Add and Configure Discs

```typescript
import { ThemeDisc } from 'universal-dj-layer';

const themeDisc = new ThemeDisc();
await djLayer.addDisc(themeDisc, currentUser);
await djLayer.enableDisc('theme-disc', currentUser);
```

## Integration Hooks

Integration hooks allow your host application to react to changes in the DJ Control Layer.

### Before Change Hook

Block or allow changes before they happen:

```typescript
const djLayer = new DJControlLayer({
  hooks: {
    onBeforeChange: async (context) => {
      // Log the change request
      console.log(`User ${context.user.name} wants to ${context.action}`);
      
      // Perform custom validation
      if (context.action === 'removeDisc' && isProductionEnvironment()) {
        return false; // Block the change
      }
      
      return true; // Allow the change
    }
  }
});
```

### After Change Hook

React to changes after they occur:

```typescript
const djLayer = new DJControlLayer({
  hooks: {
    onAfterChange: async (context) => {
      // Notify other systems
      await notificationService.send({
        message: `${context.user.name} performed ${context.action}`,
        channel: 'dj-control-layer'
      });
      
      // Update UI
      uiService.refresh();
    }
  }
});
```

### Audit Log Hook

Send audit logs to external systems:

```typescript
const djLayer = new DJControlLayer({
  hooks: {
    onAuditLog: async (entry) => {
      // Send to logging service
      await loggingService.log({
        level: 'info',
        message: `${entry.action} by ${entry.userName}`,
        metadata: entry
      });
      
      // Send to analytics
      analytics.track('dj-control-layer-action', {
        action: entry.action,
        userId: entry.userId,
        discId: entry.discId
      });
    }
  }
});
```

## Settings Tab Integration

Create a settings UI for users to manage discs.

### React Example

```typescript
import React, { useEffect, useState } from 'react';
import { DJControlLayer, Disc } from 'universal-dj-layer';

export function DJControlSettings({ djLayer, currentUser }) {
  const [discs, setDiscs] = useState<Disc[]>([]);

  useEffect(() => {
    setDiscs(djLayer.getAllDiscs());
  }, [djLayer]);

  const handleToggleDisc = async (discId: string, enabled: boolean) => {
    if (enabled) {
      await djLayer.enableDisc(discId, currentUser);
    } else {
      await djLayer.disableDisc(discId, currentUser);
    }
    setDiscs(djLayer.getAllDiscs());
  };

  return (
    <div className="dj-control-settings">
      <h2>DJ Control Layer Settings</h2>
      {discs.map(disc => {
        const metadata = disc.getMetadata();
        const state = disc.getState();
        
        return (
          <div key={metadata.id} className="disc-card">
            <h3>{metadata.name}</h3>
            <p>{metadata.description}</p>
            <label>
              <input
                type="checkbox"
                checked={state.enabled}
                onChange={(e) => handleToggleDisc(metadata.id, e.target.checked)}
              />
              Enabled
            </label>
          </div>
        );
      })}
    </div>
  );
}
```

### Vue Example

```vue
<template>
  <div class="dj-control-settings">
    <h2>DJ Control Layer Settings</h2>
    <div v-for="disc in discs" :key="disc.id" class="disc-card">
      <h3>{{ disc.name }}</h3>
      <p>{{ disc.description }}</p>
      <label>
        <input
          type="checkbox"
          :checked="disc.enabled"
          @change="handleToggleDisc(disc.id, $event.target.checked)"
        />
        Enabled
      </label>
    </div>
  </div>
</template>

<script>
export default {
  props: ['djLayer', 'currentUser'],
  data() {
    return {
      discs: []
    };
  },
  mounted() {
    this.loadDiscs();
  },
  methods: {
    loadDiscs() {
      const allDiscs = this.djLayer.getAllDiscs();
      this.discs = allDiscs.map(disc => ({
        id: disc.getMetadata().id,
        name: disc.getMetadata().name,
        description: disc.getMetadata().description,
        enabled: disc.getState().enabled
      }));
    },
    async handleToggleDisc(discId, enabled) {
      if (enabled) {
        await this.djLayer.enableDisc(discId, this.currentUser);
      } else {
        await this.djLayer.disableDisc(discId, this.currentUser);
      }
      this.loadDiscs();
    }
  }
};
</script>
```

## User Authentication Integration

Integrate with your authentication system:

```typescript
import { User, Role } from 'universal-dj-layer';

function getUserFromAuth(authUser: any): User {
  // Map your auth user to DJ Control Layer user
  let role = Role.VIEWER;
  
  if (authUser.isOwner) {
    role = Role.OWNER;
  } else if (authUser.isAdmin) {
    role = Role.ADMIN;
  } else if (authUser.canExperiment) {
    role = Role.EXPERIMENTER;
  }
  
  return {
    id: authUser.id,
    name: authUser.name,
    role
  };
}

// Usage
const authUser = await authService.getCurrentUser();
const djUser = getUserFromAuth(authUser);
```

## State Persistence

Persist the DJ Control Layer state to a database:

```typescript
// Export state
const state = djLayer.exportState();
await database.saveState('dj-control-layer', state);

// Import state on initialization
const savedState = await database.loadState('dj-control-layer');
if (savedState) {
  // Recreate discs and restore state
  // You'll need to implement custom logic for this
}
```

## Error Handling

Handle errors gracefully:

```typescript
try {
  await djLayer.updateDiscConfig('theme-disc', newConfig, currentUser);
} catch (error) {
  if (error.message.includes('Insufficient permissions')) {
    showError('You do not have permission to perform this action');
  } else if (error.message.includes('Compliance validation failed')) {
    showError('This change violates compliance rules');
  } else {
    showError('An unexpected error occurred');
    console.error(error);
  }
}
```

## Best Practices

1. **Always check permissions** before showing UI controls
2. **Create snapshots** before making significant changes
3. **Use integration hooks** to keep your app in sync
4. **Log all errors** for debugging
5. **Test with different user roles** to ensure proper access control
6. **Implement proper error handling** for better user experience
7. **Use TypeScript** for type safety
8. **Document custom discs** thoroughly
9. **Validate user input** before passing to discs
10. **Monitor audit logs** for security and compliance
