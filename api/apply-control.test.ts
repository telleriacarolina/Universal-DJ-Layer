/**
 * Unit tests for apply-control API
 */

import { applyControl } from './apply-control';
import { PermissionError, PolicyViolationError, ApplyError, ValidationError } from './errors';
import type { DJEngine } from '../core/dj-engine';
import type { Disc } from '../discs/feature-disc';
import type { Actor } from './types';

describe('applyControl', () => {
  let mockEngine: jest.Mocked<DJEngine>;
  let mockDisc: Disc;
  let mockActor: Actor;

  beforeEach(() => {
    // Create mock engine
    mockEngine = {
      applyControl: jest.fn(),
      revertControl: jest.fn(),
      previewControl: jest.fn(),
      listControls: jest.fn(),
      getAuditLog: jest.fn(),
      getChangeHistory: jest.fn(),
      getDiff: jest.fn(),
    } as any;

    // Create mock disc
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

    // Create mock actor with permissions
    mockActor = {
      id: 'user-1',
      role: {
        metadata: { roleId: 'role-1', roleType: 'admin', userId: 'user-1', grantedAt: Date.now() },
        hasPermission: jest.fn().mockReturnValue(true),
        getPermissions: jest.fn().mockReturnValue(['apply-discs']),
        getHierarchyLevel: jest.fn().mockReturnValue(2),
      },
    };
  });

  test('successfully applies control', async () => {
    const mockResult = {
      controlId: 'control-123',
      timestamp: Date.now(),
      affectedSystems: ['system-1'],
      status: 'success' as const,
    };

    mockEngine.applyControl.mockResolvedValue(mockResult);

    const result = await applyControl(mockEngine, mockDisc, mockActor);

    expect(result.success).toBe(true);
    expect(result.controlId).toBe('control-123');
    expect(result.changes).toEqual(['system-1']);
    expect(mockEngine.applyControl).toHaveBeenCalledWith(
      mockDisc,
      mockActor.role,
      { previewFirst: undefined }
    );
  });

  test('throws ValidationError if disc is invalid', async () => {
    await expect(
      applyControl(mockEngine, null as any, mockActor)
    ).rejects.toThrow(ValidationError);
  });

  test('throws ValidationError if actor is invalid', async () => {
    await expect(
      applyControl(mockEngine, mockDisc, null as any)
    ).rejects.toThrow(ValidationError);
  });

  test('throws PermissionError if actor lacks permission', async () => {
    mockActor.role.hasPermission = jest.fn().mockReturnValue(false);

    await expect(
      applyControl(mockEngine, mockDisc, mockActor)
    ).rejects.toThrow(PermissionError);
    
    await expect(
      applyControl(mockEngine, mockDisc, mockActor)
    ).rejects.toThrow('lacks permission to apply discs');
  });

  test('evaluates policies if available', async () => {
    const mockEvaluatePolicies = jest.fn().mockResolvedValue({
      allowed: true,
      reason: 'OK',
    });
    (mockEngine as any).evaluatePolicies = mockEvaluatePolicies;

    const mockResult = {
      controlId: 'control-123',
      timestamp: Date.now(),
      affectedSystems: [],
      status: 'success' as const,
    };
    mockEngine.applyControl.mockResolvedValue(mockResult);

    await applyControl(mockEngine, mockDisc, mockActor);

    expect(mockEvaluatePolicies).toHaveBeenCalledWith({
      action: 'apply',
      actor: mockActor,
      disc: mockDisc,
      targetState: undefined,
    });
  });

  test('throws PolicyViolationError if policies are violated', async () => {
    const mockEvaluatePolicies = jest.fn().mockResolvedValue({
      allowed: false,
      reason: 'Safety check failed',
      violations: [{ rule: 'safety' }],
    });
    (mockEngine as any).evaluatePolicies = mockEvaluatePolicies;

    await expect(
      applyControl(mockEngine, mockDisc, mockActor)
    ).rejects.toThrow(PolicyViolationError);

    await expect(
      applyControl(mockEngine, mockDisc, mockActor)
    ).rejects.toThrow('Safety check failed');
  });

  test('creates snapshot before applying', async () => {
    const mockCreateSnapshot = jest.fn().mockResolvedValue({
      snapshotId: 'snapshot-123',
    });
    (mockEngine as any).createSnapshot = mockCreateSnapshot;

    const mockResult = {
      controlId: 'control-123',
      timestamp: Date.now(),
      affectedSystems: [],
      status: 'success' as const,
    };
    mockEngine.applyControl.mockResolvedValue(mockResult);

    const result = await applyControl(mockEngine, mockDisc, mockActor);

    expect(mockCreateSnapshot).toHaveBeenCalledWith({
      reason: 'pre-apply',
      metadata: { actorId: 'user-1', discId: 'disc-1' },
    });
    expect(result.snapshotId).toBe('snapshot-123');
  });

  test('logs to audit trail on success', async () => {
    const mockAuditLog = jest.fn();
    (mockEngine as any).auditLog = { log: mockAuditLog };

    const mockResult = {
      controlId: 'control-123',
      timestamp: Date.now(),
      affectedSystems: ['system-1'],
      status: 'success' as const,
    };
    mockEngine.applyControl.mockResolvedValue(mockResult);

    await applyControl(mockEngine, mockDisc, mockActor);

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'apply',
        actorId: 'user-1',
        controlId: 'control-123',
        result: 'success',
      })
    );
  });

  test('rolls back on error', async () => {
    const mockCreateSnapshot = jest.fn().mockResolvedValue({
      snapshotId: 'snapshot-123',
    });
    const mockRollback = jest.fn();
    (mockEngine as any).createSnapshot = mockCreateSnapshot;
    (mockEngine as any).rollbackToSnapshot = mockRollback;

    mockEngine.applyControl.mockRejectedValue(new Error('Apply failed'));

    await expect(
      applyControl(mockEngine, mockDisc, mockActor)
    ).rejects.toThrow(ApplyError);

    expect(mockRollback).toHaveBeenCalledWith('snapshot-123');
  });

  test('logs failure to audit trail on error', async () => {
    const mockAuditLog = jest.fn();
    (mockEngine as any).auditLog = { log: mockAuditLog };

    mockEngine.applyControl.mockRejectedValue(new Error('Apply failed'));

    await expect(
      applyControl(mockEngine, mockDisc, mockActor)
    ).rejects.toThrow(ApplyError);

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'apply',
        actorId: 'user-1',
        result: 'failure',
        metadata: expect.objectContaining({
          error: 'Apply failed',
        }),
      })
    );
  });

  test('passes options to engine', async () => {
    const mockResult = {
      controlId: 'control-123',
      timestamp: Date.now(),
      affectedSystems: [],
      status: 'success' as const,
    };
    mockEngine.applyControl.mockResolvedValue(mockResult);

    await applyControl(mockEngine, mockDisc, mockActor, {
      previewFirst: true,
      targetState: 'state-1',
    });

    expect(mockEngine.applyControl).toHaveBeenCalledWith(
      mockDisc,
      mockActor.role,
      { previewFirst: true }
    );
  });
});
