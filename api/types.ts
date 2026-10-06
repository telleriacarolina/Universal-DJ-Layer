/**
 * Shared types for the Control API
 */

import type { Role } from '../roles/creator';

/**
 * Actor represents an entity (user, service, etc.) performing operations
 */
export interface Actor {
  /** Unique identifier for the actor */
  id: string;
  /** Role associated with this actor */
  role: Role;
  /** Optional display name */
  name?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Permission types for control operations
 */
export enum Permission {
  /** Permission to apply disc controls */
  APPLY_DISCS = 'apply-discs',
  /** Permission to preview controls */
  PREVIEW = 'preview',
  /** Permission to view controls */
  VIEW = 'view',
  /** Permission to revert controls */
  REVERT = 'revert',
  /** Permission to modify controls */
  MODIFY = 'modify',
}

/**
 * Options for applying a control
 */
export interface ApplyOptions {
  /** Target state to apply to */
  targetState?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Whether to preview before applying */
  previewFirst?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Result of applying a control
 */
export interface ApplyResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Unique identifier for the applied control */
  controlId: string;
  /** Snapshot ID taken before applying */
  snapshotId: string;
  /** Changes made by the control */
  changes: any;
  /** Optional error if failed */
  error?: string;
}

/**
 * Options for reverting a control
 */
export interface RevertOptions {
  /** Create a new snapshot before reverting */
  createSnapshot?: boolean;
  /** Force revert even with warnings */
  force?: boolean;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Result of reverting a control
 */
export interface RevertResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** ID of the reverted control */
  controlId: string;
  /** Snapshot ID that was reverted to */
  revertedToSnapshot: string;
  /** Optional error if failed */
  error?: string;
}

/**
 * Options for previewing a control
 */
export interface PreviewOptions {
  /** Include detailed diff */
  includeDetailedDiff?: boolean;
  /** Run impact analysis */
  runImpactAnalysis?: boolean;
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Result of previewing a control
 */
export interface PreviewResult {
  /** Whether the control is safe to apply */
  safe: boolean;
  /** Warnings about the control */
  warnings: string[];
  /** Changes that would be made */
  changes: any;
  /** Estimated impact of the control */
  estimatedImpact: any;
}

/**
 * Options for listing controls
 */
export interface ListOptions {
  /** Filter by status */
  status?: 'active' | 'reverted' | 'all';
  /** Filter by disc type */
  discType?: string;
  /** Filter by actor */
  filterByActor?: boolean;
  /** Page number for pagination */
  page?: number;
  /** Page size for pagination */
  pageSize?: number;
}

/**
 * List of controls with metadata
 */
export interface ControlList {
  /** Array of controls */
  controls: ControlDetail[];
  /** Total number of controls */
  total: number;
  /** Current page */
  page: number;
  /** Page size */
  pageSize: number;
}

/**
 * Detailed information about a control
 */
export interface ControlDetail {
  /** Control ID */
  controlId: string;
  /** Disc ID */
  discId: string;
  /** Disc type */
  discType: string;
  /** Actor who applied the control */
  appliedBy: Actor;
  /** When the control was applied */
  appliedAt: number;
  /** Status of the control */
  status: 'active' | 'reverted';
  /** Affected systems */
  affectedSystems: string[];
  /** Audit history for this control */
  history?: any[];
  /** State changes made by this control */
  changes?: any;
  /** Whether the actor can revert this control */
  canRevert: boolean;
  /** Whether the actor can modify this control */
  canModify: boolean;
}
