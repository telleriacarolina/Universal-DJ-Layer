/**
 * List Controls API - Query and list applied controls
 * 
 * This API provides various ways to query controls, filter by
 * criteria, and retrieve control metadata.
 */

import type { DJEngine, ControlResult } from '../core/dj-engine';
import type { Actor, ListOptions, ControlList, ControlDetail } from './types';
import { Permission } from './types';
import { PermissionError } from './errors';
import { validateActor, canView } from './validators';

/**
 * List controls based on filters and options
 * 
 * This function orchestrates the complete list flow:
 * 1. Checks view permission
 * 2. Gets controls based on filters
 * 3. Filters by visibility rules
 * 4. Enriches with metadata
 * 
 * @param engine - The DJ engine instance
 * @param actor - The actor listing controls
 * @param options - List options and filters
 * @returns Promise resolving to control list
 * @throws {ValidationError} If inputs are invalid
 * @throws {PermissionError} If actor lacks required permissions
 */
export async function listControls(
  engine: DJEngine,
  actor: Actor,
  options: ListOptions = {}
): Promise<ControlList> {
  // 1. Check view permission
  validateActor(actor);
  const hasPermission = actor.role.hasPermission(Permission.VIEW) ||
                        actor.role.hasPermission('view-audit') ||
                        actor.role.hasPermission('full-control');
  if (!hasPermission) {
    throw new PermissionError('Actor lacks permission to view controls');
  }

  // 2. Get controls based on filters
  const controls = await engine.listControls({
    status: options?.status || 'all',
    discType: options?.discType,
    actorId: options?.filterByActor ? actor.id : undefined,
  });

  // 3. Filter by visibility rules - convert ControlResult to ControlDetail
  const controlDetails: ControlDetail[] = controls.map(control => ({
    controlId: control.controlId,
    discId: control.controlId, // Use controlId as fallback
    discType: (control as any).discType || 'unknown',
    appliedBy: {
      id: (control as any).actorId || 'unknown',
      role: actor.role, // Use current actor's role as fallback
      name: (control as any).actorName,
    },
    appliedAt: control.timestamp,
    status: control.status === 'success' ? 'active' : 'reverted',
    affectedSystems: control.affectedSystems || [],
    canRevert: false, // Will be set below
    canModify: false, // Will be set below
  }));

  const visibleControls = controlDetails.filter(control => 
    canView(actor, control)
  );

  // 4. Enrich with metadata
  const enriched = await Promise.all(
    visibleControls.map(async (control) => {
      // Check if actor can revert this control
      let canRevertControl = false;
      if (typeof (engine as any).canRevert === 'function') {
        canRevertControl = await (engine as any).canRevert(actor, control.controlId);
      } else {
        // Fallback: check if actor has revert permission
        canRevertControl = actor.role.hasPermission(Permission.REVERT) ||
                          actor.role.hasPermission('revert-control') ||
                          control.appliedBy.id === actor.id;
      }

      // Check if actor can modify this control
      let canModifyControl = false;
      if (typeof (engine as any).canModify === 'function') {
        canModifyControl = await (engine as any).canModify(actor, control.controlId);
      } else {
        // Fallback: check if actor has modify permission
        canModifyControl = actor.role.hasPermission(Permission.MODIFY) ||
                          actor.role.hasPermission('full-control') ||
                          control.appliedBy.id === actor.id;
      }

      return {
        ...control,
        canRevert: canRevertControl,
        canModify: canModifyControl,
      };
    })
  );

  // Apply pagination
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 50;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedControls = enriched.slice(startIndex, endIndex);

  return {
    controls: paginatedControls,
    total: enriched.length,
    page,
    pageSize,
  };
}


