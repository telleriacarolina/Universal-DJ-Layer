/**
 * BehaviorDisc - Controls application logic and behavior patterns
 * 
 * Enables dynamic modification of business logic, algorithms, and
 * behavioral patterns at runtime without code deployment.
 */

import type { Disc, DiscMetadata } from './feature-disc';

export interface BehaviorRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Condition for when this rule applies */
  condition: string | ((context: any) => boolean);
  /** Action to take when rule matches */
  action: string | ((context: any) => any);
  /** Priority (higher = evaluated first) */
  priority?: number;
}

export interface BehaviorStrategy {
  /** Strategy name */
  name: string;
  /** Strategy type (algorithm variant) */
  type: string;
  /** Strategy configuration */
  config: Record<string, any>;
  /** Applicable contexts */
  contexts?: string[];
}

export interface BehaviorConfig {
  /** Name identifier for this behavior disc */
  name: string;
  /** Behavior rules to apply */
  rules?: Record<string, BehaviorRule>;
  /** Behavior strategies to apply */
  strategies?: Record<string, BehaviorStrategy>;
  /** Default behavior overrides */
  defaults?: Record<string, any>;
}

export interface FunctionWrapper {
  /** Original function reference */
  original: Function;
  /** Wrapped function reference */
  wrapped: Function;
  /** Before hook */
  before?: Function;
  /** After hook */
  after?: Function;
}

export class BehaviorDisc implements Disc {
  metadata: DiscMetadata;
  private config: BehaviorConfig;
  private previousState: Record<string, any> | null = null;
  
  private algorithms: Map<string, Function> = new Map();
  private variants: Map<string, string> = new Map();
  private parameters: Map<string, any> = new Map();
  private enabledBehaviors: Map<string, boolean> = new Map();
  private wrappedFunctions: Map<string, FunctionWrapper> = new Map();
  private rules: Map<string, BehaviorRule> = new Map();
  private strategies: Map<string, BehaviorStrategy> = new Map();

  constructor(config: BehaviorConfig) {
    this.config = config;
    this.metadata = {
      id: this.generateId(),
      name: config.name,
      type: 'behavior',
      version: '1.0.0',
      createdAt: Date.now(),
    };
    
    // Initialize rules and strategies from config
    if (config.rules) {
      for (const [id, rule] of Object.entries(config.rules)) {
        this.rules.set(id, rule);
      }
    }
    
    if (config.strategies) {
      for (const [name, strategy] of Object.entries(config.strategies)) {
        this.strategies.set(name, strategy);
      }
    }
  }

