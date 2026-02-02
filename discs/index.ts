/**
 * Universal DJ Control Layer - Discs Module
 * 
 * Pre-built disc implementations for common use cases.
 */

// Disc base and types
export { Disc, DiscMetadata } from './feature-disc';

// Feature disc exports
export { FeatureDisc } from './feature-disc';
export type { FeatureConfig } from './feature-disc';

// Permission disc exports
export { PermissionDisc } from './permission-disc';
export type { PermissionConfig, PermissionRule } from './permission-disc';

// Flow disc exports
export { FlowDisc } from './flow-disc';
export type { FlowConfig, FlowDefinition, FlowStep } from './flow-disc';

// UI disc exports
export { UIDisc } from './ui-disc';
export type { UIConfig, UIComponent, UILayout, UITheme } from './ui-disc';

// Behavior disc exports
export { BehaviorDisc } from './behavior-disc';
export type { BehaviorConfig, BehaviorRule, BehaviorStrategy } from './behavior-disc';
