/**
 * Unit tests for ControlAPI wrapper class
 */

import { ControlAPI } from './control-api';
import type { DJEngine } from '../core/dj-engine';
import type { Disc } from '../discs/feature-disc';
import type { Actor } from './types';

describe('ControlAPI', () => {
  let mockEngine: jest.Mocked<DJEngine>;
  let api: ControlAPI;
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

    api = new ControlAPI(mockEngine);

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
        getPermissions: jest.fn().mockReturnValue(['apply-discs', 'preview', 'view', 'revert']),
        getHierarchyLevel: jest.fn().mockReturnValue(2),
      },
    };
  });

  describe('apply', () => {
    test('successfully applies control', async () => {
      const mockResult = {
        controlId: 'control-123',
        timestamp: Date.now(),
        affectedSystems: ['system-1'],
        status: 'success' as const,
      };

      mockEngine.applyControl.mockResolvedValue(mockResult);

      const result = await api.apply(mockDisc, mockActor);

      expect(result.success).toBe(true);
      expect(result.controlId).toBe('control-123');
      expect(mockEngine.applyControl).toHaveBeenCalled();
    });

    test('passes options to underlying function', async () => {
      const mockResult = {
        controlId: 'control-123',
        timestamp: Date.now(),
        affectedSystems: [],
        status: 'success' as const,
      };

      mockEngine.applyControl.mockResolvedValue(mockResult);

      await api.apply(mockDisc, mockActor, {
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

  describe('revert', () => {
    test('successfully reverts control', async () => {
      mockEngine.revertControl.mockResolvedValue(undefined);

      const result = await api.revert('control-123', mockActor);

      expect(result.success).toBe(true);
      expect(result.controlId).toBe('control-123');
      expect(mockEngine.revertControl).toHaveBeenCalled();
    });

    test('passes options to underlying function', async () => {
      mockEngine.revertControl.mockResolvedValue(undefined);

      await api.revert('control-123', mockActor, {
        createSnapshot: true,
        force: false,
      });

      expect(mockEngine.revertControl).toHaveBeenCalledWith(
        'control-123',
        mockActor.role
      );
    });
  });

  describe('preview', () => {
    test('successfully previews control', async () => {
      const mockResult = {
        safe: true,
        affectedSystems: ['system-1'],
        potentialIssues: [],
        diff: {},
      };

      mockEngine.previewControl.mockResolvedValue(mockResult);

      const result = await api.preview(mockDisc, mockActor);

      expect(result.safe).toBe(true);
      expect(mockEngine.previewControl).toHaveBeenCalled();
    });

    test('passes options to underlying function', async () => {
      const mockResult = {
        safe: true,
        affectedSystems: [],
        potentialIssues: [],
        diff: {},
      };

      mockEngine.previewControl.mockResolvedValue(mockResult);

      await api.preview(mockDisc, mockActor, {
        includeDetailedDiff: true,
        runImpactAnalysis: true,
      });

      expect(mockEngine.previewControl).toHaveBeenCalledWith(
        mockDisc,
        mockActor.role
      );
    });
  });

  describe('list', () => {
    test('successfully lists controls', async () => {
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

      const result = await api.list(mockActor);

      expect(result.controls).toHaveLength(1);
      expect(mockEngine.listControls).toHaveBeenCalled();
    });

    test('passes options to underlying function', async () => {
      mockEngine.listControls.mockResolvedValue([]);

      await api.list(mockActor, {
        status: 'active',
        discType: 'feature',
        page: 2,
        pageSize: 20,
      });

      expect(mockEngine.listControls).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          discType: 'feature',
        })
      );
    });
  });

  describe('get', () => {
    test('successfully gets control details', async () => {
      const mockControl = {
        controlId: 'control-123',
        timestamp: Date.now(),
        affectedSystems: [],
        status: 'success' as const,
        actorId: 'user-1',
        discType: 'feature',
      };

      (mockEngine as any).getControl = jest.fn().mockResolvedValue(mockControl);

      const result = await api.get('control-123', mockActor);

      expect(result.controlId).toBe('control-123');
    });
  });

  describe('integration', () => {
    test('provides unified interface for all operations', async () => {
      // Apply
      const mockApplyResult = {
        controlId: 'control-123',
        timestamp: Date.now(),
        affectedSystems: [],
        status: 'success' as const,
      };
      mockEngine.applyControl.mockResolvedValue(mockApplyResult);

      const applyResult = await api.apply(mockDisc, mockActor);
      expect(applyResult.success).toBe(true);

      // Preview
      const mockPreviewResult = {
        safe: true,
        affectedSystems: [],
        potentialIssues: [],
        diff: {},
      };
      mockEngine.previewControl.mockResolvedValue(mockPreviewResult);

      const previewResult = await api.preview(mockDisc, mockActor);
      expect(previewResult.safe).toBe(true);

      // List
      mockEngine.listControls.mockResolvedValue([mockApplyResult] as any);
      const listResult = await api.list(mockActor);
      expect(listResult.controls).toHaveLength(1);

      // Revert
      mockEngine.revertControl.mockResolvedValue(undefined);
      const revertResult = await api.revert('control-123', mockActor);
      expect(revertResult.success).toBe(true);
    });
  });
});
