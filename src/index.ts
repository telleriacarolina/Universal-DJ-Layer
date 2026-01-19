// Core Engine
export { DJEngine } from './engine/DJEngine';

// Core Components
export { StateManager } from './core/state-manager';
export { AuditLogger } from './core/audit-logger';
export { ComplianceValidator } from './core/compliance-validator';
export { RBACManager } from './core/rbac';
export { Disc } from './core/disc';
export { DJControlLayer } from './core/dj-control-layer';

// Discs
export { FeatureFlagDisc } from './discs/feature-flag-disc';
export { ThemeDisc } from './discs/theme-disc';

// Types - export specific types to avoid conflicts
export { Role, Scope, LogEntry } from './types';
export type { Actor, AuditConfig, ComplianceRule, ControlLayer } from './core/types';

// Version
export { version } from './version';
