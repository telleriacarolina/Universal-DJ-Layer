# Universal-DJ-Layer
The DJ Control Layer is a universal, pluggable system that enables safe collaboration, real-time experimentation, and role-based tuning in any host app. Modular "discs" allow reversible changes while preserving core logic, purpose, security, and creator ownership, with full auditing and observability.

## Overview

The Universal DJ Layer provides a foundational engine for managing modular "discs" - pluggable components that can be activated and deactivated at runtime with full role-based access control, observability, and audit logging.

## Core Components

### DJEngine

The `DJEngine` class is the central orchestrator for all DJ Control Layer operations. It manages:

- **Disc Registration**: Register modular discs with metadata validation
- **Disc Activation/Deactivation**: Control disc lifecycle with role-based permissions
- **Role Management**: Enforce hierarchical role-based authority (Creator, Admin, Moderator, User, AI Agent)
- **Observability**: Comprehensive event logging with timestamps and actor attribution

### Key Features

#### 1. Engine Initialization
```typescript
import { DJEngine, Role } from 'universal-dj-layer';

const engine = new DJEngine('ActorName', Role.Creator);
```

#### 2. Disc Registration
```typescript
import { Disc, Scope, Role } from 'universal-dj-layer';

const myDisc: Disc = {
  name: 'MyDisc',
  description: 'A sample disc',
  scope: Scope.Local,
  allowedRoles: [Role.Creator, Role.Admin],
  isTemporary: true,
  execute: () => {
    console.log('Disc activated!');
  }
};

engine.registerDisc(myDisc);
```

#### 3. Disc Activation & Deactivation
```typescript
// Activate a disc
engine.activateDisc('MyDisc');

// Check if disc is active
if (engine.isDiscActive('MyDisc')) {
  console.log('Disc is running');
}

// Deactivate a disc
engine.deactivateDisc('MyDisc');
```

#### 4. Role Management
```typescript
// Change the current actor and role
engine.setActor('AdminUser', Role.Admin);

// Check if a role can execute operations on a disc
const canExecute = engine.canExecute(Role.User, myDisc);
```

#### 5. Observability
```typescript
// Get all event logs
const logs = engine.getEventLog();
logs.forEach(log => {
  console.log(`${log.timestamp}: ${log.event} by ${log.actor} (${log.role})`);
});

// Get all registered discs
const discs = engine.getRegisteredDiscs();

// Get active disc names
const activeDiscs = engine.getActiveDiscs();
```

## Role Hierarchy

The engine supports a hierarchical role system:

1. **Creator** - Highest authority, can perform all operations
2. **Admin** - Administrative privileges
3. **Moderator** - Moderation capabilities
4. **User** - Standard user permissions
5. **AI Agent** - Automated agent with restricted access

Each disc defines which roles are allowed to activate/deactivate it.

## Disc Types

### Temporary Discs
- Can be rolled back or deactivated
- Ideal for experimentation and testing
- Set `isTemporary: true`

### Permanent Discs
- Long-lasting changes
- Require careful consideration before activation
- Set `isTemporary: false`

## Building and Testing

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
src/
├── engine/
│   ├── DJEngine.ts         # Core engine implementation
│   └── DJEngine.test.ts    # Engine unit tests
├── types/
│   └── index.ts            # Type definitions (Disc, Role, Scope, LogEntry)
└── index.ts                # Main export file
```

## Next Steps

Future enhancements planned:
- Implement rollback functionality for temporary discs
- Enhanced audit logging with persistent storage
- Advanced actor attribution and tracking
- Sample discs for demonstration
- Disc dependency management
- Real-time event streaming
