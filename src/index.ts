// Core Engine
export { DJEngine } from './engine/DJEngine';

// Core Components
export { StateManager } from './core/state-manager';
export { AuditLogger } from './core/audit-logger';
export { ComplianceValidator } from './core/compliance-validator';
export { RBACManager } from './core/rbac';
export { Disc as DiscBase } from './core/disc';
export { DJControlLayer } from './core/dj-control-layer';

// Discs
export { FeatureFlagDisc } from './discs/feature-flag-disc';
export { ThemeDisc } from './discs/theme-disc';

// Types from src/types
export { Role, Scope, LogEntry } from './types';
export type { Disc } from './types';

// Types from core/types
export type { 
  User, 
  AuditLogEntry, 
  StateSnapshot, 
  DJControlLayerConfig,
  ComplianceRule,
  ComplianceResult,
  IntegrationHooks,
  ChangeContext,
  DiscMetadata,
  DiscState
} from './core/types';
export { Role as CoreRole, Permission } from './core/types';

// Version
export { version } from './version';
