import { AuditLog, AuditEntry, AuditQueryOptions } from './audit-log';

describe('AuditLog', () => {
  let auditLog: AuditLog;

  beforeEach(() => {
    auditLog = new AuditLog({ retentionDays: 90 });
  });

  describe('Logging', () => {
    it('logs action with all required fields', async () => {
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        controlId: 'ctrl-456',
        result: 'success',
      });
      
      expect(entryId).toBeDefined();
      expect(entryId).toMatch(/^audit-\d+-[a-z0-9]+$/);
    });

    it('generates unique entry ID', async () => {
      const id1 = await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });
      
      const id2 = await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });
      
      expect(id1).not.toBe(id2);
    });

    it('captures timestamp correctly', async () => {
      const before = Date.now();
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        result: 'success',
      });
      const after = Date.now();
      
      const entry = await auditLog.getEntry(entryId);
      expect(entry!.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry!.timestamp).toBeLessThanOrEqual(after);
    });

    it('stores before and after state', async () => {
      const changes = {
        before: { value: 1 },
        after: { value: 2 },
      };
      
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        result: 'success',
        changes,
      });
      
      const entry = await auditLog.getEntry(entryId);
      expect(entry!.changes).toEqual(changes);
    });

    it('emits audit-logged event', (done) => {
      auditLog.on('audit-logged', (entry: AuditEntry) => {
        expect(entry.action).toBe('apply');
        done();
      });
      
      auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        result: 'success',
      });
    });

    it('returns entry ID after logging', async () => {
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        result: 'success',
      });
      
      const entry = await auditLog.getEntry(entryId);
      expect(entry!.entryId).toBe(entryId);
    });

    it('returns empty string when logging is disabled', async () => {
      const disabledLog = new AuditLog({ enabled: false });
      const entryId = await disabledLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        result: 'success',
      });
      
      expect(entryId).toBe('');
    });
  });

  describe('Querying', () => {
    beforeEach(async () => {
      // Create test data
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        controlId: 'ctrl-1',
        result: 'success',
      });
      
      await auditLog.log({
        action: 'revert',
        actorId: 'user-2',
        actorRole: 'moderator',
        controlId: 'ctrl-2',
        result: 'failure',
        error: 'Permission denied',
      });
      
      await auditLog.log({
        action: 'preview',
        actorId: 'user-1',
        actorRole: 'admin',
        controlId: 'ctrl-3',
        result: 'success',
      });
    });

    it('queries all entries', async () => {
      const entries = await auditLog.query();
      expect(entries.length).toBeGreaterThanOrEqual(3);
    });

    it('filters by actor ID', async () => {
      const entries = await auditLog.query({ actorId: 'user-1' });
      
      expect(entries.length).toBe(2);
      expect(entries.every(e => e.actorId === 'user-1')).toBe(true);
    });

    it('filters by action type', async () => {
      const entries = await auditLog.query({ action: 'apply' });
      
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('apply');
    });

    it('filters by result', async () => {
      const entries = await auditLog.query({ result: 'failure' });
      
      expect(entries.length).toBe(1);
      expect(entries[0].result).toBe('failure');
    });

    it('filters by time range', async () => {
      const now = Date.now();
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await auditLog.log({
        action: 'list',
        actorId: 'user-3',
        actorRole: 'user',
        result: 'success',
      });
      
      const entries = await auditLog.query({ startTime: now + 5 }); // Add buffer
      
      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries.some(e => e.actorId === 'user-3')).toBe(true);
    });

    it('filters by control ID', async () => {
      const entries = await auditLog.query({ controlId: 'ctrl-1' });
      
      expect(entries.length).toBe(1);
      expect(entries[0].controlId).toBe('ctrl-1');
    });

    it('supports pagination with limit and offset', async () => {
      const page1 = await auditLog.query({ limit: 2, offset: 0 });
      const page2 = await auditLog.query({ limit: 2, offset: 2 });
      
      expect(page1.length).toBe(2);
      expect(page2.length).toBeGreaterThanOrEqual(1);
      expect(page1[0].entryId).not.toBe(page2[0].entryId);
    });

    it('supports ascending sort', async () => {
      const entries = await auditLog.query({ sortDirection: 'asc' });
      
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].timestamp).toBeGreaterThanOrEqual(entries[i - 1].timestamp);
      }
    });

    it('supports descending sort', async () => {
      const entries = await auditLog.query({ sortDirection: 'desc' });
      
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].timestamp).toBeLessThanOrEqual(entries[i - 1].timestamp);
      }
    });

    it('emits audit-query event', (done) => {
      auditLog.on('audit-query', (event: any) => {
        expect(event.options).toBeDefined();
        expect(event.resultCount).toBeGreaterThan(0);
        done();
      });
      
      auditLog.query({ actorId: 'user-1' });
    });
  });

  describe('Streaming', () => {
    it('streams audit events to callback', (done) => {
      let callbackCalled = false;
      
      auditLog.stream((entry: AuditEntry) => {
        expect(entry.action).toBe('apply');
        callbackCalled = true;
      });
      
      auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        result: 'success',
      }).then(() => {
        expect(callbackCalled).toBe(true);
        done();
      });
    });

    it('multiple listeners receive events', (done) => {
      let count = 0;
      
      const callback1 = () => {
        count++;
      };
      
      const callback2 = () => {
        count++;
        if (count === 2) done();
      };
      
      auditLog.stream(callback1);
      auditLog.stream(callback2);
      
      auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        result: 'success',
      });
    });

    it('unsubscribes from stream', async () => {
      let callCount = 0;
      
      const callback = () => {
        callCount++;
      };
      
      await auditLog.stream(callback);
      
      await auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        result: 'success',
      });
      
      auditLog.unsubscribe(callback);
      
      await auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        result: 'success',
      });
      
      expect(callCount).toBe(1);
    });

    it('handles callback errors gracefully', async () => {
      await auditLog.stream(() => {
        throw new Error('Callback error');
      });
      
      // Should not throw
      await auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        result: 'success',
      });
    });
  });

  describe('Export', () => {
    beforeEach(async () => {
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        controlId: 'ctrl-1',
        result: 'success',
      });
      
      await auditLog.log({
        action: 'revert',
        actorId: 'user-2',
        actorRole: 'moderator',
        result: 'failure',
      });
    });

    it('exports to JSON format', async () => {
      const exported = await auditLog.export('json');
      
      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThanOrEqual(2);
    });

    it('exports to CSV format', async () => {
      const exported = await auditLog.export('csv');
      
      expect(exported).toBeDefined();
      expect(exported).toContain('entryId,timestamp,action');
      expect(exported).toContain('user-1');
      expect(exported).toContain('user-2');
    });

    it('exports with filters applied', async () => {
      const exported = await auditLog.export('json', { actorId: 'user-1' });
      
      const parsed = JSON.parse(exported);
      expect(parsed.every((e: AuditEntry) => e.actorId === 'user-1')).toBe(true);
    });

    it('handles empty export', async () => {
      const emptyLog = new AuditLog();
      const exported = await emptyLog.export('csv');
      
      expect(exported).toBe('');
    });

    it('escapes CSV values with commas', async () => {
      await auditLog.log({
        action: 'apply',
        actorId: 'user,with,commas',
        actorRole: 'admin',
        result: 'success',
      });
      
      const exported = await auditLog.export('csv');
      expect(exported).toContain('"user,with,commas"');
    });

    it('throws error for unsupported format', async () => {
      await expect(
        auditLog.export('xml' as any)
      ).rejects.toThrow('Unsupported export format');
    });
  });

  describe('Cleanup', () => {
    it('removes entries older than retention period', async () => {
      const oldTimestamp = Date.now() - (100 * 24 * 60 * 60 * 1000); // 100 days ago
      
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });
      
      // Manually create old entry
      const oldEntry: AuditEntry = {
        entryId: 'old-entry',
        timestamp: oldTimestamp,
        action: 'apply',
        actorId: 'user-old',
        actorRole: 'admin',
        result: 'success',
      };
      auditLog['entries'].push(oldEntry);
      
      const removed = await auditLog.cleanup(90);
      
      expect(removed).toBe(1);
    });

    it('returns count of removed entries', async () => {
      const oldTimestamp = Date.now() - (100 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < 3; i++) {
        const oldEntry: AuditEntry = {
          entryId: `old-${i}`,
          timestamp: oldTimestamp,
          action: 'apply',
          actorId: 'user-old',
          actorRole: 'admin',
          result: 'success',
        };
        auditLog['entries'].push(oldEntry);
      }
      
      const removed = await auditLog.cleanup(90);
      expect(removed).toBe(3);
    });

    it('emits audit-cleanup event', (done) => {
      const oldTimestamp = Date.now() - (100 * 24 * 60 * 60 * 1000);
      const oldEntry: AuditEntry = {
        entryId: 'old-entry',
        timestamp: oldTimestamp,
        action: 'apply',
        actorId: 'user-old',
        actorRole: 'admin',
        result: 'success',
      };
      auditLog['entries'].push(oldEntry);
      
      auditLog.on('audit-cleanup', (event: any) => {
        expect(event.removedCount).toBe(1);
        done();
      });
      
      auditLog.cleanup(90);
    });

    it('does not emit event when nothing removed', (done) => {
      let emitted = false;
      
      auditLog.on('audit-cleanup', () => {
        emitted = true;
      });
      
      auditLog.cleanup(90).then(() => {
        expect(emitted).toBe(false);
        done();
      });
    });
  });

  describe('Security', () => {
    it('sanitizes sensitive data when disabled', async () => {
      const secureLog = new AuditLog({ includeSensitiveData: false });
      
      await secureLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
        changes: {
          password: 'secret123',
          apiKey: 'key-abc',
        },
      });
      
      const entries = await secureLog.query();
      expect(entries[0].changes?.password).toBe('[REDACTED]');
      expect(entries[0].changes?.apiKey).toBe('[REDACTED]');
    });

    it('includes sensitive data when enabled', async () => {
      const insecureLog = new AuditLog({ includeSensitiveData: true });
      
      await insecureLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
        changes: {
          password: 'secret123',
        },
      });
      
      const entries = await insecureLog.query();
      expect(entries[0].changes?.password).toBe('secret123');
    });

    it('redacts PII fields correctly', async () => {
      const secureLog = new AuditLog({ includeSensitiveData: false });
      
      await secureLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
        metadata: {
          ssn: '123-45-6789',
          creditCard: '4111-1111-1111-1111',
          email: 'user@example.com',
        },
      });
      
      const entries = await secureLog.query();
      expect(entries[0].metadata?.ssn).toBe('[REDACTED]');
      expect(entries[0].metadata?.creditCard).toBe('[REDACTED]');
      expect(entries[0].metadata?.email).toBe('user@example.com');
    });

    it('handles nested sensitive data', async () => {
      const secureLog = new AuditLog({ includeSensitiveData: false });
      
      await secureLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
        changes: {
          user: {
            password: 'secret',
            profile: {
              privateKey: 'key123',
            },
          },
        },
      });
      
      const entries = await secureLog.query();
      expect(entries[0].changes?.user?.password).toBe('[REDACTED]');
      expect(entries[0].changes?.user?.profile?.privateKey).toBe('[REDACTED]');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing optional fields', async () => {
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
        // Optional fields omitted
      });
      
      const entry = await auditLog.getEntry(entryId);
      expect(entry!.controlId).toBeUndefined();
      expect(entry!.discType).toBeUndefined();
      expect(entry!.error).toBeUndefined();
    });

    it('handles empty query results', async () => {
      const emptyLog = new AuditLog();
      const entries = await emptyLog.query({ actorId: 'non-existent' });
      
      expect(entries).toEqual([]);
    });

    it('handles invalid entry ID', async () => {
      const entry = await auditLog.getEntry('invalid-id');
      expect(entry).toBeNull();
    });

    it('handles null values in changes', async () => {
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
        changes: {
          nullValue: null,
        },
      });
      
      const entries = await auditLog.query();
      expect(entries[0].changes?.nullValue).toBeNull();
    });
  });

  describe('Audit Trails', () => {
    it('retrieves control audit trail', async () => {
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        controlId: 'ctrl-1',
        result: 'success',
      });
      
      await auditLog.log({
        action: 'revert',
        actorId: 'user-2',
        actorRole: 'admin',
        controlId: 'ctrl-1',
        result: 'success',
      });
      
      const trail = await auditLog.getControlAuditTrail('ctrl-1');
      
      expect(trail.length).toBe(2);
      expect(trail.every(e => e.controlId === 'ctrl-1')).toBe(true);
    });

    it('retrieves actor audit trail', async () => {
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });
      
      await auditLog.log({
        action: 'preview',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });
      
      const trail = await auditLog.getActorAuditTrail('user-1');
      
      expect(trail.length).toBe(2);
      expect(trail.every(e => e.actorId === 'user-1')).toBe(true);
    });

    it('sorts control audit trail chronologically ascending', async () => {
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        controlId: 'ctrl-1',
        result: 'success',
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await auditLog.log({
        action: 'revert',
        actorId: 'user-1',
        actorRole: 'admin',
        controlId: 'ctrl-1',
        result: 'success',
      });
      
      const trail = await auditLog.getControlAuditTrail('ctrl-1');
      
      expect(trail[0].action).toBe('apply');
      expect(trail[1].action).toBe('revert');
    });

    it('sorts actor audit trail chronologically descending', async () => {
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await auditLog.log({
        action: 'revert',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });
      
      const trail = await auditLog.getActorAuditTrail('user-1');
      
      expect(trail[0].action).toBe('revert');
      expect(trail[1].action).toBe('apply');
    });
  });
});
