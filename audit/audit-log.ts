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
}

export class AuditLog extends EventEmitter {
  private config: AuditLogConfig;
  private entries: AuditEntry[] = [];
  private entryIndex: Map<string, AuditEntry[]> = new Map();
  private streamCallbacks: Set<(entry: AuditEntry) => void> = new Set();

  constructor(config: AuditLogConfig = {}) {
    super();
    this.config = {
      enabled: config.enabled ?? true,
      storage: config.storage ?? 'memory',
      retentionDays: config.retentionDays ?? 365,
      includeSensitiveData: config.includeSensitiveData ?? false,
      storagePath: config.storagePath,
    };
  }

  /**
   * Log an audit entry
   * @param entry Audit entry data (without entryId and timestamp)
   * @returns The unique entry ID
   * @example
   * ```typescript
   * const entryId = await auditLog.log({
   *   action: 'apply',
   *   actorId: 'user-123',
   *   actorRole: 'admin',
   *   controlId: 'ctrl-456',
   *   result: 'success'
   * });
   * ```
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
    if (!this.config.includeSensitiveData) {
      fullEntry.changes = this.sanitizeSensitiveData(fullEntry.changes);
      fullEntry.metadata = this.sanitizeSensitiveData(fullEntry.metadata);
    }

    // Add to in-memory array
    this.entries.push(fullEntry);
    
    // Update indexes for fast lookups
    this.updateIndexes(fullEntry);

    // Emit event for real-time monitoring
    this.emit('audit-logged', fullEntry);
    
    // Notify stream callbacks
    this.streamCallbacks.forEach(callback => {
      try {
        callback(fullEntry);
      } catch (error) {
        // Ignore callback errors to prevent disruption
      }
    });

    return fullEntry.entryId;
  }

  /**
   * Query audit log entries with filtering and pagination
   * @param options Query options for filtering and pagination
   * @returns Array of matching audit entries
   * @example
   * ```typescript
   * const entries = await auditLog.query({
   *   actorId: 'user-123',
   *   action: 'apply',
   *   startTime: Date.now() - 86400000,
   *   limit: 50
   * });
   * ```
   */
  async query(options: AuditQueryOptions = {}): Promise<AuditEntry[]> {
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
    const sortDirection = options.sortDirection ?? 'desc';
    if (sortDirection === 'asc') {
      filtered.sort((a, b) => a.timestamp - b.timestamp);
    } else {
      filtered.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Emit query event
    this.emit('audit-query', { options, resultCount: filtered.length });

    // Pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 100;
    return filtered.slice(offset, offset + limit);
  }

  /**
   * Stream audit entries in real-time
   * @param callback Function to call for each new audit entry
   * @example
   * ```typescript
   * auditLog.stream((entry) => {
   *   console.log('New audit entry:', entry);
   * });
   * ```
   */
  async stream(callback: (entry: AuditEntry) => void): Promise<void> {
    this.streamCallbacks.add(callback);
  }

  /**
   * Get a specific audit entry by ID
   * @param entryId The unique entry ID
   * @returns The audit entry or null if not found
   */
  async getEntry(entryId: string): Promise<AuditEntry | null> {
    return this.entries.find(e => e.entryId === entryId) ?? null;
  }

  /**
   * Clean up old audit entries based on retention policy
   * @param retentionDays Number of days to retain entries
   * @returns Number of entries removed
   * @example
   * ```typescript
   * const removed = await auditLog.cleanup(90); // Keep last 90 days
   * ```
   */
  async cleanup(retentionDays: number): Promise<number> {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const beforeCount = this.entries.length;
    
    this.entries = this.entries.filter(e => e.timestamp >= cutoffTime);
    
    const removedCount = beforeCount - this.entries.length;
    
    // Rebuild indexes after cleanup
    this.rebuildIndexes();
    
    // Emit cleanup event
    if (removedCount > 0) {
      this.emit('audit-cleanup', { removedCount, retentionDays });
    }
    
    return removedCount;
  }

  /**
   * Export audit log to JSON or CSV format
   * @param format Export format ('json' or 'csv')
   * @param options Optional query options to filter exported entries
   * @returns Formatted export string
   * @example
   * ```typescript
   * const jsonExport = await auditLog.export('json', { actorId: 'user-123' });
   * const csvExport = await auditLog.export('csv');
   * ```
   */
  async export(format: 'json' | 'csv', options?: AuditQueryOptions): Promise<string> {
    // Query entries with filters if provided
    const entriesToExport = options ? await this.query(options) : this.entries;
    
    if (format === 'json') {
      return JSON.stringify(entriesToExport, null, 2);
    } else if (format === 'csv') {
      return this.exportToCsv(entriesToExport);
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Get audit trail for a specific control
   * @param controlId The control ID
   * @returns Array of audit entries for the control
   */
  async getControlAuditTrail(controlId: string): Promise<AuditEntry[]> {
    return this.query({ controlId, sortDirection: 'asc' });
  }

  /**
   * Get audit trail for a specific actor
   * @param actorId The actor ID
   * @returns Array of audit entries for the actor
   */
  async getActorAuditTrail(actorId: string): Promise<AuditEntry[]> {
    return this.query({ actorId, sortDirection: 'desc' });
  }

  /**
   * Unsubscribe from stream
   * @param callback The callback to remove
   */
  unsubscribe(callback: (entry: AuditEntry) => void): void {
    this.streamCallbacks.delete(callback);
  }

  /**
   * Update indexes for fast lookups
   * @private
   */
  private updateIndexes(entry: AuditEntry): void {
    // Control ID index
    if (entry.controlId) {
      const controlEntries = this.entryIndex.get(`control:${entry.controlId}`) ?? [];
      controlEntries.push(entry);
      this.entryIndex.set(`control:${entry.controlId}`, controlEntries);
    }
    
    // Actor ID index
    const actorEntries = this.entryIndex.get(`actor:${entry.actorId}`) ?? [];
    actorEntries.push(entry);
    this.entryIndex.set(`actor:${entry.actorId}`, actorEntries);
    
    // Action type index
    const actionEntries = this.entryIndex.get(`action:${entry.action}`) ?? [];
    actionEntries.push(entry);
    this.entryIndex.set(`action:${entry.action}`, actionEntries);
  }

  /**
   * Rebuild all indexes
   * @private
   */
  private rebuildIndexes(): void {
    this.entryIndex.clear();
    this.entries.forEach(entry => this.updateIndexes(entry));
  }

  /**
   * Generate a unique entry ID
   * @private
   */
  private generateEntryId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Sanitize sensitive data from objects
   * @private
   */
  private sanitizeSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'accessToken',
      'access_token',
      'privateKey',
      'private_key',
      'ssn',
      'creditCard',
      'credit_card',
    ];
    
    const sanitized = { ...data };
    
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key contains sensitive field name
      if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeSensitiveData(sanitized[key]);
      }
    }
    
    return sanitized;
  }

  /**
   * Export entries to CSV format
   * @private
   */
  private exportToCsv(entries: AuditEntry[]): string {
    if (entries.length === 0) {
      return '';
    }
    
    // CSV headers
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
    
    const rows = entries.map(entry => [
      entry.entryId,
      new Date(entry.timestamp).toISOString(),
      entry.action,
      entry.actorId,
      entry.actorRole,
      entry.controlId ?? '',
      entry.discType ?? '',
      entry.result,
      entry.error ?? '',
      entry.ipAddress ?? '',
      entry.userAgent ?? '',
    ]);
    
    // Escape CSV values
    const escapeCsvValue = (value: any): string => {
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCsvValue).join(','))
    ];
    
    return csvLines.join('\n');
  }
}
