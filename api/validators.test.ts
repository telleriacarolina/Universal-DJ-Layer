/**
 * Unit tests for validation and helper utilities
 */

import { validateDisc, validateActor, validateControlId, canView } from './validators';
import { ValidationError } from './errors';
import type { Disc } from '../discs/feature-disc';
import type { Actor, ControlDetail } from './types';

describe('validateDisc', () => {
  test('validates valid disc', () => {
    const disc: Disc = {
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

    expect(() => validateDisc(disc)).not.toThrow();
  });

  test('throws ValidationError if disc is null', () => {
    expect(() => validateDisc(null as any)).toThrow(ValidationError);
    expect(() => validateDisc(null as any)).toThrow('Disc is required');
  });

  test('throws ValidationError if disc is undefined', () => {
    expect(() => validateDisc(undefined as any)).toThrow(ValidationError);
    expect(() => validateDisc(undefined as any)).toThrow('Disc is required');
  });

  test('throws ValidationError if disc has no ID', () => {
    const disc = {
      metadata: {
        type: 'feature',
      },
    } as any;

    expect(() => validateDisc(disc)).toThrow(ValidationError);
    expect(() => validateDisc(disc)).toThrow('valid ID');
  });

  test('throws ValidationError if disc has no disc type', () => {
    const disc = {
      metadata: {
        id: 'disc-1',
      },
    } as any;

    expect(() => validateDisc(disc)).toThrow(ValidationError);
    expect(() => validateDisc(disc)).toThrow('valid type');
  });
});

describe('validateActor', () => {
  test('validates valid actor', () => {
    const actor: Actor = {
      id: 'user-1',
      role: {
        metadata: { roleId: 'role-1', roleType: 'admin', userId: 'user-1', grantedAt: Date.now() },
        hasPermission: jest.fn(),
        getPermissions: jest.fn(),
        getHierarchyLevel: jest.fn(),
      },
    };

    expect(() => validateActor(actor)).not.toThrow();
  });

  test('throws ValidationError if actor is null', () => {
    expect(() => validateActor(null as any)).toThrow(ValidationError);
    expect(() => validateActor(null as any)).toThrow('Actor is required');
  });

  test('throws ValidationError if actor is undefined', () => {
    expect(() => validateActor(undefined as any)).toThrow(ValidationError);
    expect(() => validateActor(undefined as any)).toThrow('Actor is required');
  });

  test('throws ValidationError if actor has no ID', () => {
    const actor = {
      role: {},
    } as any;

    expect(() => validateActor(actor)).toThrow(ValidationError);
    expect(() => validateActor(actor)).toThrow('valid ID');
  });

  test('throws ValidationError if actor has no role', () => {
    const actor = {
      id: 'user-1',
    } as any;

    expect(() => validateActor(actor)).toThrow(ValidationError);
    expect(() => validateActor(actor)).toThrow('valid role');
  });
});

describe('validateControlId', () => {
  test('validates valid control ID', () => {
    expect(() => validateControlId('control-123')).not.toThrow();
  });

  test('throws ValidationError if control ID is null', () => {
    expect(() => validateControlId(null as any)).toThrow(ValidationError);
    expect(() => validateControlId(null as any)).toThrow('non-empty string');
  });

  test('throws ValidationError if control ID is undefined', () => {
    expect(() => validateControlId(undefined as any)).toThrow(ValidationError);
  });

  test('throws ValidationError if control ID is empty string', () => {
    expect(() => validateControlId('')).toThrow(ValidationError);
    expect(() => validateControlId('')).toThrow('non-empty string');
  });

  test('throws ValidationError if control ID is not a string', () => {
    expect(() => validateControlId(123 as any)).toThrow(ValidationError);
  });
});

describe('canView', () => {
  const createActor = (id: string, hasPermissions: string[]): Actor => ({
    id,
    role: {
      metadata: { roleId: 'role-1', roleType: 'user', userId: id, grantedAt: Date.now() },
      hasPermission: (perm: string) => hasPermissions.includes(perm),
      getPermissions: () => hasPermissions,
      getHierarchyLevel: () => 1,
    },
  });

  const createControl = (appliedById: string): ControlDetail => ({
    controlId: 'control-1',
    discId: 'disc-1',
    discType: 'feature',
    appliedBy: createActor(appliedById, []),
    appliedAt: Date.now(),
    status: 'active',
    affectedSystems: [],
    canRevert: false,
    canModify: false,
  });

  test('allows actor to view their own controls', () => {
    const actor = createActor('user-1', []);
    const control = createControl('user-1');

    expect(canView(actor, control)).toBe(true);
  });

  test('allows actor with view-audit permission', () => {
    const actor = createActor('user-1', ['view-audit']);
    const control = createControl('user-2');

    expect(canView(actor, control)).toBe(true);
  });

  test('allows actor with full-control permission', () => {
    const actor = createActor('user-1', ['full-control']);
    const control = createControl('user-2');

    expect(canView(actor, control)).toBe(true);
  });

  test('denies actor without permissions viewing others controls', () => {
    const actor = createActor('user-1', ['some-other-permission']);
    const control = createControl('user-2');

    expect(canView(actor, control)).toBe(false);
  });

  test('denies actor without any permissions viewing others controls', () => {
    const actor = createActor('user-1', []);
    const control = createControl('user-2');

    expect(canView(actor, control)).toBe(false);
  });
});
