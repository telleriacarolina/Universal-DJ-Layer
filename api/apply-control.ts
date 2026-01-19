/**
 * Apply Control API - Apply a disc control to the system
 * 
 * This is the main API for applying runtime controls. It orchestrates
 * validation, policy checks, state changes, and error handling.
 */

import type { DJEngine } from '../core/dj-engine';
import type { Disc } from '../discs/feature-disc';
import type { Actor, ApplyOptions, ApplyResult } from './types';
import { Permission } from './types';
import { PermissionError, PolicyViolationError, ApplyError } from './errors';
import { validateDisc, validateActor } from './validators';

/**
 * Apply a control to the system
 * 
 * This function orchestrates the complete control application flow:
 * 1. Validates inputs
 * 2. Checks permissions via RBAC
 * 3. Evaluates policies
 * 4. Creates snapshot before changes
 * 5. Executes disc
 * 6. Logs to audit trail
 * 7. Rolls back on error
 * 
 * @param engine - The DJ engine instance
 * @param disc - The disc to apply
 * @param actor - The actor applying the control
 * @param options - Additional options for control application
 * @returns Promise resolving to apply result
 * @throws {ValidationError} If inputs are invalid
 * @throws {PermissionError} If actor lacks required permissions
 * @throws {PolicyViolationError} If policies are violated
 * @throws {ApplyError} If control application fails
 */
export async function applyControl(
  engine: DJEngine,
  disc: Disc,
  actor: Actor,
  options: ApplyOptions = {}
): Promise<ApplyResult> {
  // 1. Validate inputs
  validateDisc(disc);
  validateActor(actor);

  // 2. Check permissions via RBAC
  const hasPermission = actor.role.hasPermission(Permission.APPLY_DISCS);
  if (!hasPermission) {
    throw new PermissionError('Actor lacks permission to apply discs');
  }

  // 3. Evaluate policies (if policy evaluator exists)
  // Note: DJEngine may not have all these methods yet, so we handle gracefully
  if (typeof (engine as any).evaluatePolicies === 'function') {
    const policyResult = await (engine as any).evaluatePolicies({
      action: 'apply',
      actor,
      disc,
      targetState: options?.targetState,
    });

    if (!policyResult.allowed) {
      throw new PolicyViolationError(policyResult.reason, policyResult.violations);
    }
  }

  // 4. Create snapshot before changes
  let snapshotId: string | undefined;
  if (typeof (engine as any).createSnapshot === 'function') {
    const snapshot = await (engine as any).createSnapshot({ 
      reason: 'pre-apply',
      metadata: { actorId: actor.id, discId: disc.metadata.id },
    });
    snapshotId = snapshot.snapshotId;
  }

  try {
    // 5. Execute disc
    const result = await engine.applyControl(disc, actor.role, {
      previewFirst: options?.previewFirst,
    });

    // 6. Log to audit trail
    if (typeof (engine as any).auditLog?.log === 'function') {
      await (engine as any).auditLog.log({
        action: 'apply',
        actorId: actor.id,
        actorRole: actor.role.metadata.roleType,
        controlId: result.controlId,
        discType: disc.metadata.type,
        result: 'success',
        metadata: { changes: result.affectedSystems },
      });
    }

    return {
      success: true,
      controlId: result.controlId,
      snapshotId: snapshotId || 'none',
      changes: result.affectedSystems,
    };
  } catch (error) {
    // 7. Rollback on error
    if (snapshotId && typeof (engine as any).rollbackToSnapshot === 'function') {
      try {
        await (engine as any).rollbackToSnapshot(snapshotId);
      } catch (rollbackError) {
        // Log rollback failure but don't mask original error
        console.error('Failed to rollback after error:', rollbackError);
      }
    }

    // Log failure to audit trail
    if (typeof (engine as any).auditLog?.log === 'function') {
      await (engine as any).auditLog.log({
        action: 'apply',
        actorId: actor.id,
        actorRole: actor.role.metadata.roleType,
        controlId: disc.metadata.id,
        discType: disc.metadata.type,
        result: 'failure',
        metadata: { error: error instanceof Error ? error.message : String(error) },
      });
    }

    throw new ApplyError('Failed to apply control', { 
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }
}


