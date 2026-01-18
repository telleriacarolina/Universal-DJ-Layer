import { Disc } from '../core/disc';
import { Role, Permission, DiscMetadata } from '../core/types';

/**
 * Example Feature Flag Disc - Manages feature toggles
 */
export class FeatureFlagDisc extends Disc {
  constructor() {
    const metadata: DiscMetadata = {
      id: 'feature-flag-disc',
      name: 'Feature Flag Disc',
      version: '1.0.0',
      description: 'Manages feature flags for controlled rollouts and experimentation',
      author: 'DJ Control Layer',
      requiredRole: Role.EXPERIMENTER,
      requiredPermissions: [Permission.READ, Permission.WRITE, Permission.EXECUTE]
    };

    super(metadata);

    // Initialize default config
    this.state.config = {
      features: {}
    };
  }

  async initialize(): Promise<void> {
    console.log('Feature Flag Disc initialized');
  }

  async cleanup(): Promise<void> {
    console.log('Feature Flag Disc cleaned up');
  }

  async execute(context: any): Promise<any> {
    const featureName = context.featureName;
    if (!featureName) {
      throw new Error('Feature name is required');
    }

    const isEnabled = this.isFeatureEnabled(featureName, context.userId);

    return {
      feature: featureName,
      enabled: isEnabled,
      checkedBy: context.userId,
      checkedAt: new Date()
    };
  }

  async validate(data: any): Promise<boolean> {
    // Validate feature flag data
    if (!data.name || typeof data.name !== 'string') {
      return false;
    }

    if (data.enabled !== undefined && typeof data.enabled !== 'boolean') {
      return false;
    }

    if (data.rolloutPercentage !== undefined) {
      const percentage = data.rolloutPercentage;
      if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
        return false;
      }
    }

    return true;
  }

  /**
   * Add or update a feature flag
   */
  setFeatureFlag(
    name: string,
    enabled: boolean,
    userId: string,
    options?: {
      rolloutPercentage?: number;
      userWhitelist?: string[];
      userBlacklist?: string[];
    }
  ): void {
    const features = { ...this.state.config.features };
    features[name] = {
      enabled,
      rolloutPercentage: options?.rolloutPercentage || 100,
      userWhitelist: options?.userWhitelist || [],
      userBlacklist: options?.userBlacklist || [],
      createdAt: new Date(),
      createdBy: userId
    };

    this.updateConfig({ features }, userId);
  }

  /**
   * Check if a feature is enabled for a user
   */
  isFeatureEnabled(featureName: string, userId?: string): boolean {
    const feature = this.state.config.features[featureName];

    if (!feature) {
      return false;
    }

    if (!feature.enabled) {
      return false;
    }

    if (!userId) {
      return feature.enabled;
    }

    // Check blacklist
    if (feature.userBlacklist && feature.userBlacklist.includes(userId)) {
      return false;
    }

    // Check whitelist
    if (feature.userWhitelist && feature.userWhitelist.length > 0) {
      return feature.userWhitelist.includes(userId);
    }

    // Check rollout percentage
    if (feature.rolloutPercentage < 100) {
      const hash = this.hashUserId(userId);
      return (hash % 100) < feature.rolloutPercentage;
    }

    return true;
  }

  /**
   * Get all feature flags
   */
  getAllFeatures(): Record<string, any> {
    return { ...this.state.config.features };
  }

  /**
   * Remove a feature flag
   */
  removeFeatureFlag(name: string, userId: string): void {
    const features = { ...this.state.config.features };
    delete features[name];
    this.updateConfig({ features }, userId);
  }

  /**
   * Simple hash function for user ID
   * Note: Uses a simple string hash algorithm. For production use with strict
   * distribution requirements, consider using a cryptographic hash or more
   * sophisticated distribution algorithm.
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