  /**
   * Set an algorithm implementation
   * @param algorithmId - Unique identifier for the algorithm
   * @param implementation - Function implementing the algorithm
   * @throws Error if implementation is not a function
   * @example
   * behaviorDisc.setAlgorithm('sort', (arr) => arr.sort());
   */
  setAlgorithm(algorithmId: string, implementation: Function): void {
    if (typeof implementation !== 'function') {
      throw new Error('Implementation must be a function');
    }
    this.algorithms.set(algorithmId, implementation);
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Get an algorithm implementation
   * @param algorithmId - Unique identifier for the algorithm
   * @returns The algorithm function or null if not found
   * @example
   * const sortAlgo = behaviorDisc.getAlgorithm('sort');
   */
  getAlgorithm(algorithmId: string): Function | null {
    return this.algorithms.get(algorithmId) ?? null;
  }

  /**
   * Set a variant for an experiment (A/B testing)
   * @param experimentId - Unique identifier for the experiment
   * @param variant - Variant identifier (e.g., 'A', 'B', 'control')
   * @example
   * behaviorDisc.setVariant('checkout-flow', 'variant-B');
   */
  setVariant(experimentId: string, variant: string): void {
    this.variants.set(experimentId, variant);
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Get the active variant for an experiment
   * @param experimentId - Unique identifier for the experiment
   * @returns The variant identifier or null if not set
   * @example
   * const variant = behaviorDisc.getVariant('checkout-flow');
   */
  getVariant(experimentId: string): string | null {
    return this.variants.get(experimentId) ?? null;
  }

  /**
   * Set a tunable behavior parameter
   * @param paramId - Unique identifier for the parameter
   * @param value - Parameter value (any type)
   * @example
   * behaviorDisc.setBehaviorParam('threshold', 0.85);
   * behaviorDisc.setBehaviorParam('maxRetries', 3);
   */
  setBehaviorParam(paramId: string, value: any): void {
    this.parameters.set(paramId, value);
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Get a behavior parameter value
   * @param paramId - Unique identifier for the parameter
   * @returns The parameter value or undefined if not set
   * @example
   * const threshold = behaviorDisc.getBehaviorParam('threshold');
   */
  getBehaviorParam(paramId: string): any {
    return this.parameters.get(paramId);
  }

  /**
   * Enable a behavior (logic gate)
   * @param behaviorId - Unique identifier for the behavior
   * @example
   * behaviorDisc.enableBehavior('premium-features');
   */
  enableBehavior(behaviorId: string): void {
    this.enabledBehaviors.set(behaviorId, true);
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Disable a behavior (logic gate)
   * @param behaviorId - Unique identifier for the behavior
   * @example
   * behaviorDisc.disableBehavior('legacy-mode');
   */
  disableBehavior(behaviorId: string): void {
    this.enabledBehaviors.set(behaviorId, false);
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Check if a behavior is enabled
   * @param behaviorId - Unique identifier for the behavior
   * @returns True if enabled, true by default if not set
   * @example
   * if (behaviorDisc.isBehaviorEnabled('analytics')) { ... }
   */
  isBehaviorEnabled(behaviorId: string): boolean {
    return this.enabledBehaviors.get(behaviorId) ?? true;
  }

  /**
   * Wrap a function with custom logic (before/after hooks)
   * @param functionId - Unique identifier for the wrapped function
   * @param originalFunction - The original function to wrap
   * @param before - Optional function to run before original
   * @param after - Optional function to run after original
   * @throws Error if originalFunction is not a function
   * @example
   * behaviorDisc.wrapFunction('api-call', apiCall, 
   *   (args) => console.log('Before:', args),
   *   (result) => console.log('After:', result)
   * );
   */
  wrapFunction(
    functionId: string, 
    originalFunction: Function, 
    before?: Function, 
    after?: Function
  ): void {
    if (typeof originalFunction !== 'function') {
      throw new Error('originalFunction must be a function');
    }
    
    const wrapped = function(this: any, ...args: any[]) {
      if (before) before(args);
      const result = originalFunction.apply(this, args);
      if (after) after(result);
      return result;
    };
    
    this.wrappedFunctions.set(functionId, {
      original: originalFunction,
      wrapped,
      before,
      after,
    });
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Remove function wrapping and restore original
   * @param functionId - Unique identifier for the wrapped function
   * @returns The original unwrapped function or null if not found
   * @example
   * const original = behaviorDisc.unwrapFunction('api-call');
   */
  unwrapFunction(functionId: string): Function | null {
    const wrapper = this.wrappedFunctions.get(functionId);
    if (!wrapper) return null;
    
    this.wrappedFunctions.delete(functionId);
    this.metadata.updatedAt = Date.now();
    return wrapper.original;
  }

  /**
   * Get a wrapped function
   * @param functionId - Unique identifier for the wrapped function
   * @returns The wrapped function or null if not found
   * @example
   * const wrapped = behaviorDisc.getWrappedFunction('api-call');
   */
  getWrappedFunction(functionId: string): Function | null {
    const wrapper = this.wrappedFunctions.get(functionId);
    return wrapper ? wrapper.wrapped : null;
  }

  /**
   * Add a behavior rule to the rule engine
   * @param rule - The rule to add
   * @throws Error if rule with same ID already exists
   * @example
   * behaviorDisc.addRule({
   *   id: 'premium-discount',
   *   name: 'Premium User Discount',
   *   condition: (ctx) => ctx.user.isPremium,
   *   action: (ctx) => ctx.discount = 0.2,
   *   priority: 10
   * });
   */
  addRule(rule: BehaviorRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule with ID '${rule.id}' already exists`);
    }
    this.rules.set(rule.id, rule);
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Remove a behavior rule from the rule engine
   * @param ruleId - Unique identifier for the rule
   * @returns True if rule was removed, false if not found
   * @example
   * behaviorDisc.removeRule('premium-discount');
   */
  removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      this.metadata.updatedAt = Date.now();
    }
    return deleted;
  }

  /**
   * Evaluate rules against a context and return matching rules
   * @param context - Context object to evaluate rules against
   * @returns Array of matching rules sorted by priority (highest first)
   * @example
   * const matchingRules = behaviorDisc.evaluateRules({ user: { isPremium: true } });
   */
  evaluateRules(context: any): BehaviorRule[] {
    const matchingRules: BehaviorRule[] = [];
    
    for (const rule of Array.from(this.rules.values())) {
      let matches = false;
      
      if (typeof rule.condition === 'function') {
        try {
          matches = rule.condition(context);
        } catch (error) {
          // Skip rules that error during evaluation
          continue;
        }
      } else if (typeof rule.condition === 'string') {
        // String conditions are treated as always matching for now
        matches = true;
      }
      
      if (matches) {
        matchingRules.push(rule);
      }
    }
    
    // Sort by priority (highest first)
    return matchingRules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Execute a specific rule's action
   * @param ruleId - Unique identifier for the rule
   * @param context - Context object to pass to the action
   * @returns Result of the action or null if rule not found
   * @throws Error if rule not found or action execution fails
   * @example
   * const result = behaviorDisc.executeRuleAction('premium-discount', { user: { isPremium: true } });
   */
  executeRuleAction(ruleId: string, context: any): any {
    const rule = this.rules.get(ruleId);
    
    if (!rule) {
      throw new Error(`Rule '${ruleId}' not found`);
    }
    
    if (typeof rule.action === 'function') {
      return rule.action(context);
    } else if (typeof rule.action === 'string') {
      // String actions return the string itself
      return rule.action;
    }
    
    return null;
  }

  /**
   * Add a behavior strategy
   * @param strategy - The strategy to add
   * @throws Error if strategy with same name already exists
   * @example
   * behaviorDisc.addStrategy({
   *   name: 'fast-sort',
   *   type: 'sorting',
   *   config: { algorithm: 'quicksort' },
   *   contexts: ['large-datasets']
   * });
   */
  addStrategy(strategy: BehaviorStrategy): void {
    if (this.strategies.has(strategy.name)) {
      throw new Error(`Strategy with name '${strategy.name}' already exists`);
    }
    this.strategies.set(strategy.name, strategy);
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Get a specific strategy
   * @param strategyName - Name of the strategy
   * @returns The strategy or null if not found
   * @example
   * const strategy = behaviorDisc.getStrategy('fast-sort');
   */
  getStrategy(strategyName: string): BehaviorStrategy | null {
    return this.strategies.get(strategyName) ?? null;
  }

  /**
   * Remove a behavior strategy
   * @param strategyName - Name of the strategy to remove
   * @returns True if strategy was removed, false if not found
   * @example
   * behaviorDisc.removeStrategy('fast-sort');
   */
  removeStrategy(strategyName: string): boolean {
    const deleted = this.strategies.delete(strategyName);
    if (deleted) {
      this.metadata.updatedAt = Date.now();
    }
    return deleted;
  }

  /**
   * Apply behavior changes to the system
   * @param context - Context object to apply behaviors to
   * @returns Updated context with applied behaviors
   * @throws Error if context is invalid
   * @example
   * const result = await behaviorDisc.apply({ behaviors: {} });
   */
  async apply(context: any): Promise<any> {
    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context: must be an object');
    }

    // Store previous state for revert
    this.previousState = context.behaviors ? { ...context.behaviors } : {};

    // Initialize behaviors object if not present
    if (!context.behaviors) {
      context.behaviors = {};
    }

    // Apply algorithms
    context.behaviors.algorithms = {};
    for (const [id] of Array.from(this.algorithms.entries())) {
      context.behaviors.algorithms[id] = { registered: true };
    }

    // Apply variants
    context.behaviors.variants = {};
    for (const [experimentId, variant] of Array.from(this.variants.entries())) {
      context.behaviors.variants[experimentId] = variant;
    }

    // Apply parameters
    context.behaviors.parameters = {};
    for (const [paramId, value] of Array.from(this.parameters.entries())) {
      context.behaviors.parameters[paramId] = value;
    }

    // Apply enabled behaviors
    context.behaviors.enabled = {};
    for (const [behaviorId, enabled] of Array.from(this.enabledBehaviors.entries())) {
      context.behaviors.enabled[behaviorId] = enabled;
    }

    // Apply rules
    context.behaviors.rules = Array.from(this.rules.keys());

    // Apply strategies
    context.behaviors.strategies = Array.from(this.strategies.keys());

    // Apply wrapped functions
    context.behaviors.wrappedFunctions = Array.from(this.wrappedFunctions.keys());

    return context;
  }

  /**
   * Revert behaviors to previous state
   * @param context - Context object to revert
   * @returns Context with reverted behaviors
   * @throws Error if no previous state exists or context is invalid
   * @example
   * const result = await behaviorDisc.revert(context);
   */
  async revert(context: any): Promise<any> {
    if (!this.previousState) {
      throw new Error('No previous state to revert to');
    }

    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context: must be an object');
    }

    // Restore previous state
    context.behaviors = { ...this.previousState };
    this.previousState = null;

    return context;
  }

  /**
   * Preview behavior changes without applying
   * @param context - Context object to preview against
   * @returns Preview object showing changes
   * @example
   * const preview = await behaviorDisc.preview(context);
   */
  async preview(context: any): Promise<any> {
    const changes: Record<string, any> = {};
    const currentBehaviors = context?.behaviors || {};

    // Preview algorithms
    const algorithmIds = Array.from(this.algorithms.keys());
    if (algorithmIds.length > 0) {
      changes.algorithms = {
        current: Object.keys(currentBehaviors.algorithms || {}),
        proposed: algorithmIds,
        action: 'add',
      };
    }

    // Preview variants
    const variantChanges: Record<string, any> = {};
    for (const [experimentId, variant] of Array.from(this.variants.entries())) {
      const currentVariant = currentBehaviors.variants?.[experimentId];
      if (currentVariant !== variant) {
        variantChanges[experimentId] = {
          current: currentVariant,
          proposed: variant,
        };
      }
    }
    if (Object.keys(variantChanges).length > 0) {
      changes.variants = variantChanges;
    }

    // Preview parameters
    const parameterChanges: Record<string, any> = {};
    for (const [paramId, value] of Array.from(this.parameters.entries())) {
      const currentValue = currentBehaviors.parameters?.[paramId];
      if (currentValue !== value) {
        parameterChanges[paramId] = {
          current: currentValue,
          proposed: value,
        };
      }
    }
    if (Object.keys(parameterChanges).length > 0) {
      changes.parameters = parameterChanges;
    }

    // Preview rules
    const ruleIds = Array.from(this.rules.keys());
    if (ruleIds.length > 0) {
      changes.rules = {
        current: currentBehaviors.rules || [],
        proposed: ruleIds,
        action: 'add',
      };
    }

    // Preview strategies
    const strategyNames = Array.from(this.strategies.keys());
    if (strategyNames.length > 0) {
      changes.strategies = {
        current: currentBehaviors.strategies || [],
        proposed: strategyNames,
        action: 'add',
      };
    }

    return {
      discName: this.metadata.name,
      changesCount: Object.keys(changes).length,
      changes,
      affectedBehaviors: Object.keys(changes),
    };
  }

  /**
   * Validate behavior disc configuration
   * @returns True if valid
   * @throws Error with validation details if invalid
   * @example
   * const isValid = await behaviorDisc.validate();
   */
  async validate(): Promise<boolean> {
    const errors: string[] = [];

    // Validate rules
    for (const [id, rule] of Array.from(this.rules.entries())) {
      if (!rule.id || !rule.name) {
        errors.push(`Rule '${id}': must have id and name`);
      }
      
      if (typeof rule.condition !== 'function' && typeof rule.condition !== 'string') {
        errors.push(`Rule '${id}': condition must be a function or string`);
      }
      
      if (typeof rule.action !== 'function' && typeof rule.action !== 'string') {
        errors.push(`Rule '${id}': action must be a function or string`);
      }
      
      if (rule.priority !== undefined && typeof rule.priority !== 'number') {
        errors.push(`Rule '${id}': priority must be a number`);
      }
    }

    // Validate strategies
    for (const [name, strategy] of Array.from(this.strategies.entries())) {
      if (!strategy.name || !strategy.type || !strategy.config) {
        errors.push(`Strategy '${name}': must have name, type, and config`);
      }
    }

    // Validate algorithms are functions
    for (const [id, algo] of Array.from(this.algorithms.entries())) {
      if (typeof algo !== 'function') {
        errors.push(`Algorithm '${id}': must be a function`);
      }
    }

    // Validate wrapped functions
    for (const [id, wrapper] of Array.from(this.wrappedFunctions.entries())) {
      if (typeof wrapper.original !== 'function') {
        errors.push(`Wrapped function '${id}': original must be a function`);
      }
      if (wrapper.before && typeof wrapper.before !== 'function') {
        errors.push(`Wrapped function '${id}': before hook must be a function`);
      }
      if (wrapper.after && typeof wrapper.after !== 'function') {
        errors.push(`Wrapped function '${id}': after hook must be a function`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed:\n${errors.join('\n')}`);
    }

    return true;
  }

  private generateId(): string {
    return `behavior-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
