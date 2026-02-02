/**
 * FlowDisc - Controls user journey and navigation flows
 * 
 * Enables dynamic modification of application flow, navigation paths,
 * and user journey sequences without code changes.
 * 
 * TODO: Implement flow control with step definitions and routing rules
 */

import type { Disc, DiscMetadata } from './feature-disc';

export interface FlowStep {
  /** Unique identifier for this step */
  id: string;
  /** Type of step (screen, action, decision, etc.) */
  type: 'screen' | 'action' | 'decision' | 'api-call' | 'redirect';
  /** Configuration for this step */
  config: Record<string, any>;
  /** Next step(s) in the flow */
  next?: string | string[] | Record<string, string>;
  /** Conditions for proceeding to next step */
  conditions?: Record<string, any>;
}

export interface FlowDefinition {
  /** Name of the flow */
  name: string;
  /** Starting step ID */
  startStep: string;
  /** Map of step IDs to step definitions */
  steps: Record<string, FlowStep>;
  /** Metadata about the flow */
  metadata?: Record<string, any>;
}

export interface FlowConfig {
  /** Name identifier for this flow disc */
  name: string;
  /** Flow definitions to apply */
  flows: Record<string, FlowDefinition>;
  /** Whether to merge with existing flows or replace */
  mergeStrategy?: 'merge' | 'replace';
}

export interface WorkflowStep extends FlowStep {
  /** Guard function to validate transitions */
  guard?: (context: any) => boolean;
  /** Whether this step requires approval */
  requiresApproval?: boolean;
}

export interface WorkflowInstance {
  /** Unique identifier for this instance */
  instanceId: string;
  /** Workflow ID this instance belongs to */
  workflowId: string;
  /** Current step ID(s) - can be multiple for parallel execution */
  currentStepId: string | string[];
  /** Instance context data */
  context: any;
  /** History of visited steps */
  history: string[];
  /** Instance status */
  status: 'active' | 'completed' | 'failed';
  /** Approval status per step */
  approvals?: Record<string, boolean>;
  /** Timestamp when instance was created */
  createdAt: number;
  /** Timestamp when instance was completed or failed */
  completedAt?: number;
}

export class FlowDisc implements Disc {
  metadata: DiscMetadata;
  private config: FlowConfig;
  private workflows: Map<string, { steps: WorkflowStep[] }> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();
  private previousState: Record<string, any> | null = null;

  constructor(config: FlowConfig) {
    this.config = config;
    this.metadata = {
      id: this.generateId(),
      name: config.name,
      type: 'flow',
      version: '1.0.0',
      createdAt: Date.now(),
    };
  }

  /**
   * Define a new workflow with steps
   * @param workflowId - Unique identifier for the workflow
   * @param steps - Array of workflow steps
   * @throws {Error} If workflow validation fails
   * @example
   * flowDisc.defineWorkflow('onboarding', [
   *   { id: 'welcome', type: 'screen', config: {}, next: 'profile' },
   *   { id: 'profile', type: 'screen', config: {}, next: 'complete' }
   * ]);
   */
  defineWorkflow(workflowId: string, steps: WorkflowStep[]): void {
    this.validateWorkflowStructure(workflowId, steps);
    this.workflows.set(workflowId, { steps });
  }

  /**
   * Start a new workflow instance
   * @param workflowId - Workflow ID to start
   * @param context - Initial context data for the instance
   * @returns Instance ID for the started workflow
   * @throws {Error} If workflow does not exist
   * @example
   * const instanceId = flowDisc.startWorkflow('onboarding', { userId: '123' });
   */
  startWorkflow(workflowId: string, context: any): string {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }

    const instanceId = this.generateInstanceId();
    const firstStep = workflow.steps[0];

    const instance: WorkflowInstance = {
      instanceId,
      workflowId,
      currentStepId: firstStep.id,
      context: { ...context },
      history: [firstStep.id],
      status: 'active',
      approvals: {},
      createdAt: Date.now(),
    };

