/**
 * Unit tests for CreatorLockPolicy
 */

import { CreatorLockPolicy } from './creator-locks';

describe('CreatorLockPolicy', () => {
  let policy: CreatorLockPolicy;

  beforeEach(() => {
    policy = new CreatorLockPolicy({
      creatorId: 'creator-1',
      lockedResources: ['resource-1', 'resource-2'],
      lockedOperations: ['modify', 'delete'],
    });
  });

  describe('Initialization', () => {
    it('should initialize with correct priority', () => {
      expect(policy.metadata.priority).toBe(1000);
    });

    it('should have creator-lock policy type', () => {
      expect(policy.metadata.policyType).toBe('creator-lock');
    });

    it('should store locked resources', () => {
      expect(policy.getLockedResources()).toContain('resource-1');
      expect(policy.getLockedResources()).toContain('resource-2');
    });
  });

  describe('Policy Evaluation', () => {
    it('should allow creator to access locked resource', async () => {
      const result = await policy.evaluate({
        operation: 'modify',
        actorId: 'creator-1',
        roleType: 'creator',
        resourceId: 'resource-1',
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny non-creator access to locked resource', async () => {
      const result = await policy.evaluate({
        operation: 'modify',
        actorId: 'admin-1',
        roleType: 'admin',
        resourceId: 'resource-1',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('protected by a creator lock');
    });

    it('should allow access to non-locked resource', async () => {
      const result = await policy.evaluate({
        operation: 'modify',
        actorId: 'admin-1',
        roleType: 'admin',
        resourceId: 'resource-3',
      });

      expect(result.allowed).toBe(true);
    });

    it('should allow non-locked operations on locked resource', async () => {
      const result = await policy.evaluate({
        operation: 'read',
        actorId: 'admin-1',
        roleType: 'admin',
        resourceId: 'resource-1',
      });

      expect(result.allowed).toBe(true);
    });

    it('should handle wildcard operations', async () => {
      const wildcardPolicy = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: ['resource-1'],
        lockedOperations: ['*'],
      });

      const result = await wildcardPolicy.evaluate({
        operation: 'any-operation',
        actorId: 'admin-1',
        roleType: 'admin',
        resourceId: 'resource-1',
      });

      expect(result.allowed).toBe(false);
    });

    it('should allow when no resource ID provided', async () => {
      const result = await policy.evaluate({
        operation: 'modify',
        actorId: 'admin-1',
        roleType: 'admin',
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate when locked resources exist', () => {
      expect(policy.validate()).toBe(true);
    });

    it('should fail validation when no locked resources', () => {
      const emptyPolicy = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: [],
      });

      expect(emptyPolicy.validate()).toBe(false);
    });
  });

  describe('Lock Management', () => {
    it('should add a lock', () => {
      policy.addLock('resource-3', ['modify']);
      expect(policy.isLocked('resource-3')).toBe(true);
    });

    it('should check if resource is locked', () => {
      expect(policy.isLocked('resource-1')).toBe(true);
      expect(policy.isLocked('resource-99')).toBe(false);
    });

    it('should remove a lock by creator', () => {
      const removed = policy.removeLock('resource-1', 'creator-1');
      expect(removed).toBe(true);
      expect(policy.isLocked('resource-1')).toBe(false);
    });

    it('should not remove lock by non-creator', () => {
      const removed = policy.removeLock('resource-1', 'admin-1');
      expect(removed).toBe(false);
      expect(policy.isLocked('resource-1')).toBe(true);
    });

    it('should get all locked resources', () => {
      const resources = policy.getLockedResources();
      expect(resources).toHaveLength(2);
      expect(resources).toContain('resource-1');
      expect(resources).toContain('resource-2');
    });
  });

  describe('Default Operations', () => {
    it('should lock all operations by default', async () => {
      const defaultPolicy = new CreatorLockPolicy({
        creatorId: 'creator-1',
        lockedResources: ['resource-1'],
      });

      const result = await defaultPolicy.evaluate({
        operation: 'any-operation',
        actorId: 'admin-1',
        roleType: 'admin',
        resourceId: 'resource-1',
      });

      expect(result.allowed).toBe(false);
    });
  });
});
