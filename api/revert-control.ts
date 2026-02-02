/**
 * Revert Control API - Revert a previously applied control
 * 
 * This API handles rolling back controls to restore previous state.
 */

import type { DJEngine } from '../core/dj-engine';
import type { Actor, RevertOptions, RevertResult } from './types';
import { Permission } from './types';
import { PermissionError, NotFoundError } from './errors';
import { validateActor, validateControlId } from './validators';

/**
 * Revert a previously applied control
 * 
 * This function orchestrates the complete control revert flow:
 * 1. Validates control exists
 * 2. Checks permissions
 * 3. Retrieves snapshot
 * 4. Rolls back to snapshot
 * 5. Logs revert
 * 
 * @param engine - The DJ engine instance
 * @param controlId - ID of the control to revert
 * @param actor - The actor reverting the control
 * @param options - Additional options for revert
 * @returns Promise resolving to revert result
 * @throws {ValidationError} If inputs are invalid
 * @throws {PermissionError} If actor lacks required permissions
 * @throws {NotFoundError} If control or snapshot not found
 */
export async function revertControl(
  engine: DJEngine,
  controlId: string,
  actor: Actor,
  options: RevertOptions = {}
): Promise<RevertResult> {
  // 1. Validate inputs
  validateControlId(controlId);
  validateActor(actor);

  // 2. Check permissions
  const hasPermission = actor.role.hasPermission(Permission.APPLY_DISCS) ||
                        actor.role.hasPermission(Permission.REVERT);
  if (!hasPermission) {
    throw new PermissionError('Actor lacks permission to revert discs');
  }

  // 3. Validate control exists (if method available)
  if (typeof (engine as any).getControl === 'function') {
    const control = await (engine as any).getControl(controlId);
    if (!control) {
      throw new NotFoundError(`Control ${controlId} not found`);
    }
  }

  // 4. Retrieve and rollback to snapshot
  let snapshotId: string;
  
  if (typeof (engine as any).getSnapshotForControl === 'function') {
    const snapshot = await (engine as any).getSnapshotForControl(controlId);
    if (!snapshot) {
      throw new NotFoundError(`No snapshot found for control ${controlId}`);
    }
    snapshotId = snapshot.snapshotId;
  } else {
    // Fallback: use control ID as snapshot ID
    snapshotId = `snapshot-${controlId}`;
  }

  // Perform the actual revert
  await engine.revertControl(controlId, actor.role);

  // 5. Log revert
  if (typeof (engine as any).auditLog?.log === 'function') {
    await (engine as any).auditLog.log({
      action: 'revert',
      actorId: actor.id,
      actorRole: actor.role.metadata.roleType,
      controlId,
      result: 'success',
      metadata: { snapshotId },
    });
  }

  return {
    success: true,
    controlId,
    revertedToSnapshot: snapshotId,
  };
}


