/**
 * Unit tests for revert-control API
 */

import { revertControl } from './revert-control';
import { PermissionError, NotFoundError, ValidationError } from './errors';
import type { DJEngine } from '../core/dj-engine';
import type { Actor } from './types';

describe('revertControl', () => {
  let mockEngine: jest.Mocked<DJEngine>;
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

    mockActor = {
      id: 'user-1',
      role: {
        metadata: { roleId: 'role-1', roleType: 'admin', userId: 'user-1', grantedAt: Date.now() },
        hasPermission: jest.fn().mockReturnValue(true),
        getPermissions: jest.fn().mockReturnValue(['apply-discs', 'revert']),
        getHierarchyLevel: jest.fn().mockReturnValue(2),
      },
    };
  });

  test('successfully reverts control', async () => {
    mockEngine.revertControl.mockResolvedValue(undefined);

    const result = await revertControl(mockEngine, 'control-123', mockActor);

    expect(result.success).toBe(true);
    expect(result.controlId).toBe('control-123');
    expect(mockEngine.revertControl).toHaveBeenCalledWith(
      'control-123',
      mockActor.role
    );
  });

  test('throws ValidationError if control ID is invalid', async () => {
    await expect(
      revertControl(mockEngine, '' as any, mockActor)
    ).rejects.toThrow(ValidationError);
  });

  test('throws ValidationError if actor is invalid', async () => {
    await expect(
      revertControl(mockEngine, 'control-123', null as any)
    ).rejects.toThrow(ValidationError);
  });

  test('throws PermissionError if actor lacks permission', async () => {
    mockActor.role.hasPermission = jest.fn().mockReturnValue(false);

    await expect(
      revertControl(mockEngine, 'control-123', mockActor)
    ).rejects.toThrow(PermissionError);

    await expect(
      revertControl(mockEngine, 'control-123', mockActor)
    ).rejects.toThrow('lacks permission to revert');
  });

  test('throws NotFoundError if control does not exist', async () => {
    const mockGetControl = jest.fn().mockResolvedValue(null);
    (mockEngine as any).getControl = mockGetControl;

    await expect(
      revertControl(mockEngine, 'control-123', mockActor)
    ).rejects.toThrow(NotFoundError);

    await expect(
      revertControl(mockEngine, 'control-123', mockActor)
    ).rejects.toThrow('control-123 not found');
  });

  test('retrieves snapshot for control', async () => {
    const mockGetSnapshot = jest.fn().mockResolvedValue({
      snapshotId: 'snapshot-123',
    });
    (mockEngine as any).getSnapshotForControl = mockGetSnapshot;
    mockEngine.revertControl.mockResolvedValue(undefined);

    const result = await revertControl(mockEngine, 'control-123', mockActor);

    expect(mockGetSnapshot).toHaveBeenCalledWith('control-123');
    expect(result.revertedToSnapshot).toBe('snapshot-123');
  });

  test('throws NotFoundError if snapshot not found', async () => {
    const mockGetSnapshot = jest.fn().mockResolvedValue(null);
    (mockEngine as any).getSnapshotForControl = mockGetSnapshot;

    await expect(
      revertControl(mockEngine, 'control-123', mockActor)
    ).rejects.toThrow(NotFoundError);

    await expect(
      revertControl(mockEngine, 'control-123', mockActor)
    ).rejects.toThrow('No snapshot found');
  });

  test('logs to audit trail on success', async () => {
    const mockAuditLog = jest.fn();
    (mockEngine as any).auditLog = { log: mockAuditLog };
    mockEngine.revertControl.mockResolvedValue(undefined);

    await revertControl(mockEngine, 'control-123', mockActor);

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'revert',
        actorId: 'user-1',
        controlId: 'control-123',
        result: 'success',
      })
    );
  });

  test('works without optional engine methods', async () => {
    // Engine without getControl, getSnapshotForControl, or auditLog
    mockEngine.revertControl.mockResolvedValue(undefined);

    const result = await revertControl(mockEngine, 'control-123', mockActor);

    expect(result.success).toBe(true);
    expect(result.controlId).toBe('control-123');
  });
});
