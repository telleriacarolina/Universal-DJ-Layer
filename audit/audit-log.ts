/**
 * Audit Log - Comprehensive audit logging for all operations
 * 
 * Records all control operations with full context for compliance,
 * debugging, and security analysis.
 */

import { EventEmitter } from 'events';

export interface AuditEntry {
  /** Unique identifier for this audit entry */
  entryId: string;
  /** Timestamp when the event occurred */
  timestamp: number;
  /** Action performed */
  action: 'apply' | 'revert' | 'preview' | 'list' | 'policy-change' | 'role-change';
  /** ID of the actor who performed the action */
  actorId: string;
  /** Role type of the actor */
  actorRole: string;
  /** ID of the control (if applicable) */
  controlId?: string;
  /** Type of disc involved (if applicable) */
  discType?: string;
  /** Result of the action */
  result: 'success' | 'failure' | 'partial';
  /** Detailed changes made */
  changes?: Record<string, any>;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** IP address of the actor (if available) */
  ipAddress?: string;
  /** User agent (if available) */
  userAgent?: string;
}

export interface AuditQueryOptions {
  /** Filter by control ID */
  controlId?: string;
  /** Filter by actor ID */
  actorId?: string;
  /** Filter by action type */
  action?: AuditEntry['action'];
  /** Filter by result */
  result?: AuditEntry['result'];
  /** Time range start */
  startTime?: number;
  /** Time range end */
  endTime?: number;
  /** Maximum number of entries to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

export interface AuditLogConfig {
  /** Enable audit logging */
  enabled?: boolean;
  /** Storage backend */
  storage?: 'memory' | 'file' | 'database';
  /** Retention period in days */
  retentionDays?: number;
  /** Whether to include sensitive data in logs */
  includeSensitiveData?: boolean;
  /** Custom storage path (for file storage) */
  storagePath?: string;
  /** Custom list of sensitive fields to redact (optional) */
  sensitiveFields?: string[];
}

export class AuditLog extends EventEmitter {
  private config: AuditLogConfig;
  private entries: AuditEntry[] = [];
  private entryIndex: Map<string, AuditEntry> = new Map();
  private streamCallbacks: Set<(entry: AuditEntry) => void> = new Set();
  private sensitiveFieldsLowercase: string[];

  constructor(config: AuditLogConfig = {}) {
    super();
    this.config = {
      enabled: config.enabled ?? true,
      storage: config.storage ?? 'memory',
      retentionDays: config.retentionDays ?? 365,
      includeSensitiveData: config.includeSensitiveData ?? false,
      storagePath: config.storagePath,
      sensitiveFields: config.sensitiveFields,
    };

    // Pre-compute lowercase sensitive fields for performance
    const defaultSensitiveFields = ['password', 'token', 'secret', 'apiKey', 'privateKey', 'ssn', 'creditCard'];
    const fields = this.config.sensitiveFields || defaultSensitiveFields;
    this.sensitiveFieldsLowercase = fields.map(f => f.toLowerCase());
  }

  /**
   * Log an audit entry
   * @param entry - Audit entry without entryId and timestamp (auto-generated)
   * @returns Promise resolving to the entry ID
   * @example
   * const entryId = await auditLog.log({
   *   action: 'apply',
   *   actorId: 'user-123',
   *   actorRole: 'admin',
   *   controlId: 'control-456',
   *   result: 'success'
   * });
   */
  async log(entry: Omit<AuditEntry, 'entryId' | 'timestamp'>): Promise<string> {
    if (!this.config.enabled) {
      return '';
    }

    const fullEntry: AuditEntry = {
      entryId: this.generateEntryId(),
      timestamp: Date.now(),
      ...entry,
    };

    // Sanitize sensitive data if needed
    if (!this.config.includeSensitiveData && fullEntry.changes) {
      fullEntry.changes = this.sanitizeSensitiveData(fullEntry.changes);
    }

    // Add to in-memory array
    this.entries.push(fullEntry);
    this.entryIndex.set(fullEntry.entryId, fullEntry);

    // Emit event for real-time monitoring
    this.emit('audit-logged', fullEntry);

    // Notify stream callbacks
    this.streamCallbacks.forEach(callback => {
      try {
        callback(fullEntry);
      } catch (error) {
        // Ignore callback errors to prevent breaking audit logging
        console.error('Stream callback error:', error);
      }
    });

    return fullEntry.entryId;
  }

