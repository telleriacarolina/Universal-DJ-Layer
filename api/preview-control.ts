/**
 * Preview Control API - Preview control changes before applying
 * 
 * This API allows safe preview of control changes in an isolated
 * sandbox without affecting the running system.
 */

import type { DJEngine } from '../core/dj-engine';
import type { Disc } from '../discs/feature-disc';
import type { Actor, PreviewOptions, PreviewResult } from './types';
import { Permission } from './types';
import { PermissionError } from './errors';
import { validateDisc, validateActor } from './validators';

/**
 * Preview a control change without applying it
 * 
 * This function orchestrates the complete preview flow:
 * 1. Validates inputs
 * 2. Checks preview permission
 * 3. Creates isolated snapshot
 * 4. Executes in sandbox
 * 5. Calculates diff
 * 6. Evaluates safety
 * 7. Logs preview
 * 8. Cleans up temporary snapshot
 * 
 * @param engine - The DJ engine instance
 * @param disc - The disc to preview
 * @param actor - The actor previewing the control
 * @param options - Additional options for preview
 * @returns Promise resolving to preview result
 * @throws {ValidationError} If inputs are invalid
 * @throws {PermissionError} If actor lacks required permissions
 */
export async function previewControl(
  engine: DJEngine,
  disc: Disc,
  actor: Actor,
  options: PreviewOptions = {}
): Promise<PreviewResult> {
  // 1. Validate inputs
  validateDisc(disc);
  validateActor(actor);

  // 2. Check preview permission
  const hasPermission = actor.role.hasPermission(Permission.PREVIEW) ||
                        actor.role.hasPermission('preview-control');
  if (!hasPermission) {
    throw new PermissionError('Actor lacks permission to preview');
  }

  // 3. Create isolated snapshot
  let snapshotId: string | undefined;
  if (typeof (engine as any).createSnapshot === 'function') {
    const snapshot = await (engine as any).createSnapshot({ 
      reason: 'preview', 
      temporary: true,
      metadata: { actorId: actor.id, discId: disc.metadata.id },
    });
    snapshotId = snapshot.snapshotId;
  }

  try {
    // 4. Execute in sandbox (or use preview mode)
    let result;
    let diff: any = {};
    let safe = true;
    let warnings: string[] = [];

    if (typeof (engine as any).executeInSandbox === 'function' && snapshotId) {
      // 5. Calculate diff
      result = await (engine as any).executeInSandbox(disc, snapshotId);
      
      if (typeof (engine as any).calculateDiff === 'function') {
        diff = await (engine as any).calculateDiff(snapshotId, result.stateId);
      }

      // 6. Evaluate safety
      if (typeof (engine as any).evaluateSafety === 'function') {
        const safetyCheck = await (engine as any).evaluateSafety(result, diff);
        safe = safetyCheck.safe;
        warnings = safetyCheck.warnings || [];
      }
    } else {
      // Fallback to basic preview
      result = await engine.previewControl(disc, actor.role);
      safe = result.safe;
      warnings = result.potentialIssues || [];
      diff = result.diff;
    }

    // 7. Log preview
    if (typeof (engine as any).auditLog?.log === 'function') {
      await (engine as any).auditLog.log({
        action: 'preview',
        actorId: actor.id,
        actorRole: actor.role.metadata.roleType,
        controlId: disc.metadata.id,
        discType: disc.metadata.type,
        result: 'success',
        metadata: { safe },
      });
    }

    return {
      safe,
      warnings,
      changes: diff,
      estimatedImpact: result?.impact || result?.affectedSystems || [],
    };
  } finally {
    // 8. Always cleanup preview snapshot
    if (snapshotId && typeof (engine as any).deleteSnapshot === 'function') {
      try {
        await (engine as any).deleteSnapshot(snapshotId);
      } catch (error) {
        // Log but don't fail if cleanup fails
        console.error('Failed to cleanup preview snapshot:', error);
      }
    }
  }
}


