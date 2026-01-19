/**
 * Unit tests for get-control API
 */

import { getControl } from './get-control';
import { PermissionError, NotFoundError, ValidationError } from './errors';
import type { DJEngine } from '../core/dj-engine';
import type { Actor } from './types';

describe('getControl', () => {
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
        getPermissions: jest.fn().mockReturnValue(['view', 'view-audit']),
        getHierarchyLevel: jest.fn().mockReturnValue(2),
      },
    };
  });

  test('successfully gets control details', async () => {
    const mockControl = {
      controlId: 'control-123',
      timestamp: Date.now(),
      affectedSystems: ['system-1'],
      status: 'success' as const,
      actorId: 'user-1',
      discType: 'feature',
    };

    (mockEngine as any).getControl = jest.fn().mockResolvedValue(mockControl);

    const result = await getControl(mockEngine, 'control-123', mockActor);

    expect(result.controlId).toBe('control-123');
    expect(result.discType).toBe('feature');
    expect(result.affectedSystems).toEqual(['system-1']);
  });

  test('throws ValidationError if control ID is invalid', async () => {
    await expect(
      getControl(mockEngine, '' as any, mockActor)
    ).rejects.toThrow(ValidationError);
  });

  test('throws ValidationError if actor is invalid', async () => {
    await expect(
      getControl(mockEngine, 'control-123', null as any)
    ).rejects.toThrow(ValidationError);
  });

  test('throws PermissionError if actor lacks permission', async () => {
    mockActor.role.hasPermission = jest.fn().mockReturnValue(false);

    await expect(
      getControl(mockEngine, 'control-123', mockActor)
    ).rejects.toThrow(PermissionError);

    await expect(
      getControl(mockEngine, 'control-123', mockActor)
    ).rejects.toThrow('lacks permission to view');
  });

  test('throws NotFoundError if control does not exist', async () => {
    (mockEngine as any).getControl = jest.fn().mockResolvedValue(null);

    await expect(
      getControl(mockEngine, 'control-123', mockActor)
    ).rejects.toThrow(NotFoundError);

    await expect(
      getControl(mockEngine, 'control-123', mockActor)
    ).rejects.toThrow('control-123 not found');
  });

  test('throws PermissionError if actor cannot view control', async () => {
    const mockControl = {
      controlId: 'control-123',
      timestamp: Date.now(),
      affectedSystems: [],
      status: 'success' as const,
      actorId: 'user-2', // Different user
      discType: 'feature',
    };

    (mockEngine as any).getControl = jest.fn().mockResolvedValue(mockControl);
    
    // Actor without view-audit permission
    mockActor.role.hasPermission = jest.fn((perm: string) => {
      return perm === 'view';
    });

    await expect(
      getControl(mockEngine, 'control-123', mockActor)
    ).rejects.toThrow(PermissionError);

    await expect(
      getControl(mockEngine, 'control-123', mockActor)
    ).rejects.toThrow('Cannot view this control');
  });

  test('retrieves audit history', async () => {
    const mockControl = {
      controlId: 'control-123',
      timestamp: Date.now(),
      affectedSystems: [],
      status: 'success' as const,
      actorId: 'user-1',
      discType: 'feature',
    };

    const mockHistory = [
      { action: 'apply', timestamp: Date.now() },
      { action: 'update', timestamp: Date.now() },
    ];

    (mockEngine as any).getControl = jest.fn().mockResolvedValue(mockControl);
    (mockEngine as any).auditLog = {
      query: jest.fn().mockResolvedValue(mockHistory),
    };

    const result = await getControl(mockEngine, 'control-123', mockActor);

    expect(result.history).toEqual(mockHistory);
    expect((mockEngine as any).auditLog.query).toHaveBeenCalledWith({
      controlId: 'control-123',
      limit: 100,
    });
  });

  test('retrieves state changes', async () => {
    const mockControl = {
      controlId: 'control-123',
      timestamp: Date.now(),
      affectedSystems: [],
      status: 'success' as const,
      actorId: 'user-1',
      discType: 'feature',
    };

    const mockChanges = {
      before: { value: 'old' },
      after: { value: 'new' },
    };

    (mockEngine as any).getControl = jest.fn().mockResolvedValue(mockControl);
    (mockEngine as any).getStateChanges = jest.fn().mockResolvedValue(mockChanges);

    const result = await getControl(mockEngine, 'control-123', mockActor);

    expect(result.changes).toEqual(mockChanges);
  });

  test('includes permission metadata', async () => {
    const mockControl = {
      controlId: 'control-123',
      timestamp: Date.now(),
      affectedSystems: [],
      status: 'success' as const,
      actorId: 'user-1',
      discType: 'feature',
    };

    (mockEngine as any).getControl = jest.fn().mockResolvedValue(mockControl);
    (mockEngine as any).canRevert = jest.fn().mockResolvedValue(true);
    (mockEngine as any).canModify = jest.fn().mockResolvedValue(false);

    const result = await getControl(mockEngine, 'control-123', mockActor);

    expect(result.canRevert).toBe(true);
    expect(result.canModify).toBe(false);
  });

  test('falls back to listControls if getControl not available', async () => {
    const mockControls = [
      {
        controlId: 'control-123',
        timestamp: Date.now(),
        affectedSystems: [],
        status: 'success' as const,
        actorId: 'user-1',
        discType: 'feature',
      },
    ];

    mockEngine.listControls.mockResolvedValue(mockControls as any);

    const result = await getControl(mockEngine, 'control-123', mockActor);

    expect(result.controlId).toBe('control-123');
  });

  test('handles missing optional engine methods gracefully', async () => {
    const mockControl = {
      controlId: 'control-123',
      timestamp: Date.now(),
      affectedSystems: [],
      status: 'success' as const,
      actorId: 'user-1',
      discType: 'feature',
    };

    (mockEngine as any).getControl = jest.fn().mockResolvedValue(mockControl);
    // No auditLog, getStateChanges, canRevert, or canModify

    const result = await getControl(mockEngine, 'control-123', mockActor);

    expect(result.controlId).toBe('control-123');
    expect(result.history).toEqual([]);
    expect(result).toHaveProperty('canRevert');
    expect(result).toHaveProperty('canModify');
  });
});