  /**
   * Query audit log entries with filtering
   * @param options - Query filter options
   * @returns Promise resolving to array of matching audit entries
   * @example
   * const entries = await auditLog.query({
   *   actorId: 'user-123',
   *   startTime: Date.now() - 86400000,
   *   limit: 50
   * });
   */
  async query(options: AuditQueryOptions = {}): Promise<AuditEntry[]> {
    this.emit('audit-query', options);

    let filtered = [...this.entries];

    // Apply filters
    if (options.controlId) {
      filtered = filtered.filter(e => e.controlId === options.controlId);
    }
    if (options.actorId) {
      filtered = filtered.filter(e => e.actorId === options.actorId);
    }
    if (options.action) {
      filtered = filtered.filter(e => e.action === options.action);
    }
    if (options.result) {
      filtered = filtered.filter(e => e.result === options.result);
    }
    if (options.startTime !== undefined) {
      filtered = filtered.filter(e => e.timestamp >= options.startTime!);
    }
    if (options.endTime !== undefined) {
      filtered = filtered.filter(e => e.timestamp <= options.endTime!);
    }

    // Sort
    const sortDir = options.sortDirection ?? 'desc';
    filtered.sort((a, b) => 
      sortDir === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
    );

    // Emit query event
    this.emit('audit-query', { options, resultCount: filtered.length });

    // Pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 100;
    return filtered.slice(offset, offset + limit);
  }

  /**
   * Stream audit events in real-time
   * @param callback - Function to call for each new audit entry
   * @returns Function to unsubscribe from stream
   * @example
   * const unsubscribe = await auditLog.stream((entry) => {
   *   console.log('New audit entry:', entry);
   * });
   * // Later: unsubscribe();
   */
  async stream(callback: (entry: AuditEntry) => void): Promise<() => void> {
    this.streamCallbacks.add(callback);
    return () => {
      this.streamCallbacks.delete(callback);
    };
  }

  /**
   * Get a specific audit entry by ID
   * @param entryId - The entry ID to retrieve
   * @returns Promise resolving to the audit entry or null if not found
   */
  async getEntry(entryId: string): Promise<AuditEntry | null> {
    return this.entryIndex.get(entryId) ?? null;
  }

  /**
   * Remove audit entries older than retention period
   * @param retentionDays - Number of days to retain entries
   * @returns Promise resolving to number of entries removed
   * @example
   * const removed = await auditLog.cleanup(90); // Remove entries older than 90 days
   */
  async cleanup(retentionDays: number): Promise<number> {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const beforeCount = this.entries.length;
    
    this.entries = this.entries.filter(e => {
      if (e.timestamp < cutoffTime) {
        this.entryIndex.delete(e.entryId);
        return false;
      }
      return true;
    });

    const removed = beforeCount - this.entries.length;
    
    if (removed > 0) {
      this.emit('audit-cleanup', { removed, retentionDays });
    }

    return removed;
  }

  /**
   * Export audit log to specified format
   * @param format - Export format ('json' or 'csv')
   * @param options - Optional query options to filter exported entries
   * @returns Promise resolving to formatted string
   * @example
   * const jsonExport = await auditLog.export('json', { actorId: 'user-123' });
   * const csvExport = await auditLog.export('csv');
   */
  async export(format: 'json' | 'csv', options?: AuditQueryOptions): Promise<string> {
    const entries = await this.query(options ?? {});

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    }

    if (format === 'csv') {
      if (entries.length === 0) {
        return '';
      }

      // CSV header
      const headers = [
        'entryId',
        'timestamp',
        'action',
        'actorId',
        'actorRole',
        'controlId',
        'discType',
        'result',
        'error',
        'ipAddress',
        'userAgent',
      ];

      const csvLines = [headers.join(',')];

      // CSV rows
      for (const entry of entries) {
        const row = [
          entry.entryId,
          entry.timestamp.toString(),
          entry.action,
          entry.actorId,
          entry.actorRole,
          entry.controlId ?? '',
          entry.discType ?? '',
          entry.result,
          entry.error ? `"${entry.error.replace(/"/g, '""')}"` : '',
          entry.ipAddress ?? '',
          entry.userAgent ? `"${entry.userAgent.replace(/"/g, '""')}"` : '',
        ];
        csvLines.push(row.join(','));
      }

      return csvLines.join('\n');
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Sanitize sensitive data from changes object
   * @private
   */
  private sanitizeSensitiveData(changes: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const key in changes) {
      const lowerKey = key.toLowerCase();
      if (this.sensitiveFieldsLowercase.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof changes[key] === 'object' && changes[key] !== null) {
        sanitized[key] = this.sanitizeSensitiveData(changes[key]);
      } else {
        sanitized[key] = changes[key];
      }
    }

    return sanitized;
  }

  /**
   * Generate a unique entry ID
   * @private
   */
  private generateEntryId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
