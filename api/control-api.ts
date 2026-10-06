/**
 * ControlAPI - Unified API class for all control operations
 * 
 * This class provides a clean, developer-friendly interface that wraps
 * all control operations with consistent error handling and validation.
 */

import type { DJEngine } from '../core/dj-engine';
import type { Disc } from '../discs/feature-disc';
import type {
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
import { applyControl } from './apply-control';
import { revertControl } from './revert-control';
import { previewControl } from './preview-control';
import { listControls } from './list-controls';
import { getControl } from './get-control';

/**
 * Unified Control API
 * 
 * Provides a clean interface for all control operations:
 * - Apply controls
 * - Revert controls
 * - Preview controls
 * - List controls
 * - Get control details
 * 
 * @example
 * ```typescript
 * const engine = new DJEngine({ creatorId: 'user-123' });
 * const api = new ControlAPI(engine);
 * 
 * // Apply a control
 * const result = await api.apply(myDisc, actor);
 * 
 * // Preview before applying
 * const preview = await api.preview(myDisc, actor);
 * if (preview.safe) {
 *   await api.apply(myDisc, actor);
 * }
 * 
 * // List all controls
 * const controls = await api.list(actor);
 * 
 * // Revert a control
 * await api.revert(controlId, actor);
 * ```
 */
export class ControlAPI {
  constructor(private engine: DJEngine) {}

  /**
   * Apply a disc control to the system
   * 
   * @param disc - The disc to apply
   * @param actor - The actor applying the control
   * @param options - Additional options for control application
   * @returns Promise resolving to apply result
   * @throws {ValidationError} If inputs are invalid
   * @throws {PermissionError} If actor lacks required permissions
   * @throws {PolicyViolationError} If policies are violated
   * @throws {ApplyError} If control application fails
   */
  async apply(
    disc: Disc,
    actor: Actor,
    options?: ApplyOptions
  ): Promise<ApplyResult> {
    return applyControl(this.engine, disc, actor, options);
  }

  /**
   * Revert a previously applied control
   * 
   * @param controlId - ID of the control to revert
   * @param actor - The actor reverting the control
   * @param options - Additional options for revert
   * @returns Promise resolving to revert result
   * @throws {ValidationError} If inputs are invalid
   * @throws {PermissionError} If actor lacks required permissions
   * @throws {NotFoundError} If control or snapshot not found
   */
  async revert(
    controlId: string,
    actor: Actor,
    options?: RevertOptions
  ): Promise<RevertResult> {
    return revertControl(this.engine, controlId, actor, options);
  }

  /**
   * Preview a control change without applying it
   * 
   * @param disc - The disc to preview
   * @param actor - The actor previewing the control
   * @param options - Additional options for preview
   * @returns Promise resolving to preview result
   * @throws {ValidationError} If inputs are invalid
   * @throws {PermissionError} If actor lacks required permissions
   */
  async preview(
    disc: Disc,
    actor: Actor,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    return previewControl(this.engine, disc, actor, options);
  }

  /**
   * List controls based on filters and options
   * 
   * @param actor - The actor listing controls
   * @param options - List options and filters
   * @returns Promise resolving to control list
   * @throws {ValidationError} If inputs are invalid
   * @throws {PermissionError} If actor lacks required permissions
   */
  async list(
    actor: Actor,
    options?: ListOptions
  ): Promise<ControlList> {
    return listControls(this.engine, actor, options);
  }

  /**
   * Get detailed information about a specific control
   * 
   * @param controlId - ID of the control to retrieve
   * @param actor - The actor requesting control details
   * @returns Promise resolving to control detail
   * @throws {ValidationError} If inputs are invalid
   * @throws {PermissionError} If actor lacks required permissions
   * @throws {NotFoundError} If control not found
   */
  async get(
    controlId: string,
    actor: Actor
  ): Promise<ControlDetail> {
    return getControl(this.engine, controlId, actor);
  }
}
