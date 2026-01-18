import { AuditLogger } from '../audit-logger';
import { AuditLogEntry } from '../types';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger(100);
  });

  describe('log', () => {
    it('should add a log entry with timestamp', () => {
      auditLogger.log({
        userId: 'user-1',
        userName: 'Test User',
        action: 'test-action',
        discId: 'disc-1',
        discName: 'Test Disc',
        changeDescription: 'Test change'
      });

      const logs = auditLogger.getAllLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('should maintain max log size', () => {
      const smallLogger = new AuditLogger(5);
      
      for (let i = 0; i < 10; i++) {
        smallLogger.log({
          userId: `user-${i}`,
          userName: `User ${i}`,
          action: 'action',
          discId: 'disc-1',
          discName: 'Disc',
          changeDescription: `Change ${i}`
        });
      }

      expect(smallLogger.getAllLogs()).toHaveLength(5);
    });
  });

  describe('getLogsByUser', () => {
    it('should filter logs by user ID', () => {
      auditLogger.log({
        userId: 'user-1',
        userName: 'User 1',
        action: 'action1',
        discId: 'disc-1',
        discName: 'Disc 1',
        changeDescription: 'Change 1'
      });

      auditLogger.log({
        userId: 'user-2',
        userName: 'User 2',
        action: 'action2',
        discId: 'disc-2',
        discName: 'Disc 2',
        changeDescription: 'Change 2'
      });

      const user1Logs = auditLogger.getLogsByUser('user-1');
      expect(user1Logs).toHaveLength(1);
      expect(user1Logs[0].userId).toBe('user-1');
    });
  });

  describe('getLogsByDisc', () => {
    it('should filter logs by disc ID', () => {
      auditLogger.log({
        userId: 'user-1',
        userName: 'User 1',
        action: 'action1',
        discId: 'disc-1',
        discName: 'Disc 1',
        changeDescription: 'Change 1'
      });

      auditLogger.log({
        userId: 'user-1',
        userName: 'User 1',
        action: 'action2',
        discId: 'disc-2',
        discName: 'Disc 2',
        changeDescription: 'Change 2'
      });

      const disc1Logs = auditLogger.getLogsByDisc('disc-1');
      expect(disc1Logs).toHaveLength(1);
      expect(disc1Logs[0].discId).toBe('disc-1');
    });
  });

  describe('export and import', () => {
    it('should export and import logs correctly', () => {
      auditLogger.log({
        userId: 'user-1',
        userName: 'User 1',
        action: 'action1',
        discId: 'disc-1',
        discName: 'Disc 1',
        changeDescription: 'Change 1'
      });

      const exported = auditLogger.export();
      const newLogger = new AuditLogger();
      newLogger.import(exported);

      const importedLogs = newLogger.getAllLogs();
      expect(importedLogs).toHaveLength(1);
      expect(importedLogs[0].userId).toBe('user-1');
    });
  });
});
