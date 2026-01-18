/**
 * Public API Layer for Control Operations
 * 
 * This module provides a clean, developer-friendly public API layer
 * that abstracts internal complexity and provides intuitive methods
 * for control operations with comprehensive error handling and validation.
 */

// Main API functions
export { applyControl } from './apply-control';
export { revertControl } from './revert-control';
export { previewControl } from './preview-control';
export { listControls } from './list-controls';
export { getControl } from './get-control';

// Unified API wrapper
export { ControlAPI } from './control-api';

// Types
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
} from './types';
export { Permission } from './types';

// Errors
export {
  ControlAPIError,
  PermissionError,
  PolicyViolationError,
  NotFoundError,
  ApplyError,
  ValidationError,
} from './errors';

// Validators (may be useful for advanced use cases)
export {
  validateDisc,
  validateActor,
  validateControlId,
  canView,
} from './validators';