    this.instances.set(instanceId, instance);
    return instanceId;
  }

  /**
   * Transition workflow instance to a specific step
   * @param instanceId - Workflow instance ID
   * @param stepId - Target step ID to transition to
   * @throws {Error} If transition is not allowed
   * @example
   * flowDisc.transitionTo('instance-123', 'profile');
   */
  transitionTo(instanceId: string, stepId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance '${instanceId}' not found`);
    }

    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${instance.workflowId}' not found`);
    }

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error(`Step '${stepId}' not found`);
    }

    if (step.requiresApproval && !instance.approvals?.[stepId]) {
      throw new Error(`Step '${stepId}' requires approval`);
    }

    if (!this.canTransition(instanceId, stepId)) {
      throw new Error(`Cannot transition to step '${stepId}'`);
    }

    instance.currentStepId = stepId;
    instance.history.push(stepId);
  }

  /**
   * Get the current step of a workflow instance
   * @param instanceId - Workflow instance ID
   * @returns Current workflow step
   * @throws {Error} If instance not found
   * @example
   * const currentStep = flowDisc.getCurrentStep('instance-123');
   */
  getCurrentStep(instanceId: string): WorkflowStep {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance '${instanceId}' not found`);
    }

    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${instance.workflowId}' not found`);
    }

    const currentStepId = Array.isArray(instance.currentStepId)
      ? instance.currentStepId[0]
      : instance.currentStepId;

    const step = workflow.steps.find((s) => s.id === currentStepId);
    if (!step) {
      throw new Error(`Current step '${currentStepId}' not found`);
    }

    return step;
  }

  /**
   * Check if transition to a step is allowed
   * @param instanceId - Workflow instance ID
   * @param stepId - Target step ID
   * @returns True if transition is allowed
   * @example
   * if (flowDisc.canTransition('instance-123', 'profile')) {
   *   flowDisc.transitionTo('instance-123', 'profile');
   * }
   */
  canTransition(instanceId: string, stepId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance || instance.status !== 'active') {
      return false;
    }

    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) {
      return false;
    }

    const currentStepId = Array.isArray(instance.currentStepId)
      ? instance.currentStepId[0]
      : instance.currentStepId;

    const currentStep = workflow.steps.find((s) => s.id === currentStepId);
    const targetStep = workflow.steps.find((s) => s.id === stepId);

    if (!currentStep || !targetStep) {
      return false;
    }

    if (targetStep.guard && !targetStep.guard(instance.context)) {
      return false;
    }

    if (targetStep.requiresApproval && !instance.approvals?.[stepId]) {
      return false;
    }

    const nextSteps = this.resolveNextSteps(currentStep, instance.context);
    if (Array.isArray(nextSteps)) {
      return nextSteps.includes(stepId);
    }

    return nextSteps === stepId;
  }

  /**
   * Complete a workflow instance
   * @param instanceId - Workflow instance ID
   * @throws {Error} If instance not found or already completed
   * @example
   * flowDisc.completeWorkflow('instance-123');
   */
  completeWorkflow(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance '${instanceId}' not found`);
    }

    if (instance.status !== 'active') {
      throw new Error(`Instance '${instanceId}' is not active`);
    }

    instance.status = 'completed';
    instance.completedAt = Date.now();
  }

  /**
   * Rollback workflow instance to a previous step
   * @param instanceId - Workflow instance ID
   * @param stepId - Step ID to rollback to (must be in history)
   * @throws {Error} If step not in history or instance not found
   * @example
   * flowDisc.rollbackToStep('instance-123', 'welcome');
   */
  rollbackToStep(instanceId: string, stepId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance '${instanceId}' not found`);
    }

    const stepIndex = instance.history.indexOf(stepId);
    if (stepIndex === -1) {
      throw new Error(`Step '${stepId}' not found in history`);
    }

    instance.currentStepId = stepId;
    instance.history = instance.history.slice(0, stepIndex + 1);
  }

  /**
   * Approve a step that requires approval
   * @param instanceId - Workflow instance ID
   * @param stepId - Step ID to approve
   * @example
   * flowDisc.approveStep('instance-123', 'manager-review');
   */
  approveStep(instanceId: string, stepId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance '${instanceId}' not found`);
    }

    if (!instance.approvals) {
      instance.approvals = {};
    }

    instance.approvals[stepId] = true;
  }

  /**
   * Get workflow instance details
   * @param instanceId - Workflow instance ID
   * @returns Workflow instance or undefined
   * @example
   * const instance = flowDisc.getInstance('instance-123');
   */
  getInstance(instanceId: string): WorkflowInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Apply flow changes to the system
   * @param context - Context object to apply flows to
   * @returns Updated context with applied flows
   * @throws {Error} If context is invalid
   * @example
   * const result = await flowDisc.apply({ workflows: {} });
   */
  async apply(context: any): Promise<any> {
    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context: must be an object');
    }

    this.previousState = context.workflows ? { ...context.workflows } : {};

    if (!context.workflows) {
      context.workflows = {};
    }

    for (const [flowName, flowDef] of Object.entries(this.config.flows)) {
      const steps = Object.values(flowDef.steps).map((step) => ({
        ...step,
      }));

      this.defineWorkflow(flowName, steps);

      if (this.config.mergeStrategy === 'replace') {
        context.workflows[flowName] = flowDef;
      } else {
        context.workflows[flowName] = {
          ...context.workflows[flowName],
          ...flowDef,
        };
      }
    }

    return {
      workflows: context.workflows,
      applied: Object.keys(this.config.flows),
      timestamp: Date.now(),
    };
  }

  /**
   * Revert flows to previous state
   * @param context - Context object to revert
   * @returns Reverted context state
   * @throws {Error} If no previous state or invalid context
   * @example
   * const result = await flowDisc.revert(context);
   */
  async revert(context: any): Promise<any> {
    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context: must be an object');
    }

    if (!this.previousState) {
      throw new Error('No previous state to revert to');
    }

    context.workflows = { ...this.previousState };

    for (const flowName of Object.keys(this.config.flows)) {
      this.workflows.delete(flowName);
    }

    return {
      workflows: context.workflows,
      reverted: Object.keys(this.config.flows),
      timestamp: Date.now(),
    };
  }

  /**
   * Preview flow changes without applying them
   * @param context - Context object to preview against
   * @returns Preview data showing changes
   * @example
   * const preview = await flowDisc.preview(context);
   */
  async preview(context: any): Promise<any> {
    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context: must be an object');
    }

    const changes: Record<string, any> = {};
    const currentWorkflows = context.workflows || {};

    for (const [flowName, flowDef] of Object.entries(this.config.flows)) {
      const isNew = !currentWorkflows[flowName];
      const isModified = currentWorkflows[flowName] && 
        JSON.stringify(currentWorkflows[flowName]) !== JSON.stringify(flowDef);

      changes[flowName] = {
        action: isNew ? 'add' : isModified ? 'modify' : 'unchanged',
        current: currentWorkflows[flowName] || null,
        proposed: flowDef,
      };
    }

    return {
      changes,
      summary: {
        added: Object.values(changes).filter((c: any) => c.action === 'add').length,
        modified: Object.values(changes).filter((c: any) => c.action === 'modify').length,
        unchanged: Object.values(changes).filter((c: any) => c.action === 'unchanged').length,
      },
    };
  }

  /**
   * Validate flow disc configuration
   * @returns True if all workflows are valid
   * @example
   * const isValid = await flowDisc.validate();
   */
  async validate(): Promise<boolean> {
    try {
      for (const [flowName, flowDef] of Object.entries(this.config.flows)) {
        const steps = Object.values(flowDef.steps);
        this.validateWorkflowStructure(flowName, steps);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get a specific flow definition
   * @param flowName - Name of the flow
   * @returns Flow definition or null if not found
   * @example
   * const flow = flowDisc.getFlow('onboarding');
   */
  getFlow(flowName: string): FlowDefinition | null {
    return this.config.flows[flowName] ?? null;
  }

  /**
   * Get the next step(s) in a flow
   * @param flowName - Name of the flow
   * @param currentStepId - Current step ID
   * @param context - Optional context for condition evaluation
   * @returns Next step ID(s) or null
   * @example
   * const nextStep = flowDisc.getNextStep('onboarding', 'welcome', { premium: true });
   */
  getNextStep(flowName: string, currentStepId: string, context?: any): string | string[] | null {
    const workflow = this.workflows.get(flowName);
    if (workflow) {
      const step = workflow.steps.find((s) => s.id === currentStepId);
      if (step) {
        return this.resolveNextSteps(step, context || {});
      }
    }

    const flow = this.getFlow(flowName);
    if (!flow) {
      return null;
    }

    const step = flow.steps[currentStepId];
    if (!step) {
      return null;
    }

    return this.resolveNextSteps(step, context || {});
  }

  private validateWorkflowStructure(workflowId: string, steps: WorkflowStep[]): void {
    if (!steps || steps.length === 0) {
      throw new Error(`Workflow '${workflowId}' has no steps`);
    }

    const stepIds = new Set<string>();
    const referencedSteps = new Set<string>();

    for (const step of steps) {
      if (!step.id) {
        throw new Error(`Step in workflow '${workflowId}' missing id`);
      }

      if (stepIds.has(step.id)) {
        throw new Error(`Duplicate step id '${step.id}' in workflow '${workflowId}'`);
      }

      stepIds.add(step.id);

      if (step.next) {
        const nextSteps = typeof step.next === 'string' 
          ? [step.next]
          : Array.isArray(step.next)
          ? step.next
          : Object.values(step.next);

        nextSteps.forEach((nextStep) => referencedSteps.add(nextStep));
      }
    }

    for (const refStep of Array.from(referencedSteps)) {
      if (!stepIds.has(refStep)) {
        throw new Error(`Referenced step '${refStep}' not found in workflow '${workflowId}'`);
      }
    }

    this.detectCircularReferences(workflowId, steps);
  }

  private detectCircularReferences(workflowId: string, steps: WorkflowStep[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCircle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        return true;
      }

      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find((s) => s.id === stepId);
      if (step && step.next) {
        const nextSteps = typeof step.next === 'string'
          ? [step.next]
          : Array.isArray(step.next)
          ? step.next
          : Object.values(step.next);

        for (const nextStep of nextSteps) {
          if (hasCircle(nextStep)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    if (steps.length > 0 && hasCircle(steps[0].id)) {
      throw new Error(`Circular reference detected in workflow '${workflowId}'`);
    }
  }

  private resolveNextSteps(step: WorkflowStep, context: any): string | string[] | null {
    if (!step.next) {
      return null;
    }

    if (typeof step.next === 'string') {
      return step.next;
    }

    if (Array.isArray(step.next)) {
      return step.next;
    }

    if (step.conditions) {
      for (const [key, value] of Object.entries(step.conditions)) {
        if (context[key] === value && step.next[key]) {
          return step.next[key];
        }
      }
    }

    const defaultKey = 'default';
    return step.next[defaultKey] || null;
  }

  private generateId(): string {
    return `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInstanceId(): string {
    return `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
