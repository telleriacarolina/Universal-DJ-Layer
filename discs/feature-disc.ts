/**
 * FeatureDisc - Controls feature flags and toggles
 * 
 * Allows dynamic enabling/disabling of application features at runtime.
 * Useful for A/B testing, gradual rollouts, and experimental features.
 * 
 * TODO: Implement feature flag management with inheritance and targeting
 */

export interface DiscMetadata {
  /** Unique identifier for this disc instance */
  id: string;
  /** Human-readable name */
  name: string;
  /** Disc type identifier */
  type: string;
  /** Version of the disc schema */
  version: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last modification timestamp */
  updatedAt?: number;
}

export interface Disc {
  /** Metadata about this disc */
  metadata: DiscMetadata;
  /** Apply the disc's changes */
  apply(context: any): Promise<any>;
  /** Revert the disc's changes */
  revert(context: any): Promise<any>;
  /** Preview what the disc would do */
  preview(context: any): Promise<any>;
  /** Validate the disc configuration */
  validate(): Promise<boolean>;
}

export interface FeatureState {
  /** Whether the feature is enabled by default */
  enabled: boolean;
  /** Rollout percentage (0-100) */
  rolloutPercentage?: number;
  /** List of user IDs explicitly allowed */
  allowlist?: string[];
  /** List of user IDs explicitly denied */
  denylist?: string[];
  /** Dependencies on other features */
  dependencies?: string[];
}

export interface FeatureConfig {
  /** Name identifier for this feature disc */
  name: string;
  /** Map of feature keys to their state configuration */
  features: Record<string, FeatureState | boolean>;
  /** Optional targeting rules (e.g., user segments, percentages) */
  targeting?: Record<string, any>;
  /** Dependencies on other features */
  dependencies?: string[];
}

export class FeatureDisc implements Disc {
  metadata: DiscMetadata;
  private config: FeatureConfig;
  private previousState: Record<string, any> | null = null;

  constructor(config: FeatureConfig) {
    this.config = this.normalizeConfig(config);
    this.metadata = {
      id: this.generateId(),
      name: config.name,
      type: 'feature',
      version: '1.0.0',
      createdAt: Date.now(),
    };
  }

  /**
   * Apply feature flags to the system
   * @param context - Context object to apply features to
   * @returns Updated context with applied features
   * @example
   * const result = await featureDisc.apply({ features: {} });
   */
  async apply(context: any): Promise<any> {
    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context: must be an object');
    }

    // Store previous state for revert
    this.previousState = context.features ? { ...context.features } : {};

    // Initialize features object if not present
    if (!context.features) {
      context.features = {};
    }

    // Apply each feature configuration
    for (const [featureKey, featureState] of Object.entries(this.config.features)) {
      const normalizedState = this.normalizeFeatureState(featureState);
      context.features[featureKey] = {
        enabled: normalizedState.enabled,
        rolloutPercentage: normalizedState.rolloutPercentage,
        allowlist: normalizedState.allowlist || [],
        denylist: normalizedState.denylist || [],
        dependencies: normalizedState.dependencies || [],
      };
    }

