/**
 * Role hierarchy for the DJ Control Layer
 * Roles are ordered by authority level (highest to lowest)
 */
export enum Role {
  Creator = 'Creator',
  Admin = 'Admin',
  Moderator = 'Moderator',
  User = 'User',
  AIAgent = 'AIAgent'
}

/**
 * Scope defines where a disc can operate
 */
export enum Scope {
  Global = 'Global',
  Local = 'Local',
  Isolated = 'Isolated'
}

/**
 * Disc metadata and configuration
 */
export interface Disc {
  /** Unique name identifier for the disc */
  name: string;
  
  /** Human-readable description */
  description?: string;
  
  /** Operating scope of the disc */
  scope: Scope;
  
  /** Roles allowed to activate this disc */
  allowedRoles: Role[];
  
  /** Whether the disc is temporary (can be rolled back) or permanent */
  isTemporary: boolean;
  
  /** Execution function for the disc */
  execute?: () => void | Promise<void>;
  
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Event log entry for observability
 */
export interface LogEntry {
  timestamp: Date;
  event: string;
  discName?: string;
  actor: string;
  role: Role;
  details?: Record<string, unknown>;
}
