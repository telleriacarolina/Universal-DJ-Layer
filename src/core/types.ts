/**
 * Role definitions for access control
 */
export enum Role {
  VIEWER = 'viewer',
  EXPERIMENTER = 'experimenter',
  ADMIN = 'admin',
  OWNER = 'owner',
}

/**
 * Permission types for operations
 */
export enum Permission {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  DELETE = 'delete',
  CONFIGURE = 'configure',
}

/**
 * User identity and role information
 */
export interface User {
  id: string;
  name: string;
  role: Role;
  permissions?: Permission[];
}

/**
 * Audit log entry for tracking all changes
 */
export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  discId: string;
  discName: string;
  changeDescription: string;
  previousState?: any;
  newState?: any;
  metadata?: Record<string, any>;
}

/**
 * State snapshot for rollback functionality
 */
export interface StateSnapshot {
  id: string;
  timestamp: Date;
  userId: string;
  discStates: Map<string, any>;
  description?: string;
}

/**
 * Configuration for the DJ Control Layer
 */
export interface DJControlLayerConfig {
  /** Enable audit logging */
  enableAuditLog?: boolean;
  /** Maximum number of snapshots to keep */
  maxSnapshots?: number;
  /** Enable cross-user isolation */
  enableUserIsolation?: boolean;
  /** Compliance validation rules */
  complianceRules?: ComplianceRule[];
  /** Custom integration hooks */
  hooks?: IntegrationHooks;
}

/**
 * Compliance rule definition
 */
export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  validate: (context: any) => Promise<ComplianceResult>;
}

/**
 * Result of compliance validation
 */
export interface ComplianceResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Integration hooks for host application
 */
export interface IntegrationHooks {
  onBeforeChange?: (context: ChangeContext) => Promise<boolean>;
  onAfterChange?: (context: ChangeContext) => Promise<void>;
  onBeforeRollback?: (snapshotId: string) => Promise<boolean>;
  onAfterRollback?: (snapshotId: string) => Promise<void>;
  onAuditLog?: (entry: AuditLogEntry) => Promise<void>;
}

/**
 * Context for change operations
 */
export interface ChangeContext {
  user: User;
  discId: string;
  action: string;
  data: any;
  metadata?: Record<string, any>;
}

/**
 * Disc metadata
 */
export interface DiscMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  requiredRole: Role;
  requiredPermissions: Permission[];
}

/**
 * Disc state
 */
export interface DiscState {
  enabled: boolean;
  config: Record<string, any>;
  data: any;
  lastModified: Date;
  lastModifiedBy: string;
}
