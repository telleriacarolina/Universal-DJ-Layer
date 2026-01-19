/**
 * Discs Module - Core control units for the Universal DJ Layer
 * 
 * This module exports all disc types and their related interfaces.
 * Each disc type provides specific functionality for runtime modifications.
 */

// ===== FeatureDisc =====
export {
  FeatureDisc,
  type FeatureConfig,
  type FeatureState,
  type Disc,
  type DiscMetadata,
} from './feature-disc';

// ===== PermissionDisc =====
export {
  PermissionDisc,
  type PermissionConfig,
  type PermissionRule,
  type PermissionGrant,
  type AuditEntry,
} from './permission-disc';

// ===== UIDisc =====
export {
  UIDisc,
  type UIConfig,
  type UIComponent,
  type UILayout,
  type UITheme,
} from './ui-disc';

// ===== FlowDisc =====
export {
  FlowDisc,
  type FlowConfig,
  type FlowDefinition,
  type FlowStep,
  type WorkflowInstance,
} from './flow-disc';

// ===== BehaviorDisc =====
export {
  BehaviorDisc,
  type BehaviorConfig,
  type BehaviorRule,
  type BehaviorStrategy,
  type FunctionWrapper,
} from './behavior-disc';
