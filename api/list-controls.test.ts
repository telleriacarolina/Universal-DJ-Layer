/**
 * Unit tests for list-controls API
 */

import { listControls } from './list-controls';
import { PermissionError, ValidationError } from './errors';
import type { DJEngine } from '../core/dj-engine';
import type { Actor } from './types';

describe('listControls', () => {
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

  test('successfully lists controls', async () => {
    const mockControls = [
      {
        controlId: 'control-1',
        timestamp: Date.now(),
        affectedSystems: ['system-1'],
        status: 'success' as const,
        actorId: 'user-1',
        discType: 'feature',
      },
      {
        controlId: 'control-2',
        timestamp: Date.now(),
        affectedSystems: ['system-2'],
        status: 'success' as const,
        actorId: 'user-2',
        discType: 'behavior',
      },
    ];

    mockEngine.listControls.mockResolvedValue(mockControls as any);

    const result = await listControls(mockEngine, mockActor);

    expect(result.controls).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  test('throws ValidationError if actor is invalid', async () => {
    await expect(
      listControls(mockEngine, null as any)
    ).rejects.toThrow(ValidationError);
  });

  test('throws PermissionError if actor lacks permission', async () => {
    mockActor.role.hasPermission = jest.fn().mockReturnValue(false);

    await expect(
      listControls(mockEngine, mockActor)
    ).rejects.toThrow(PermissionError);

    await expect(
      listControls(mockEngine, mockActor)
    ).rejects.toThrow('lacks permission to view');
  });

  test('filters controls based on options', async () => {
    const mockControls = [
      {
        controlId: 'control-1',
        timestamp: Date.now(),
        affectedSystems: [],
        status: 'success' as const,
        actorId: 'user-1',
        discType: 'feature',
      },
    ];

    mockEngine.listControls.mockResolvedValue(mockControls as any);

    await listControls(mockEngine, mockActor, {
      status: 'active',
      discType: 'feature',
    });

    expect(mockEngine.listControls).toHaveBeenCalledWith({
      status: 'active',
      discType: 'feature',
      actorId: undefined,
    });
  });

  test('filters by actor when requested', async () => {
    const mockControls = [] as any;
    mockEngine.listControls.mockResolvedValue(mockControls);

    await listControls(mockEngine, mockActor, {
      filterByActor: true,
    });

    expect(mockEngine.listControls).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-1',
      })
    );
  });

  test('applies pagination', async () => {
    const mockControls = Array.from({ length: 100 }, (_, i) => ({
      controlId: `control-${i}`,
      timestamp: Date.now(),
      affectedSystems: [],
      status: 'success' as const,
      actorId: 'user-1',
      discType: 'feature',
    }));

    mockEngine.listControls.mockResolvedValue(mockControls as any);

    const result = await listControls(mockEngine, mockActor, {
      page: 2,
      pageSize: 10,
    });

    expect(result.controls).toHaveLength(10);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.total).toBe(100);
  });

  test('filters controls by visibility', async () => {
    const mockControls = [
      {
        controlId: 'control-1',
        timestamp: Date.now(),
        affectedSystems: [],
        status: 'success' as const,
        actorId: 'user-1', // Same as mockActor
        discType: 'feature',
      },
      {
        controlId: 'control-2',
        timestamp: Date.now(),
        affectedSystems: [],
        status: 'success' as const,
        actorId: 'user-2', // Different user
        discType: 'feature',
      },
    ];

    mockEngine.listControls.mockResolvedValue(mockControls as any);

    // Actor with view-audit can see both
    const result = await listControls(mockEngine, mockActor);

    expect(result.controls).toHaveLength(2);
  });

  test('enriches controls with permission metadata', async () => {
    const mockControls = [
      {
        controlId: 'control-1',
        timestamp: Date.now(),
        affectedSystems: [],
        status: 'success' as const,
        actorId: 'user-1',
        discType: 'feature',
      },
    ];

    mockEngine.listControls.mockResolvedValue(mockControls as any);

    const result = await listControls(mockEngine, mockActor);

    expect(result.controls[0]).toHaveProperty('canRevert');
    expect(result.controls[0]).toHaveProperty('canModify');
  });

  test('uses canRevert engine method if available', async () => {
    const mockControls = [
      {
        controlId: 'control-1',
        timestamp: Date.now(),
        affectedSystems: [],
        status: 'success' as const,
        actorId: 'user-1',
        discType: 'feature',
      },
    ];

    mockEngine.listControls.mockResolvedValue(mockControls as any);
    (mockEngine as any).canRevert = jest.fn().mockResolvedValue(true);
    (mockEngine as any).canModify = jest.fn().mockResolvedValue(false);

    const result = await listControls(mockEngine, mockActor);

    expect((mockEngine as any).canRevert).toHaveBeenCalled();
    expect(result.controls[0].canRevert).toBe(true);
    expect(result.controls[0].canModify).toBe(false);
  });

  test('handles empty controls list', async () => {
    mockEngine.listControls.mockResolvedValue([]);

    const result = await listControls(mockEngine, mockActor);

    expect(result.controls).toEqual([]);
    expect(result.total).toBe(0);
  });
});
