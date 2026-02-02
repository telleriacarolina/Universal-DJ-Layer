/**
 * Get Control API - Retrieve detailed information about a specific control
 * 
 * This API provides detailed information about a single control including
 * its history, changes, and permission status.
 */

import type { DJEngine } from '../core/dj-engine';
import type { Actor, ControlDetail } from './types';
import { Permission } from './types';
import { PermissionError, NotFoundError } from './errors';
import { validateActor, validateControlId, canView } from './validators';

/**
 * Get detailed information about a specific control
 * 
 * This function orchestrates the complete get flow:
 * 1. Checks view permission
 * 2. Retrieves control
 * 3. Checks visibility
 * 4. Gets audit history
 * 5. Gets state changes
 * 
 * @param engine - The DJ engine instance
 * @param controlId - ID of the control to retrieve
 * @param actor - The actor requesting control details
 * @returns Promise resolving to control detail
 * @throws {ValidationError} If inputs are invalid
 * @throws {PermissionError} If actor lacks required permissions
 * @throws {NotFoundError} If control not found
 */
export async function getControl(
  engine: DJEngine,
  controlId: string,
  actor: Actor
): Promise<ControlDetail> {
  // 1. Validate inputs
  validateControlId(controlId);
  validateActor(actor);

  // Check view permission
  const hasPermission = actor.role.hasPermission(Permission.VIEW) ||
                        actor.role.hasPermission('view-audit') ||
                        actor.role.hasPermission('full-control');
  if (!hasPermission) {
    throw new PermissionError('Actor lacks permission to view controls');
  }

  // 2. Retrieve control
  let control: any;
  if (typeof (engine as any).getControl === 'function') {
    control = await (engine as any).getControl(controlId);
  } else {
    // Fallback: search through list of controls
    const controls = await engine.listControls();
    control = controls.find(c => c.controlId === controlId);
  }

  if (!control) {
    throw new NotFoundError(`Control ${controlId} not found`);
  }

  // Create ControlDetail from control result
  const controlDetail: ControlDetail = {
    controlId: control.controlId,
    discId: (control as any).discId || control.controlId,
    discType: (control as any).discType || 'unknown',
    appliedBy: {
      id: (control as any).actorId || 'unknown',
      role: actor.role, // Use current actor's role as fallback
      name: (control as any).actorName,
    },
    appliedAt: control.timestamp,
    status: control.status === 'success' ? 'active' : 'reverted',
    affectedSystems: control.affectedSystems || [],
    canRevert: false,
    canModify: false,
  };

  // 3. Check visibility
  if (!canView(actor, controlDetail)) {
    throw new PermissionError('Cannot view this control');
  }

  // 4. Get audit history
  let history: any[] = [];
  if (typeof (engine as any).auditLog?.query === 'function') {
    try {
      const auditEntries = await (engine as any).auditLog.query({
        controlId,
        limit: 100,
      });
      history = auditEntries;
    } catch (error) {
      // Log but don't fail if audit log unavailable
      console.error('Failed to retrieve audit history:', error);
    }
  }

  // 5. Get state changes
  let changes: any;
  if (typeof (engine as any).getStateChanges === 'function') {
    try {
      changes = await (engine as any).getStateChanges(controlId);
    } catch (error) {
      // Log but don't fail if state changes unavailable
      console.error('Failed to retrieve state changes:', error);
      changes = {};
    }
  }

  // Determine permissions for this control
  let canRevertControl = false;
  if (typeof (engine as any).canRevert === 'function') {
    canRevertControl = await (engine as any).canRevert(actor, controlId);
  } else {
    canRevertControl = actor.role.hasPermission(Permission.REVERT) ||
                      actor.role.hasPermission('revert-control') ||
                      controlDetail.appliedBy.id === actor.id;
  }

  let canModifyControl = false;
  if (typeof (engine as any).canModify === 'function') {
    canModifyControl = await (engine as any).canModify(actor, controlId);
  } else {
    canModifyControl = actor.role.hasPermission(Permission.MODIFY) ||
                      actor.role.hasPermission('full-control') ||
                      controlDetail.appliedBy.id === actor.id;
  }

  return {
    ...controlDetail,
    history,
    changes,
    canRevert: canRevertControl,
    canModify: canModifyControl,
  };
}
