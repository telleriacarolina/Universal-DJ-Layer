import { DJEngine } from '../../src/engine/DJEngine';
import { FeatureFlagDisc } from '../../src/discs/feature-flag-disc';
import { Role } from '../../src/core/types';

/**
 * Feature Flag Manager - Business logic for feature flag management
 * Provides high-level operations for creating, updating, and querying feature flags
 */
export class FeatureFlagManager {
  private engine: DJEngine;
  private disc: FeatureFlagDisc;
  private actorId: string;

  constructor(actorId: string = 'system', actorRole?: Role) {
    this.engine = new DJEngine(actorId, actorRole);
    this.disc = new FeatureFlagDisc();
    this.actorId = actorId;
  }

  /**
   * Initialize the manager
   */
  async initialize(): Promise<void> {
    await this.disc.initialize();
    this.disc.enable(this.actorId);
  }

  /**
   * Create a new feature flag
   */
  async createFlag(
    name: string,
    options: {
      enabled?: boolean;
      rolloutPercentage?: number;
      userWhitelist?: string[];
      userBlacklist?: string[];
    } = {}
  ): Promise<void> {
    const {
      enabled = false,
      rolloutPercentage = 0,
      userWhitelist = [],
      userBlacklist = []
    } = options;

    this.disc.setFeatureFlag(name, enabled, this.actorId, {
      rolloutPercentage,
      userWhitelist,
      userBlacklist
    });
  }

  /**
   * Set rollout percentage for gradual rollout
   */
  async setRollout(name: string, percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    const features = this.disc.getAllFeatures();
    const feature = features[name];

    if (!feature) {
      throw new Error(`Feature flag "${name}" not found`);
    }

    this.disc.setFeatureFlag(name, feature.enabled, this.actorId, {
      rolloutPercentage: percentage,
      userWhitelist: feature.userWhitelist,
      userBlacklist: feature.userBlacklist
    });
  }

  /**
   * Enable a feature flag
   */
  async enableFlag(name: string): Promise<void> {
    const features = this.disc.getAllFeatures();
    const feature = features[name];

    if (!feature) {
      throw new Error(`Feature flag "${name}" not found`);
    }

    this.disc.setFeatureFlag(name, true, this.actorId, {
      rolloutPercentage: feature.rolloutPercentage,
      userWhitelist: feature.userWhitelist,
      userBlacklist: feature.userBlacklist
    });
  }

  /**
   * Disable a feature flag
   */
  async disableFlag(name: string): Promise<void> {
    const features = this.disc.getAllFeatures();
    const feature = features[name];

    if (!feature) {
      throw new Error(`Feature flag "${name}" not found`);
    }

    this.disc.setFeatureFlag(name, false, this.actorId, {
      rolloutPercentage: feature.rolloutPercentage,
      userWhitelist: feature.userWhitelist,
      userBlacklist: feature.userBlacklist
    });
  }

  /**
   * Check if a feature is enabled for a specific user
   */
  async isEnabled(featureName: string, userId: string): Promise<boolean> {
    return this.disc.isFeatureEnabled(featureName, userId);
  }

  /**
   * Add user to whitelist
   */
  async addToWhitelist(featureName: string, userId: string): Promise<void> {
    const features = this.disc.getAllFeatures();
    const feature = features[featureName];

    if (!feature) {
      throw new Error(`Feature flag "${featureName}" not found`);
    }

    const whitelist = [...feature.userWhitelist];
    if (!whitelist.includes(userId)) {
      whitelist.push(userId);
    }

    this.disc.setFeatureFlag(featureName, feature.enabled, this.actorId, {
      rolloutPercentage: feature.rolloutPercentage,
      userWhitelist: whitelist,
      userBlacklist: feature.userBlacklist
    });
  }

  /**
   * Add user to blacklist
   */
  async addToBlacklist(featureName: string, userId: string): Promise<void> {
    const features = this.disc.getAllFeatures();
    const feature = features[featureName];

    if (!feature) {
      throw new Error(`Feature flag "${featureName}" not found`);
    }

    const blacklist = [...feature.userBlacklist];
    if (!blacklist.includes(userId)) {
      blacklist.push(userId);
    }

    this.disc.setFeatureFlag(featureName, feature.enabled, this.actorId, {
      rolloutPercentage: feature.rolloutPercentage,
      userWhitelist: feature.userWhitelist,
      userBlacklist: blacklist
    });
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<Record<string, any>> {
    return this.disc.getAllFeatures();
  }

  /**
   * Get feature flag status for a user
   */
  async getStatus(featureName: string, userId: string): Promise<{
    exists: boolean;
    enabled: boolean;
    enabledForUser: boolean;
    rolloutPercentage: number;
    inWhitelist: boolean;
    inBlacklist: boolean;
  }> {
    const features = this.disc.getAllFeatures();
    const feature = features[featureName];

    if (!feature) {
      return {
        exists: false,
        enabled: false,
        enabledForUser: false,
        rolloutPercentage: 0,
        inWhitelist: false,
        inBlacklist: false
      };
    }

    let enabledForUser = false;
    try {
      enabledForUser = this.disc.isFeatureEnabled(featureName, userId);
    } catch (error) {
      // If disc throws error, default to disabled for safety
      console.error(`Error checking feature ${featureName} for user ${userId}:`, error);
    }

    const inWhitelist = feature.userWhitelist?.includes(userId) || false;
    const inBlacklist = feature.userBlacklist?.includes(userId) || false;

    return {
      exists: true,
      enabled: feature.enabled,
      enabledForUser,
      rolloutPercentage: feature.rolloutPercentage,
      inWhitelist,
      inBlacklist
    };
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(name: string): Promise<void> {
    this.disc.removeFeatureFlag(name, this.actorId);
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.disc.cleanup();
  }
}