    return context;
  }

  /**
   * Revert feature flags to previous state
   * @param context - Context object to revert
   * @returns Context with reverted features
   * @throws Error if no previous state exists
   * @example
   * const result = await featureDisc.revert(context);
   */
  async revert(context: any): Promise<any> {
    if (!this.previousState) {
      throw new Error('No previous state to revert to');
    }

    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context: must be an object');
    }

    // Restore previous state
    context.features = { ...this.previousState };
    this.previousState = null;

    return context;
  }

  /**
   * Compare two arrays for equality (order-independent)
   * @private
   */
  private arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }

  /**
   * Preview feature flag changes without applying
   * @param context - Context object to preview against
   * @returns Preview object showing changes
   * @example
   * const preview = await featureDisc.preview(context);
   */
  async preview(context: any): Promise<any> {
    const changes: Record<string, any> = {};
    const currentFeatures = context?.features || {};

    for (const [featureKey, featureState] of Object.entries(this.config.features)) {
      const normalizedState = this.normalizeFeatureState(featureState);
      const currentState = currentFeatures[featureKey];

      if (!currentState) {
        changes[featureKey] = {
          current: { enabled: false },
          proposed: normalizedState,
          action: 'add',
        };
      } else {
        const hasChanges = 
          currentState.enabled !== normalizedState.enabled ||
          currentState.rolloutPercentage !== normalizedState.rolloutPercentage ||
          !this.arraysEqual(currentState.allowlist || [], normalizedState.allowlist || []) ||
          !this.arraysEqual(currentState.denylist || [], normalizedState.denylist || []) ||
          !this.arraysEqual(currentState.dependencies || [], normalizedState.dependencies || []);

        if (hasChanges) {
          changes[featureKey] = {
            current: currentState,
            proposed: normalizedState,
            action: 'modify',
          };
        }
      }
    }

    return {
      discName: this.metadata.name,
      changesCount: Object.keys(changes).length,
      changes,
      affectedFeatures: Object.keys(changes),
    };
  }

  /**
   * Validate feature disc configuration
   * @returns True if valid, false otherwise
   * @throws Error with validation details
   * @example
   * const isValid = await featureDisc.validate();
   */
  async validate(): Promise<boolean> {
    const errors: string[] = [];

    // Validate each feature
    for (const [featureKey, featureState] of Object.entries(this.config.features)) {
      const normalizedState = this.normalizeFeatureState(featureState);

      // Validate rollout percentage
      if (normalizedState.rolloutPercentage !== undefined) {
        if (normalizedState.rolloutPercentage < 0 || normalizedState.rolloutPercentage > 100) {
          errors.push(`Feature '${featureKey}': rollout percentage must be 0-100`);
        }
      }

      // Validate dependencies
      if (normalizedState.dependencies && normalizedState.dependencies.length > 0) {
        for (const dep of normalizedState.dependencies) {
          if (!this.config.features[dep]) {
            errors.push(`Feature '${featureKey}': dependency '${dep}' does not exist`);
          }
        }
      }
    }

    // Check for circular dependencies (once for all features)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    for (const featureKey of Object.keys(this.config.features)) {
      if (!visited.has(featureKey)) {
        if (this.hasCircularDependency(featureKey, visited, recursionStack)) {
          errors.push(`Feature '${featureKey}': circular dependency detected`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed:\n${errors.join('\n')}`);
    }

    return true;
  }

  /**
   * Check if a specific feature is enabled for a user
   * @param featureKey - The feature key to check
   * @param userId - Optional user ID for targeting rules
   * @returns True if the feature is enabled
   * @example
   * const enabled = featureDisc.isFeatureEnabled('newUI', 'user123');
   */
  isFeatureEnabled(featureKey: string, userId?: string): boolean {
    const featureState = this.config.features[featureKey];
    
    if (!featureState) {
      return false;
    }

    const normalizedState = this.normalizeFeatureState(featureState);

    // Check dependencies first
    if (normalizedState.dependencies && normalizedState.dependencies.length > 0) {
      for (const dep of normalizedState.dependencies) {
        if (!this.isFeatureEnabled(dep, userId)) {
          return false;
        }
      }
    }

    // If no userId, return base enabled state
    if (!userId) {
      return normalizedState.enabled;
    }

    // Check allowlist first (highest priority)
    if (normalizedState.allowlist && normalizedState.allowlist.includes(userId)) {
      return true;
    }

    // Check denylist second (overrides everything except allowlist)
    if (normalizedState.denylist && normalizedState.denylist.includes(userId)) {
      return false;
    }

    // Check rollout percentage if defined
    if (normalizedState.rolloutPercentage !== undefined) {
      const userHash = this.hashUser(userId, featureKey);
      return userHash <= normalizedState.rolloutPercentage;
    }

    // Default to base enabled state
    return normalizedState.enabled;
  }

  /**
   * Set the enabled state of a feature
   * @param featureKey - The feature key to modify
   * @param enabled - Whether the feature should be enabled
   * @example
   * featureDisc.setFeatureState('darkMode', true);
   */
  setFeatureState(featureKey: string, enabled: boolean): void {
    if (!this.config.features[featureKey]) {
      this.config.features[featureKey] = { enabled };
    } else {
      const state = this.normalizeFeatureState(this.config.features[featureKey]);
      state.enabled = enabled;
      this.config.features[featureKey] = state;
    }
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Set the rollout percentage for a feature
   * @param featureKey - The feature key to modify
   * @param percentage - Rollout percentage (0-100)
   * @throws Error if percentage is invalid
   * @example
   * featureDisc.setRolloutPercentage('betaFeature', 25);
   */
  setRolloutPercentage(featureKey: string, percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    const state = this.normalizeFeatureState(this.config.features[featureKey] || { enabled: false });
    state.rolloutPercentage = percentage;
    this.config.features[featureKey] = state;
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Add a user to the allowlist for a feature
   * @param featureKey - The feature key to modify
   * @param userId - User ID to add
   * @example
   * featureDisc.addUserToAllowlist('premiumFeature', 'user123');
   */
  addUserToAllowlist(featureKey: string, userId: string): void {
    const state = this.normalizeFeatureState(this.config.features[featureKey] || { enabled: false });
    if (!state.allowlist) {
      state.allowlist = [];
    }
    if (!state.allowlist.includes(userId)) {
      state.allowlist.push(userId);
    }
    this.config.features[featureKey] = state;
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Add a user to the denylist for a feature
   * @param featureKey - The feature key to modify
   * @param userId - User ID to add
   * @example
   * featureDisc.addUserToDenylist('experimentalFeature', 'user456');
   */
  addUserToDenylist(featureKey: string, userId: string): void {
    const state = this.normalizeFeatureState(this.config.features[featureKey] || { enabled: false });
    if (!state.denylist) {
      state.denylist = [];
    }
    if (!state.denylist.includes(userId)) {
      state.denylist.push(userId);
    }
    this.config.features[featureKey] = state;
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Remove a user from the allowlist for a feature
   * @param featureKey - The feature key to modify
   * @param userId - User ID to remove
   * @example
   * featureDisc.removeUserFromAllowlist('premiumFeature', 'user123');
   */
  removeUserFromAllowlist(featureKey: string, userId: string): void {
    const state = this.normalizeFeatureState(this.config.features[featureKey] || { enabled: false });
    if (state.allowlist) {
      state.allowlist = state.allowlist.filter(id => id !== userId);
    }
    this.config.features[featureKey] = state;
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Remove a user from the denylist for a feature
   * @param featureKey - The feature key to modify
   * @param userId - User ID to remove
   * @example
   * featureDisc.removeUserFromDenylist('experimentalFeature', 'user456');
   */
  removeUserFromDenylist(featureKey: string, userId: string): void {
    const state = this.normalizeFeatureState(this.config.features[featureKey] || { enabled: false });
    if (state.denylist) {
      state.denylist = state.denylist.filter(id => id !== userId);
    }
    this.config.features[featureKey] = state;
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Set dependencies for a feature
   * @param featureKey - The feature key to modify
   * @param dependencies - Array of feature keys this feature depends on
   * @example
   * featureDisc.setFeatureDependencies('advancedMode', ['premiumFeature', 'betaAccess']);
   */
  setFeatureDependencies(featureKey: string, dependencies: string[]): void {
    const state = this.normalizeFeatureState(this.config.features[featureKey] || { enabled: false });
    state.dependencies = dependencies;
    this.config.features[featureKey] = state;
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Get all feature states
   * @returns Record of all features and their states
   */
  getAllFeatures(): Record<string, FeatureState> {
    const result: Record<string, FeatureState> = {};
    for (const [key, value] of Object.entries(this.config.features)) {
      result[key] = this.normalizeFeatureState(value);
    }
    return result;
  }

  /**
   * Normalize feature configuration to FeatureState
   * @private
   */
  private normalizeFeatureState(state: FeatureState | boolean): FeatureState {
    if (typeof state === 'boolean') {
      return { enabled: state };
    }
    return { ...state };
  }

  /**
   * Normalize the configuration object
   * @private
   */
  private normalizeConfig(config: FeatureConfig): FeatureConfig {
    return {
      name: config.name,
      features: { ...config.features },
      targeting: config.targeting ? { ...config.targeting } : undefined,
      dependencies: config.dependencies ? [...config.dependencies] : undefined,
    };
  }

  /**
   * Hash a user ID to a deterministic value 0-100 using djb2 algorithm
   * @private
   */
  private hashUser(userId: string, featureKey: string): number {
    const combined = `${userId}:${featureKey}`;
    let hash = 5381;
    
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) + hash) + combined.charCodeAt(i);
    }
    
    return Math.abs(hash) % 101;
  }

  /**
   * Check for circular dependencies using DFS
   * @private
   */
  private hasCircularDependency(
    featureKey: string,
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    visited.add(featureKey);
    recursionStack.add(featureKey);

    const featureState = this.config.features[featureKey];
    
    // If feature doesn't exist, skip it (will be caught in validation)
    if (!featureState) {
      recursionStack.delete(featureKey);
      return false;
    }

    const normalizedState = this.normalizeFeatureState(featureState);
    const dependencies = normalizedState.dependencies || [];

    for (const dep of dependencies) {
      // Skip non-existent dependencies (will be caught in validation)
      if (!this.config.features[dep]) {
        continue;
      }

      if (!visited.has(dep)) {
        if (this.hasCircularDependency(dep, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        return true;
      }
    }

    recursionStack.delete(featureKey);
    return false;
  }

  private generateId(): string {
    return `feature-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
