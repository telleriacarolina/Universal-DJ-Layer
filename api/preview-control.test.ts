/**
 * Unit tests for preview-control API
 */

import { previewControl } from './preview-control';
import { PermissionError, ValidationError } from './errors';
import type { DJEngine } from '../core/dj-engine';
import type { Disc } from '../discs/feature-disc';
import type { Actor } from './types';

describe('previewControl', () => {
  let mockEngine: jest.Mocked<DJEngine>;
  let mockDisc: Disc;
  let mockActor: Actor;

  beforeEach(() => {
    mockEngine = {
      applyControl: jest.fn(),
      revertControl: jest.fn(),
      previewControl: jest.fn(),
      listControls: jest.fn(),
      getAuditLog: jest.fn(),
      getChangeHistory: jest.fn(),
      getDiff: jest.fn(),
    } as any;

    mockDisc = {
      metadata: {
        id: 'disc-1',
        type: 'feature',
        name: 'Test Disc',
        version: '1.0.0',
        createdAt: Date.now(),
      },
      apply: jest.fn(),
      revert: jest.fn(),
      preview: jest.fn(),
      validate: jest.fn(),
    };

    mockActor = {
      id: 'user-1',
      role: {
        metadata: { roleId: 'role-1', roleType: 'admin', userId: 'user-1', grantedAt: Date.now() },
        hasPermission: jest.fn().mockReturnValue(true),
        getPermissions: jest.fn().mockReturnValue(['preview', 'preview-control']),
        getHierarchyLevel: jest.fn().mockReturnValue(2),
      },
    };
  });

  test('successfully previews control', async () => {
    const mockResult = {
      safe: true,
      affectedSystems: ['system-1'],
      potentialIssues: [],
      diff: { changes: ['change-1'] },
    };

    mockEngine.previewControl.mockResolvedValue(mockResult);

    const result = await previewControl(mockEngine, mockDisc, mockActor);

    expect(result.safe).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(result.changes).toEqual({ changes: ['change-1'] });
  });

  test('throws ValidationError if disc is invalid', async () => {
    await expect(
      previewControl(mockEngine, null as any, mockActor)
    ).rejects.toThrow(ValidationError);
  });

  test('throws ValidationError if actor is invalid', async () => {
    await expect(
      previewControl(mockEngine, mockDisc, null as any)
    ).rejects.toThrow(ValidationError);
  });

  test('throws PermissionError if actor lacks permission', async () => {
    mockActor.role.hasPermission = jest.fn().mockReturnValue(false);

    await expect(
      previewControl(mockEngine, mockDisc, mockActor)
    ).rejects.toThrow(PermissionError);

    await expect(
      previewControl(mockEngine, mockDisc, mockActor)
    ).rejects.toThrow('lacks permission to preview');
  });

  test('creates temporary snapshot', async () => {
    const mockCreateSnapshot = jest.fn().mockResolvedValue({
      snapshotId: 'snapshot-temp',
    });
    const mockDeleteSnapshot = jest.fn();
    (mockEngine as any).createSnapshot = mockCreateSnapshot;
    (mockEngine as any).deleteSnapshot = mockDeleteSnapshot;

    const mockResult = {
      safe: true,
      affectedSystems: [],
      potentialIssues: [],
      diff: {},
    };
    mockEngine.previewControl.mockResolvedValue(mockResult);

    await previewControl(mockEngine, mockDisc, mockActor);

    expect(mockCreateSnapshot).toHaveBeenCalledWith({
      reason: 'preview',
      temporary: true,
      metadata: { actorId: 'user-1', discId: 'disc-1' },
    });
  });

  test('cleans up snapshot after preview', async () => {
    const mockCreateSnapshot = jest.fn().mockResolvedValue({
      snapshotId: 'snapshot-temp',
    });
    const mockDeleteSnapshot = jest.fn();
    (mockEngine as any).createSnapshot = mockCreateSnapshot;
    (mockEngine as any).deleteSnapshot = mockDeleteSnapshot;

    const mockResult = {
      safe: true,
      affectedSystems: [],
      potentialIssues: [],
      diff: {},
    };
    mockEngine.previewControl.mockResolvedValue(mockResult);

    await previewControl(mockEngine, mockDisc, mockActor);

    expect(mockDeleteSnapshot).toHaveBeenCalledWith('snapshot-temp');
  });

  test('cleans up snapshot even on error', async () => {
    const mockCreateSnapshot = jest.fn().mockResolvedValue({
      snapshotId: 'snapshot-temp',
    });
    const mockDeleteSnapshot = jest.fn();
    (mockEngine as any).createSnapshot = mockCreateSnapshot;
    (mockEngine as any).deleteSnapshot = mockDeleteSnapshot;

    mockEngine.previewControl.mockRejectedValue(new Error('Preview failed'));

    await expect(
      previewControl(mockEngine, mockDisc, mockActor)
    ).rejects.toThrow('Preview failed');

    expect(mockDeleteSnapshot).toHaveBeenCalledWith('snapshot-temp');
  });

  test('logs preview to audit trail', async () => {
    const mockAuditLog = jest.fn();
    (mockEngine as any).auditLog = { log: mockAuditLog };

    const mockResult = {
      safe: true,
      affectedSystems: [],
      potentialIssues: [],
      diff: {},
    };
    mockEngine.previewControl.mockResolvedValue(mockResult);

    await previewControl(mockEngine, mockDisc, mockActor);

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'preview',
        actorId: 'user-1',
        result: 'success',
        metadata: expect.objectContaining({ safe: true }),
      })
    );
  });

  test('returns warnings from preview', async () => {
    const mockResult = {
      safe: false,
      affectedSystems: ['system-1'],
      potentialIssues: ['Warning 1', 'Warning 2'],
      diff: {},
    };

    mockEngine.previewControl.mockResolvedValue(mockResult);

    const result = await previewControl(mockEngine, mockDisc, mockActor);

    expect(result.safe).toBe(false);
    expect(result.warnings).toEqual(['Warning 1', 'Warning 2']);
  });

  test('uses sandbox execution if available', async () => {
    const mockCreateSnapshot = jest.fn().mockResolvedValue({
      snapshotId: 'snapshot-temp',
    });
    const mockExecuteInSandbox = jest.fn().mockResolvedValue({
      stateId: 'state-1',
      impact: ['impact-1'],
    });
    const mockCalculateDiff = jest.fn().mockResolvedValue({ diff: 'data' });
    const mockEvaluateSafety = jest.fn().mockResolvedValue({
      safe: true,
      warnings: ['warning-1'],
    });
    const mockDeleteSnapshot = jest.fn();

    (mockEngine as any).createSnapshot = mockCreateSnapshot;
    (mockEngine as any).executeInSandbox = mockExecuteInSandbox;
    (mockEngine as any).calculateDiff = mockCalculateDiff;
    (mockEngine as any).evaluateSafety = mockEvaluateSafety;
    (mockEngine as any).deleteSnapshot = mockDeleteSnapshot;

    const result = await previewControl(mockEngine, mockDisc, mockActor);

    expect(mockExecuteInSandbox).toHaveBeenCalled();
    expect(result.safe).toBe(true);
    expect(result.warnings).toEqual(['warning-1']);
  });
});
