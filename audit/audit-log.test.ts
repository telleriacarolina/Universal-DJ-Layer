import { AuditLog, AuditEntry, AuditQueryOptions } from './audit-log';

describe('AuditLog', () => {
  let auditLog: AuditLog;

  beforeEach(() => {
    auditLog = new AuditLog();
  });

  describe('Logging', () => {
    test('logs action with all required fields', async () => {
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-123',
        actorRole: 'admin',
        controlId: 'control-456',
        discType: 'feature',
        result: 'success',
      });

      expect(entryId).toBeTruthy();
      expect(entryId).toContain('audit-');
    });

    test('generates unique entry ID', async () => {
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

    test('captures timestamp correctly', async () => {
      const before = Date.now();
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });
      const after = Date.now();

      const entry = await auditLog.getEntry(entryId);
      expect(entry).not.toBeNull();
      expect(entry!.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry!.timestamp).toBeLessThanOrEqual(after);
    });

    test('stores before and after state', async () => {
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
        changes: {
          before: { value: 1 },
          after: { value: 2 },
        },
      });

      const entry = await auditLog.getEntry(entryId);
      expect(entry!.changes).toHaveProperty('before');
      expect(entry!.changes).toHaveProperty('after');
    });

    test('emits audit-logged event', async () => {
      const eventPromise = new Promise<AuditEntry>((resolve) => {
        auditLog.once('audit-logged', resolve);
      });

      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      const eventData = await eventPromise;
      expect(eventData.actorId).toBe('user-1');
    });

    test('returns entry ID after logging', async () => {
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      const entry = await auditLog.getEntry(entryId);
      expect(entry).not.toBeNull();
      expect(entry!.entryId).toBe(entryId);
    });
  });

  describe('Querying', () => {
    beforeEach(async () => {
      // Setup test data
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        controlId: 'control-1',
        result: 'success',
      });

      await auditLog.log({
        action: 'revert',
        actorId: 'user-2',
        actorRole: 'user',
        controlId: 'control-2',
        result: 'success',
      });

      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        controlId: 'control-3',
        result: 'failure',
        error: 'Test error',
      });
    });

    test('queries all entries', async () => {
      const entries = await auditLog.query();

      expect(entries.length).toBeGreaterThanOrEqual(3);
    });

    test('filters by actor ID', async () => {
      const entries = await auditLog.query({ actorId: 'user-1' });

      expect(entries.length).toBe(2);
      entries.forEach(e => {
        expect(e.actorId).toBe('user-1');
      });
    });

    test('filters by action type', async () => {
      const entries = await auditLog.query({ action: 'revert' });

      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('revert');
    });

    test('filters by result', async () => {
      const entries = await auditLog.query({ result: 'failure' });

      expect(entries.length).toBe(1);
      expect(entries[0].result).toBe('failure');
      expect(entries[0].error).toBe('Test error');
    });

    test('filters by time range', async () => {
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 10));

      await auditLog.log({
        action: 'preview',
        actorId: 'user-3',
        actorRole: 'user',
        result: 'success',
      });

      const endTime = Date.now();

      const entries = await auditLog.query({ startTime, endTime });

      expect(entries.length).toBeGreaterThanOrEqual(1);
      entries.forEach(e => {
        expect(e.timestamp).toBeGreaterThanOrEqual(startTime);
        expect(e.timestamp).toBeLessThanOrEqual(endTime);
      });
    });

    test('filters by control ID', async () => {
      const entries = await auditLog.query({ controlId: 'control-1' });

      expect(entries.length).toBe(1);
      expect(entries[0].controlId).toBe('control-1');
    });

    test('supports pagination with limit and offset', async () => {
      const page1 = await auditLog.query({ limit: 2, offset: 0 });
      const page2 = await auditLog.query({ limit: 2, offset: 2 });

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeGreaterThanOrEqual(0);

      if (page1.length > 0 && page2.length > 0) {
        expect(page1[0].entryId).not.toBe(page2[0].entryId);
      }
    });

    test('supports ascending sort', async () => {
      const entries = await auditLog.query({ sortDirection: 'asc' });

      expect(entries.length).toBeGreaterThan(0);
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].timestamp).toBeGreaterThanOrEqual(entries[i - 1].timestamp);
      }
    });

    test('supports descending sort', async () => {
      const entries = await auditLog.query({ sortDirection: 'desc' });

      expect(entries.length).toBeGreaterThan(0);
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].timestamp).toBeLessThanOrEqual(entries[i - 1].timestamp);
      }
    });

    test('emits audit-query event', async () => {
      const eventPromise = new Promise<AuditQueryOptions>((resolve) => {
        auditLog.once('audit-query', resolve);
      });

      const queryOptions = { actorId: 'user-1' };
      await auditLog.query(queryOptions);

      const eventData = await eventPromise;
      expect(eventData).toEqual(queryOptions);
    });
  });

  describe('Streaming', () => {
    test('streams audit events to callback', async () => {
      const receivedEntries: AuditEntry[] = [];
      await auditLog.stream((entry) => {
        receivedEntries.push(entry);
      });

      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      await auditLog.log({
        action: 'revert',
        actorId: 'user-2',
        actorRole: 'user',
        result: 'success',
      });

      expect(receivedEntries.length).toBe(2);
      expect(receivedEntries[0].action).toBe('apply');
      expect(receivedEntries[1].action).toBe('revert');
    });

    test('multiple listeners receive events', async () => {
      const listener1Entries: AuditEntry[] = [];
      const listener2Entries: AuditEntry[] = [];

      await auditLog.stream((entry) => listener1Entries.push(entry));
      await auditLog.stream((entry) => listener2Entries.push(entry));

      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      expect(listener1Entries.length).toBe(1);
      expect(listener2Entries.length).toBe(1);
      expect(listener1Entries[0].entryId).toBe(listener2Entries[0].entryId);
    });

    test('unsubscribes from stream', async () => {
      const receivedEntries: AuditEntry[] = [];
      const unsubscribe = await auditLog.stream((entry) => {
        receivedEntries.push(entry);
      });

      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      expect(receivedEntries.length).toBe(1);

      unsubscribe();

      await auditLog.log({
        action: 'revert',
        actorId: 'user-2',
        actorRole: 'user',
        result: 'success',
      });

      expect(receivedEntries.length).toBe(1); // Should still be 1
    });
  });

  describe('Export', () => {
    beforeEach(async () => {
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        controlId: 'control-1',
        result: 'success',
      });

      await auditLog.log({
        action: 'revert',
        actorId: 'user-2',
        actorRole: 'user',
        controlId: 'control-2',
        result: 'failure',
        error: 'Test error',
      });
    });

    test('exports to JSON format', async () => {
      const json = await auditLog.export('json');

      expect(json).toBeTruthy();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThanOrEqual(2);
    });

    test('exports to CSV format', async () => {
      const csv = await auditLog.export('csv');

      expect(csv).toBeTruthy();
      const lines = csv.split('\n');
      expect(lines[0]).toContain('entryId');
      expect(lines[0]).toContain('timestamp');
      expect(lines[0]).toContain('action');
      expect(lines.length).toBeGreaterThan(2); // Header + at least 2 entries
    });

    test('exports with filters applied', async () => {
      const json = await auditLog.export('json', { actorId: 'user-1' });

      const parsed = JSON.parse(json);
      expect(parsed.length).toBeGreaterThanOrEqual(1);
      parsed.forEach((entry: AuditEntry) => {
        expect(entry.actorId).toBe('user-1');
      });
    });
  });

  describe('Cleanup', () => {
    test('removes entries older than retention period', async () => {
      // Create an entry
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      // Manually get and modify the entry to make it "old"
      const entry = await auditLog.getEntry(entryId);
      if (entry) {
        entry.timestamp = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days old
      }

      const countBefore = (await auditLog.query()).length;
      
      // Cleanup with 30 day retention (should remove the old entry)
      const removed = await auditLog.cleanup(30);

      const entriesAfter = await auditLog.query();
      expect(entriesAfter.length).toBeLessThan(countBefore);
      expect(removed).toBeGreaterThan(0);
    });

    test('returns count of removed entries', async () => {
      await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      await auditLog.log({
        action: 'revert',
        actorId: 'user-2',
        actorRole: 'user',
        result: 'success',
      });

      const removed = await auditLog.cleanup(0);

      expect(removed).toBeGreaterThanOrEqual(0);
      expect(typeof removed).toBe('number');
    });

    test('emits audit-cleanup event', async () => {
      // Create an old entry
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      // Make it old
      const entry = await auditLog.getEntry(entryId);
      if (entry) {
        entry.timestamp = Date.now() - (31 * 24 * 60 * 60 * 1000);
      }

      const eventPromise = new Promise<any>((resolve) => {
        auditLog.once('audit-cleanup', resolve);
      });

      // Cleanup with 30 day retention - should remove the old entry and emit event
      await auditLog.cleanup(30);

      const eventData = await eventPromise;
      expect(eventData).toHaveProperty('removed');
      expect(eventData).toHaveProperty('retentionDays');
      expect(eventData.removed).toBeGreaterThan(0);
    }, 10000); // Increase timeout
  });

  describe('Security', () => {
    test('sanitizes sensitive data when disabled', async () => {
      const secureLog = new AuditLog({ includeSensitiveData: false });

      await secureLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
        changes: {
          password: 'secret123',
          token: 'abc-def-ghi',
          normalField: 'visible',
        },
      });

      const entries = await secureLog.query();
      const entry = entries[0];

      expect(entry.changes!.password).toBe('[REDACTED]');
      expect(entry.changes!.token).toBe('[REDACTED]');
      expect(entry.changes!.normalField).toBe('visible');
    });

    test('includes sensitive data when enabled', async () => {
      const secureLog = new AuditLog({ includeSensitiveData: true });

      await secureLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
        changes: {
          password: 'secret123',
          normalField: 'visible',
        },
      });

      const entries = await secureLog.query();
      const entry = entries[0];

      expect(entry.changes!.password).toBe('secret123');
      expect(entry.changes!.normalField).toBe('visible');
    });

    test('redacts PII fields correctly', async () => {
      const secureLog = new AuditLog({ includeSensitiveData: false });

      await secureLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
        changes: {
          userPassword: 'secret',
          apiKey: 'key123',
          privateKey: 'private',
          ssn: '123-45-6789',
          creditCard: '4111-1111-1111-1111',
          email: 'test@example.com',
        },
      });

      const entries = await secureLog.query();
      const entry = entries[0];

      expect(entry.changes!.userPassword).toBe('[REDACTED]');
      expect(entry.changes!.apiKey).toBe('[REDACTED]');
      expect(entry.changes!.privateKey).toBe('[REDACTED]');
      expect(entry.changes!.ssn).toBe('[REDACTED]');
      expect(entry.changes!.creditCard).toBe('[REDACTED]');
      expect(entry.changes!.email).toBe('test@example.com'); // Not redacted
    });
  });

  describe('Edge Cases', () => {
    test('handles missing optional fields', async () => {
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
        // No controlId, discType, changes, error, metadata, etc.
      });

      const entry = await auditLog.getEntry(entryId);
      expect(entry).not.toBeNull();
      expect(entry!.controlId).toBeUndefined();
      expect(entry!.discType).toBeUndefined();
    });

    test('handles empty query results', async () => {
      const entries = await auditLog.query({ actorId: 'non-existent-user' });

      expect(entries).toEqual([]);
    });

    test('handles invalid entry ID', async () => {
      const entry = await auditLog.getEntry('invalid-id');

      expect(entry).toBeNull();
    });

    test('returns empty string when logging is disabled', async () => {
      const disabledLog = new AuditLog({ enabled: false });

      const entryId = await disabledLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
      });

      expect(entryId).toBe('');
    });

    test('handles complex metadata', async () => {
      const entryId = await auditLog.log({
        action: 'apply',
        actorId: 'user-1',
        actorRole: 'admin',
        result: 'success',
        metadata: {
          nested: {
            deep: {
              value: 'test',
            },
          },
          array: [1, 2, 3],
          mixed: { a: 1, b: 'text' },
        },
      });

      const entry = await auditLog.getEntry(entryId);
      expect(entry!.metadata).toBeDefined();
      expect(entry!.metadata!.nested.deep.value).toBe('test');
      expect(entry!.metadata!.array).toEqual([1, 2, 3]);
    });
  });
});
