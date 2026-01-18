// Core exports
export { DJControlLayer } from './core/dj-control-layer';
export { Disc } from './core/disc';
export { RBACManager } from './core/rbac';
export { AuditLogger } from './core/audit-logger';
export { StateManager } from './core/state-manager';
export { ComplianceValidator } from './core/compliance-validator';

// Type exports
export {
  Role,
  Permission,
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

// Example disc exports
export { ThemeDisc } from './discs/theme-disc';
export { FeatureFlagDisc } from './discs/feature-flag-disc';
