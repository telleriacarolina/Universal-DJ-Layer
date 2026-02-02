import { AuditLogEntry, User } from './types';

/**
 * Audit logging system for tracking all changes
 */
export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs: number;

  constructor(maxLogs: number = 10000) {
    this.maxLogs = maxLogs;
  }

  /**
   * Log an action
   */
  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    this.logs.push(logEntry);

    // Maintain max log size
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Get all logs
   */
  getAllLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs for a specific user
   */
  getLogsByUser(userId: string): AuditLogEntry[] {
    return this.logs.filter((log) => log.userId === userId);
  }

  /**
   * Get logs for a specific disc
   */
  getLogsByDisc(discId: string): AuditLogEntry[] {
    return this.logs.filter((log) => log.discId === discId);
  }

  /**
   * Get logs within a time range
   */
  getLogsByTimeRange(startTime: Date, endTime: Date): AuditLogEntry[] {
    return this.logs.filter((log) => log.timestamp >= startTime && log.timestamp <= endTime);
  }

  /**
   * Get logs by action type
   */
  getLogsByAction(action: string): AuditLogEntry[] {
    return this.logs.filter((log) => log.action === action);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Import logs from JSON
   */
  import(jsonData: string): void {
    try {
      const imported = JSON.parse(jsonData);
      if (Array.isArray(imported)) {
        this.logs = imported.map((entry) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }));
      }
    } catch (error) {
      throw new Error(`Failed to import audit logs: ${error}`);
    }
  }
}
