import { FlowDisc, FlowConfig, WorkflowStep, FlowDefinition } from './flow-disc';

describe('FlowDisc', () => {
  describe('Constructor and Metadata', () => {
    test('creates disc with correct metadata', () => {
      const config: FlowConfig = {
        name: 'test-flow',
        flows: {},
      };

      const disc = new FlowDisc(config);

      expect(disc.metadata.name).toBe('test-flow');
      expect(disc.metadata.type).toBe('flow');
      expect(disc.metadata.version).toBe('1.0.0');
      expect(disc.metadata.id).toContain('flow-');
      expect(disc.metadata.createdAt).toBeLessThanOrEqual(Date.now());
    });

    test('generates unique IDs for different instances', () => {
      const config: FlowConfig = {
        name: 'test',
        flows: {},
      };

      const disc1 = new FlowDisc(config);
      const disc2 = new FlowDisc(config);

      expect(disc1.metadata.id).not.toBe(disc2.metadata.id);
    });
  });

  describe('Workflow Definition', () => {
    test('defines a simple linear workflow', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'screen', config: {}, next: 'step2' },
        { id: 'step2', type: 'action', config: {}, next: 'step3' },
        { id: 'step3', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('linear-flow', steps);

      const instance = disc.startWorkflow('linear-flow', {});
      const currentStep = disc.getCurrentStep(instance);

      expect(currentStep.id).toBe('step1');
    });

    test('defines workflow with conditional branching', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { 
          id: 'start', 
          type: 'decision', 
          config: {}, 
          next: { premium: 'premium-flow', default: 'standard-flow' },
          conditions: { premium: true }
        },
        { id: 'premium-flow', type: 'screen', config: {} },
        { id: 'standard-flow', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('branching-flow', steps);

      const instance1 = disc.startWorkflow('branching-flow', { premium: true });
      expect(disc.getNextStep('branching-flow', 'start', { premium: true })).toBe('premium-flow');

      const instance2 = disc.startWorkflow('branching-flow', { premium: false });
      expect(disc.getNextStep('branching-flow', 'start', { premium: false })).toBe('standard-flow');
    });

    test('defines workflow with parallel execution paths', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'start', type: 'screen', config: {}, next: ['path1', 'path2'] },
        { id: 'path1', type: 'action', config: {} },
        { id: 'path2', type: 'action', config: {} },
      ];

      disc.defineWorkflow('parallel-flow', steps);

      const nextSteps = disc.getNextStep('parallel-flow', 'start', {});
      expect(Array.isArray(nextSteps)).toBe(true);
      expect(nextSteps).toEqual(['path1', 'path2']);
    });

    test('throws error for workflow with no steps', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      expect(() => {
        disc.defineWorkflow('empty-flow', []);
      }).toThrow("Workflow 'empty-flow' has no steps");
    });

    test('throws error for duplicate step IDs', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'screen', config: {} },
        { id: 'step1', type: 'screen', config: {} },
      ];

      expect(() => {
        disc.defineWorkflow('duplicate-flow', steps);
      }).toThrow("Duplicate step id 'step1'");
    });

    test('throws error for orphaned step references', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'screen', config: {}, next: 'nonexistent' },
      ];

      expect(() => {
        disc.defineWorkflow('orphan-flow', steps);
      }).toThrow("Referenced step 'nonexistent' not found");
    });

    test('throws error for circular references', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'screen', config: {}, next: 'step2' },
        { id: 'step2', type: 'screen', config: {}, next: 'step1' },
      ];

      expect(() => {
        disc.defineWorkflow('circular-flow', steps);
      }).toThrow('Circular reference detected');
    });
  });

  describe('Workflow Instance Management', () => {
    test('starts a new workflow instance', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'start', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('simple-flow', steps);
      const instanceId = disc.startWorkflow('simple-flow', { userId: '123' });

      expect(instanceId).toContain('instance-');

      const instance = disc.getInstance(instanceId);
      expect(instance).toBeDefined();
      expect(instance?.workflowId).toBe('simple-flow');
      expect(instance?.currentStepId).toBe('start');
      expect(instance?.context).toEqual({ userId: '123' });
      expect(instance?.status).toBe('active');
    });

    test('throws error when starting non-existent workflow', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      expect(() => {
        disc.startWorkflow('nonexistent', {});
      }).toThrow("Workflow 'nonexistent' not found");
    });

    test('tracks workflow history', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'screen', config: {}, next: 'step2' },
        { id: 'step2', type: 'screen', config: {}, next: 'step3' },
        { id: 'step3', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('history-flow', steps);
      const instanceId = disc.startWorkflow('history-flow', {});

      disc.transitionTo(instanceId, 'step2');
      disc.transitionTo(instanceId, 'step3');

      const instance = disc.getInstance(instanceId);
      expect(instance?.history).toEqual(['step1', 'step2', 'step3']);
    });

    test('supports multiple concurrent instances', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'start', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('concurrent-flow', steps);

      const instance1 = disc.startWorkflow('concurrent-flow', { userId: '1' });
      const instance2 = disc.startWorkflow('concurrent-flow', { userId: '2' });

      expect(instance1).not.toBe(instance2);

      const inst1 = disc.getInstance(instance1);
      const inst2 = disc.getInstance(instance2);

      expect(inst1?.context.userId).toBe('1');
      expect(inst2?.context.userId).toBe('2');
    });

    test('completes workflow instance', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'start', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('complete-flow', steps);
      const instanceId = disc.startWorkflow('complete-flow', {});

      disc.completeWorkflow(instanceId);

      const instance = disc.getInstance(instanceId);
      expect(instance?.status).toBe('completed');
      expect(instance?.completedAt).toBeDefined();
    });

    test('throws error when completing non-existent instance', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      expect(() => {
        disc.completeWorkflow('nonexistent');
      }).toThrow("Instance 'nonexistent' not found");
    });

    test('throws error when completing already completed instance', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'start', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('complete-flow', steps);
      const instanceId = disc.startWorkflow('complete-flow', {});

      disc.completeWorkflow(instanceId);

      expect(() => {
        disc.completeWorkflow(instanceId);
      }).toThrow("is not active");
    });
  });

  describe('Linear Workflow Execution', () => {
    test('executes linear workflow step by step', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'welcome', type: 'screen', config: {}, next: 'profile' },
        { id: 'profile', type: 'screen', config: {}, next: 'complete' },
        { id: 'complete', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('onboarding', steps);
      const instanceId = disc.startWorkflow('onboarding', {});

      expect(disc.getCurrentStep(instanceId).id).toBe('welcome');

      disc.transitionTo(instanceId, 'profile');
      expect(disc.getCurrentStep(instanceId).id).toBe('profile');

      disc.transitionTo(instanceId, 'complete');
      expect(disc.getCurrentStep(instanceId).id).toBe('complete');
    });

    test('gets correct next step in linear flow', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'screen', config: {}, next: 'step2' },
        { id: 'step2', type: 'screen', config: {}, next: 'step3' },
        { id: 'step3', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('linear', steps);

      expect(disc.getNextStep('linear', 'step1')).toBe('step2');
      expect(disc.getNextStep('linear', 'step2')).toBe('step3');
      expect(disc.getNextStep('linear', 'step3')).toBeNull();
    });
  });

  describe('Conditional Branching', () => {
    test('branches based on context conditions', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        {
          id: 'check',
          type: 'decision',
          config: {},
          next: { premium: 'premium', default: 'free' },
          conditions: { premium: true },
        },
        { id: 'premium', type: 'screen', config: {} },
        { id: 'free', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('conditional', steps);

      const instance1 = disc.startWorkflow('conditional', { premium: true });
      disc.transitionTo(instance1, 'premium');
      expect(disc.getCurrentStep(instance1).id).toBe('premium');

      const instance2 = disc.startWorkflow('conditional', { premium: false });
      disc.transitionTo(instance2, 'free');
      expect(disc.getCurrentStep(instance2).id).toBe('free');
    });

    test('uses default path when no condition matches', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        {
          id: 'decide',
          type: 'decision',
          config: {},
          next: { vip: 'vip-flow', default: 'standard-flow' },
          conditions: { vip: true },
        },
        { id: 'vip-flow', type: 'screen', config: {} },
        { id: 'standard-flow', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('default-path', steps);

      expect(disc.getNextStep('default-path', 'decide', { vip: false })).toBe('standard-flow');
      expect(disc.getNextStep('default-path', 'decide', {})).toBe('standard-flow');
    });

    test('evaluates multiple conditions', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        {
          id: 'start',
          type: 'decision',
          config: {},
          next: { admin: 'admin-panel', user: 'user-dashboard', default: 'guest-page' },
          conditions: { admin: true, user: true },
        },
        { id: 'admin-panel', type: 'screen', config: {} },
        { id: 'user-dashboard', type: 'screen', config: {} },
        { id: 'guest-page', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('multi-condition', steps);

      expect(disc.getNextStep('multi-condition', 'start', { admin: true })).toBe('admin-panel');
      expect(disc.getNextStep('multi-condition', 'start', { user: true })).toBe('user-dashboard');
      expect(disc.getNextStep('multi-condition', 'start', {})).toBe('guest-page');
    });
  });

  describe('State Guards', () => {
    test('blocks transition when guard returns false', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'start', type: 'screen', config: {}, next: 'protected' },
        {
          id: 'protected',
          type: 'screen',
          config: {},
          guard: (context) => context.hasPermission === true,
        },
      ];

      disc.defineWorkflow('guarded', steps);
      const instanceId = disc.startWorkflow('guarded', { hasPermission: false });

      expect(disc.canTransition(instanceId, 'protected')).toBe(false);
      expect(() => {
        disc.transitionTo(instanceId, 'protected');
      }).toThrow("Cannot transition to step 'protected'");
    });

    test('allows transition when guard returns true', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'start', type: 'screen', config: {}, next: 'protected' },
        {
          id: 'protected',
          type: 'screen',
          config: {},
          guard: (context) => context.hasPermission === true,
        },
      ];

      disc.defineWorkflow('guarded', steps);
      const instanceId = disc.startWorkflow('guarded', { hasPermission: true });

      expect(disc.canTransition(instanceId, 'protected')).toBe(true);
      disc.transitionTo(instanceId, 'protected');
      expect(disc.getCurrentStep(instanceId).id).toBe('protected');
    });

    test('validates transition with complex guard logic', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'start', type: 'screen', config: {}, next: 'checkout' },
        {
          id: 'checkout',
          type: 'screen',
          config: {},
          guard: (context) => context.cartItems > 0 && context.isLoggedIn === true,
        },
      ];

      disc.defineWorkflow('shopping', steps);

      const instance1 = disc.startWorkflow('shopping', { cartItems: 0, isLoggedIn: true });
      expect(disc.canTransition(instance1, 'checkout')).toBe(false);

      const instance2 = disc.startWorkflow('shopping', { cartItems: 5, isLoggedIn: false });
      expect(disc.canTransition(instance2, 'checkout')).toBe(false);

      const instance3 = disc.startWorkflow('shopping', { cartItems: 5, isLoggedIn: true });
      expect(disc.canTransition(instance3, 'checkout')).toBe(true);
    });
  });

  describe('Workflow Rollback', () => {
    test('rolls back to previous step', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'screen', config: {}, next: 'step2' },
        { id: 'step2', type: 'screen', config: {}, next: 'step3' },
        { id: 'step3', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('rollback-flow', steps);
      const instanceId = disc.startWorkflow('rollback-flow', {});

      disc.transitionTo(instanceId, 'step2');
      disc.transitionTo(instanceId, 'step3');

      disc.rollbackToStep(instanceId, 'step2');

      expect(disc.getCurrentStep(instanceId).id).toBe('step2');
    });

    test('rolls back to first step', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'screen', config: {}, next: 'step2' },
        { id: 'step2', type: 'screen', config: {}, next: 'step3' },
        { id: 'step3', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('rollback-flow', steps);
      const instanceId = disc.startWorkflow('rollback-flow', {});

      disc.transitionTo(instanceId, 'step2');
      disc.transitionTo(instanceId, 'step3');

      disc.rollbackToStep(instanceId, 'step1');

      expect(disc.getCurrentStep(instanceId).id).toBe('step1');
      const instance = disc.getInstance(instanceId);
      expect(instance?.history).toEqual(['step1']);
    });

    test('throws error when rolling back to step not in history', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'screen', config: {}, next: 'step2' },
        { id: 'step2', type: 'screen', config: {} },
        { id: 'step3', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('rollback-flow', steps);
      const instanceId = disc.startWorkflow('rollback-flow', {});

      expect(() => {
        disc.rollbackToStep(instanceId, 'step3');
      }).toThrow("Step 'step3' not found in history");
    });

    test('maintains correct history after rollback', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'screen', config: {}, next: 'step2' },
        { id: 'step2', type: 'screen', config: {}, next: 'step3' },
        { id: 'step3', type: 'screen', config: {}, next: 'step4' },
        { id: 'step4', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('rollback-flow', steps);
      const instanceId = disc.startWorkflow('rollback-flow', {});

      disc.transitionTo(instanceId, 'step2');
      disc.transitionTo(instanceId, 'step3');
      disc.transitionTo(instanceId, 'step4');

      disc.rollbackToStep(instanceId, 'step2');

      const instance = disc.getInstance(instanceId);
      expect(instance?.history).toEqual(['step1', 'step2']);
    });
  });

  describe('Approval Gates', () => {
    test('blocks transition to step requiring approval', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'submit', type: 'action', config: {}, next: 'review' },
        { id: 'review', type: 'screen', config: {}, requiresApproval: true },
      ];

      disc.defineWorkflow('approval-flow', steps);
      const instanceId = disc.startWorkflow('approval-flow', {});

      expect(disc.canTransition(instanceId, 'review')).toBe(false);
      expect(() => {
        disc.transitionTo(instanceId, 'review');
      }).toThrow("Step 'review' requires approval");
    });

    test('allows transition after approval', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'submit', type: 'action', config: {}, next: 'review' },
        { id: 'review', type: 'screen', config: {}, requiresApproval: true },
      ];

      disc.defineWorkflow('approval-flow', steps);
      const instanceId = disc.startWorkflow('approval-flow', {});

      disc.approveStep(instanceId, 'review');

      expect(disc.canTransition(instanceId, 'review')).toBe(true);
      disc.transitionTo(instanceId, 'review');
      expect(disc.getCurrentStep(instanceId).id).toBe('review');
    });

    test('tracks multiple approvals', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'start', type: 'screen', config: {}, next: 'manager' },
        { id: 'manager', type: 'screen', config: {}, requiresApproval: true, next: 'director' },
        { id: 'director', type: 'screen', config: {}, requiresApproval: true },
      ];

      disc.defineWorkflow('multi-approval', steps);
      const instanceId = disc.startWorkflow('multi-approval', {});

      disc.approveStep(instanceId, 'manager');
      disc.approveStep(instanceId, 'director');

      const instance = disc.getInstance(instanceId);
      expect(instance?.approvals).toEqual({ manager: true, director: true });
    });
  });

  describe('Parallel Execution Paths', () => {
    test('supports multiple next steps', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'start', type: 'screen', config: {}, next: ['pathA', 'pathB'] },
        { id: 'pathA', type: 'action', config: {} },
        { id: 'pathB', type: 'action', config: {} },
      ];

      disc.defineWorkflow('parallel', steps);

      const nextSteps = disc.getNextStep('parallel', 'start', {});
      expect(Array.isArray(nextSteps)).toBe(true);
      expect(nextSteps).toEqual(['pathA', 'pathB']);
    });

    test('allows transition to any parallel path', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'split', type: 'screen', config: {}, next: ['path1', 'path2', 'path3'] },
        { id: 'path1', type: 'action', config: {} },
        { id: 'path2', type: 'action', config: {} },
        { id: 'path3', type: 'action', config: {} },
      ];

      disc.defineWorkflow('parallel', steps);
      const instanceId = disc.startWorkflow('parallel', {});

      expect(disc.canTransition(instanceId, 'path1')).toBe(true);
      expect(disc.canTransition(instanceId, 'path2')).toBe(true);
      expect(disc.canTransition(instanceId, 'path3')).toBe(true);
    });

    test('transitions to one of multiple parallel paths', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'fork', type: 'screen', config: {}, next: ['async1', 'async2'] },
        { id: 'async1', type: 'action', config: {} },
        { id: 'async2', type: 'action', config: {} },
      ];

      disc.defineWorkflow('parallel', steps);
      const instanceId = disc.startWorkflow('parallel', {});

      disc.transitionTo(instanceId, 'async1');
      expect(disc.getCurrentStep(instanceId).id).toBe('async1');
    });
  });

  describe('Base Disc Interface - Apply', () => {
    test('applies flow definitions to context', async () => {
      const flowDef: FlowDefinition = {
        name: 'onboarding',
        startStep: 'welcome',
        steps: {
          welcome: { id: 'welcome', type: 'screen', config: {}, next: 'profile' },
          profile: { id: 'profile', type: 'screen', config: {} },
        },
      };

      const disc = new FlowDisc({
        name: 'test',
        flows: { onboarding: flowDef },
      });

      const context = {};
      const result = await disc.apply(context);

      expect(result.workflows).toBeDefined();
      expect(result.workflows.onboarding).toEqual(flowDef);
      expect(result.applied).toContain('onboarding');
    });

    test('merges flows with existing context', async () => {
      const existingFlow: FlowDefinition = {
        name: 'existing',
        startStep: 'start',
        steps: {
          start: { id: 'start', type: 'screen', config: {} },
        },
      };

      const newFlow: FlowDefinition = {
        name: 'new',
        startStep: 'begin',
        steps: {
          begin: { id: 'begin', type: 'screen', config: {} },
        },
      };

      const disc = new FlowDisc({
        name: 'test',
        flows: { new: newFlow },
        mergeStrategy: 'merge',
      });

      const context = { workflows: { existing: existingFlow } };
      const result = await disc.apply(context);

      expect(result.workflows.existing).toBeDefined();
      expect(result.workflows.new).toBeDefined();
    });

    test('replaces flows with replace strategy', async () => {
      const existingFlow: FlowDefinition = {
        name: 'onboarding',
        startStep: 'old',
        steps: {
          old: { id: 'old', type: 'screen', config: {} },
        },
      };

      const newFlow: FlowDefinition = {
        name: 'onboarding',
        startStep: 'new',
        steps: {
          new: { id: 'new', type: 'screen', config: {} },
        },
      };

      const disc = new FlowDisc({
        name: 'test',
        flows: { onboarding: newFlow },
        mergeStrategy: 'replace',
      });

      const context = { workflows: { onboarding: existingFlow } };
      const result = await disc.apply(context);

      expect(result.workflows.onboarding).toEqual(newFlow);
      expect(result.workflows.onboarding.startStep).toBe('new');
    });

    test('throws error for invalid context', async () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      await expect(disc.apply(null)).rejects.toThrow('Invalid context');
      await expect(disc.apply('string')).rejects.toThrow('Invalid context');
      await expect(disc.apply(123)).rejects.toThrow('Invalid context');
    });
  });

  describe('Base Disc Interface - Revert', () => {
    test('reverts to previous state', async () => {
      const flowDef: FlowDefinition = {
        name: 'test-flow',
        startStep: 'start',
        steps: {
          start: { id: 'start', type: 'screen', config: {} },
        },
      };

      const disc = new FlowDisc({
        name: 'test',
        flows: { 'test-flow': flowDef },
      });

      const context = { workflows: { original: {} } };
      await disc.apply(context);

      const result = await disc.revert(context);

      expect(result.workflows).toEqual({ original: {} });
      expect(result.reverted).toContain('test-flow');
    });

    test('throws error when no previous state exists', async () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      await expect(disc.revert({})).rejects.toThrow('No previous state to revert to');
    });

    test('throws error for invalid context', async () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      await expect(disc.revert(null)).rejects.toThrow('Invalid context');
    });

    test('removes workflows from internal state on revert', async () => {
      const flowDef: FlowDefinition = {
        name: 'removable',
        startStep: 'start',
        steps: {
          start: { id: 'start', type: 'screen', config: {} },
        },
      };

      const disc = new FlowDisc({
        name: 'test',
        flows: { removable: flowDef },
      });

      const context = {};
      await disc.apply(context);

      expect(disc.getFlow('removable')).toBeDefined();

      await disc.revert(context);

      expect(() => {
        disc.startWorkflow('removable', {});
      }).toThrow("Workflow 'removable' not found");
    });
  });

  describe('Base Disc Interface - Preview', () => {
    test('previews flow additions', async () => {
      const newFlow: FlowDefinition = {
        name: 'new-flow',
        startStep: 'start',
        steps: {
          start: { id: 'start', type: 'screen', config: {} },
        },
      };

      const disc = new FlowDisc({
        name: 'test',
        flows: { 'new-flow': newFlow },
      });

      const context = {};
      const preview = await disc.preview(context);

      expect(preview.changes['new-flow'].action).toBe('add');
      expect(preview.summary.added).toBe(1);
    });

    test('previews flow modifications', async () => {
      const existingFlow: FlowDefinition = {
        name: 'existing',
        startStep: 'old',
        steps: {
          old: { id: 'old', type: 'screen', config: {} },
        },
      };

      const modifiedFlow: FlowDefinition = {
        name: 'existing',
        startStep: 'new',
        steps: {
          new: { id: 'new', type: 'screen', config: {} },
        },
      };

      const disc = new FlowDisc({
        name: 'test',
        flows: { existing: modifiedFlow },
      });

      const context = { workflows: { existing: existingFlow } };
      const preview = await disc.preview(context);

      expect(preview.changes.existing.action).toBe('modify');
      expect(preview.summary.modified).toBe(1);
    });

    test('previews unchanged flows', async () => {
      const flowDef: FlowDefinition = {
        name: 'unchanged',
        startStep: 'start',
        steps: {
          start: { id: 'start', type: 'screen', config: {} },
        },
      };

      const disc = new FlowDisc({
        name: 'test',
        flows: { unchanged: flowDef },
      });

      const context = { workflows: { unchanged: flowDef } };
      const preview = await disc.preview(context);

      expect(preview.changes.unchanged.action).toBe('unchanged');
      expect(preview.summary.unchanged).toBe(1);
    });

    test('returns preview summary', async () => {
      const disc = new FlowDisc({
        name: 'test',
        flows: {
          new1: {
            name: 'new1',
            startStep: 'start',
            steps: { start: { id: 'start', type: 'screen', config: {} } },
          },
          new2: {
            name: 'new2',
            startStep: 'start',
            steps: { start: { id: 'start', type: 'screen', config: {} } },
          },
        },
      });

      const context = {};
      const preview = await disc.preview(context);

      expect(preview.summary).toEqual({
        added: 2,
        modified: 0,
        unchanged: 0,
      });
    });
  });

  describe('Base Disc Interface - Validate', () => {
    test('validates correct workflow configuration', async () => {
      const flowDef: FlowDefinition = {
        name: 'valid',
        startStep: 'start',
        steps: {
          start: { id: 'start', type: 'screen', config: {}, next: 'end' },
          end: { id: 'end', type: 'screen', config: {} },
        },
      };

      const disc = new FlowDisc({
        name: 'test',
        flows: { valid: flowDef },
      });

      const isValid = await disc.validate();
      expect(isValid).toBe(true);
    });

    test('returns false for invalid workflow', async () => {
      const invalidFlow: FlowDefinition = {
        name: 'invalid',
        startStep: 'start',
        steps: {
          start: { id: 'start', type: 'screen', config: {}, next: 'nonexistent' },
        },
      };

      const disc = new FlowDisc({
        name: 'test',
        flows: { invalid: invalidFlow },
      });

      const isValid = await disc.validate();
      expect(isValid).toBe(false);
    });

    test('validates multiple flows', async () => {
      const disc = new FlowDisc({
        name: 'test',
        flows: {
          flow1: {
            name: 'flow1',
            startStep: 'start',
            steps: {
              start: { id: 'start', type: 'screen', config: {} },
            },
          },
          flow2: {
            name: 'flow2',
            startStep: 'begin',
            steps: {
              begin: { id: 'begin', type: 'screen', config: {} },
            },
          },
        },
      });

      const isValid = await disc.validate();
      expect(isValid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('handles workflow with single step', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'only-step', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('single-step', steps);
      const instanceId = disc.startWorkflow('single-step', {});

      expect(disc.getCurrentStep(instanceId).id).toBe('only-step');
      expect(disc.getNextStep('single-step', 'only-step')).toBeNull();
    });

    test('canTransition returns false for completed instance', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'start', type: 'screen', config: {}, next: 'end' },
        { id: 'end', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('complete-test', steps);
      const instanceId = disc.startWorkflow('complete-test', {});

      disc.completeWorkflow(instanceId);

      expect(disc.canTransition(instanceId, 'end')).toBe(false);
    });

    test('returns null for non-existent flow', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      expect(disc.getFlow('nonexistent')).toBeNull();
    });

    test('returns null for next step of non-existent flow', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      expect(disc.getNextStep('nonexistent', 'step1')).toBeNull();
    });

    test('returns null for next step of non-existent step', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'step1', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('test-flow', steps);

      expect(disc.getNextStep('test-flow', 'nonexistent')).toBeNull();
    });

    test('handles step with no next defined', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        { id: 'terminal', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('terminal-flow', steps);

      expect(disc.getNextStep('terminal-flow', 'terminal')).toBeNull();
    });

    test('handles empty conditions object', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: WorkflowStep[] = [
        {
          id: 'decide',
          type: 'decision',
          config: {},
          next: { default: 'fallback' },
          conditions: {},
        },
        { id: 'fallback', type: 'screen', config: {} },
      ];

      disc.defineWorkflow('empty-conditions', steps);

      expect(disc.getNextStep('empty-conditions', 'decide', {})).toBe('fallback');
    });

    test('throws error for step with missing id', () => {
      const disc = new FlowDisc({ name: 'test', flows: {} });

      const steps: any = [
        { type: 'screen', config: {} },
      ];

      expect(() => {
        disc.defineWorkflow('no-id', steps);
      }).toThrow("missing id");
    });
  });
});
