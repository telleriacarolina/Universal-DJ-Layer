/**
 * Universal DJ Control Layer - Main Entry Point
 * 
 * A universal, pluggable control layer enabling safe collaboration,
 * real-time experimentation, and role-based runtime tuning.
 */

// Core exports
export { DJEngine } from './core/dj-engine';
export type {
  DJEngineConfig,
  ControlResult,
  PreviewResult,
  ListControlsOptions,
} from './core/dj-engine';

export { PolicyEvaluator } from './core/policy-evaluator';
export type {
  PolicyEvaluationResult,
  PolicyContext,
} from './core/policy-evaluator';

export { Guardrails } from './core/guardrails';
export type {
  GuardrailViolation,
  GuardrailConfig,
} from './core/guardrails';

export { StateManager } from './core/state-manager';
export type {
  StateSnapshot,
  StateChange,
  StateManagerConfig,
} from './core/state-manager';

// Disc exports
export { FeatureDisc } from './discs/feature-disc';
export type {
  Disc,
  DiscMetadata,
  FeatureConfig,
} from './discs/feature-disc';

export { PermissionDisc } from './discs/permission-disc';
export type {
  PermissionConfig,
  PermissionRule,
} from './discs/permission-disc';

export { FlowDisc } from './discs/flow-disc';
export type {
  FlowConfig,
  FlowDefinition,
  FlowStep,
} from './discs/flow-disc';

export { UIDisc } from './discs/ui-disc';
export type {
  UIConfig,
  UIComponent,
  UILayout,
  UITheme,
} from './discs/ui-disc';

export { BehaviorDisc } from './discs/behavior-disc';
export type {
  BehaviorConfig,
  BehaviorRule,
  BehaviorStrategy,
} from './discs/behavior-disc';

// Role exports
export { CreatorRole } from './roles/creator';
export type {
  Role,
  RoleMetadata,
  CreatorRoleConfig,
} from './roles/creator';

export { AdminRole } from './roles/admin';
export type { AdminRoleConfig } from './roles/admin';

export { ModeratorRole } from './roles/moderator';
export type { ModeratorRoleConfig } from './roles/moderator';

export { CollaboratorRole } from './roles/collaborator';
export type { CollaboratorRoleConfig } from './roles/collaborator';

export { UserRole } from './roles/user';
export type { UserRoleConfig } from './roles/user';

export { AIAgentRole } from './roles/ai-agent';
export type { AIAgentRoleConfig } from './roles/ai-agent';

// Policy exports
export { CreatorLockPolicy } from './policies/creator-locks';
export type {
  Policy,
  PolicyMetadata,
  PolicyEvaluationContext,
  PolicyResult,
  CreatorLockConfig,
} from './policies/creator-locks';

export { SafetyPolicy } from './policies/safety-policies';
export type {
  SafetyPolicyConfig,
  SafetyRule,
} from './policies/safety-policies';

export { AntiAbusePolicy } from './policies/anti-abuse';
export type {
  AntiAbusePolicyConfig,
  RateLimitConfig,
  SuspiciousPattern,
} from './policies/anti-abuse';

export { CompliancePolicy } from './policies/compliance';
export type {
  CompliancePolicyConfig,
  ComplianceRequirement,
} from './policies/compliance';

// API exports - Phase 4 Public API Layer
export { 
  applyControl,
  revertControl,
  previewControl,
  listControls,
  getControl,
  ControlAPI,
} from './api';

export type {
  Actor,
  ApplyOptions,
  ApplyResult,
  RevertOptions,
  RevertResult,
  PreviewOptions,
  PreviewResult,
  ListOptions,
  ControlList,
  ControlDetail,
} from './api';

export { 
  Permission,
} from './api';

export {
  ControlAPIError,
  PermissionError,
  PolicyViolationError,
  NotFoundError,
  ApplyError,
  ValidationError,
} from './api';

// Audit exports
export { AuditLog } from './audit/audit-log';
export type {
  AuditEntry,
  AuditQueryOptions,
  AuditLogConfig,
} from './audit/audit-log';

export { ChangeHistory } from './audit/change-history';
export type {
  ChangeRecord,
  ChangeHistoryQueryOptions,
  ChangeHistoryConfig,
} from './audit/change-history';

export { DiffEngine } from './audit/diff-engine';
export type {
  DiffOptions,
  DiffResult,
  DiffChange,
} from './audit/diff-engine';
