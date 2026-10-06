import { FeatureFlagManager } from './feature-flag-manager';

/**
 * Simple CLI Dashboard for Feature Flags
 * Provides a text-based interface for monitoring and managing feature flags
 */
export class FeatureFlagDashboard {
  private manager: FeatureFlagManager;

  constructor(manager: FeatureFlagManager) {
    this.manager = manager;
  }

  /**
   * Display all feature flags in a formatted table
   */
  async displayAllFlags(): Promise<void> {
    const flags = await this.manager.getAllFlags();
    const flagNames = Object.keys(flags);

    if (flagNames.length === 0) {
      console.log('\n📭 No feature flags found.\n');
      return;
    }

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║              FEATURE FLAGS DASHBOARD                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    for (const name of flagNames) {
      const flag = flags[name];
      const status = flag.enabled ? '🟢 ENABLED ' : '🔴 DISABLED';
      const rollout = flag.rolloutPercentage;

      console.log(`┌─ ${name}`);
      console.log(`│  Status: ${status}`);
      console.log(`│  Rollout: ${rollout}%`);
      
      if (flag.userWhitelist && flag.userWhitelist.length > 0) {
        console.log(`│  Whitelist: ${flag.userWhitelist.length} user(s)`);
      }
      
      if (flag.userBlacklist && flag.userBlacklist.length > 0) {
        console.log(`│  Blacklist: ${flag.userBlacklist.length} user(s)`);
      }
      
      console.log(`│  Created: ${new Date(flag.createdAt).toLocaleString()}`);
      console.log(`│  Created By: ${flag.createdBy}`);
      console.log('└─');
      console.log('');
    }
  }

  /**
   * Display detailed status for a specific feature flag and user
   */
  async displayFlagStatus(featureName: string, userId: string): Promise<void> {
    const status = await this.manager.getStatus(featureName, userId);

    if (!status.exists) {
      console.log(`\n❌ Feature flag "${featureName}" not found.\n`);
      return;
    }

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log(`║  Feature: ${featureName.padEnd(46)} ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`User ID: ${userId}`);
    console.log(`Global Status: ${status.enabled ? '🟢 ENABLED' : '🔴 DISABLED'}`);
    console.log(`User Status: ${status.enabledForUser ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`Rollout: ${status.rolloutPercentage}%`);
    
    if (status.inWhitelist) {
      console.log('👤 User is in WHITELIST');
    }
    
    if (status.inBlacklist) {
      console.log('🚫 User is in BLACKLIST');
    }
    
    console.log('');
  }

  /**
   * Display rollout progress with visual bar
   */
  async displayRolloutProgress(featureName: string): Promise<void> {
    const flags = await this.manager.getAllFlags();
    const flag = flags[featureName];

    if (!flag) {
      console.log(`\n❌ Feature flag "${featureName}" not found.\n`);
      return;
    }

    const percentage = flag.rolloutPercentage;
    const barLength = 50;
    const filledLength = Math.floor((percentage / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log(`║  Rollout Progress: ${featureName.padEnd(34)} ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`[${bar}] ${percentage}%`);
    console.log('');
  }

  /**
   * Display a summary of all flags
   */
  async displaySummary(): Promise<void> {
    const flags = await this.manager.getAllFlags();
    const flagNames = Object.keys(flags);

    const enabledCount = flagNames.filter(name => flags[name].enabled).length;
    const disabledCount = flagNames.length - enabledCount;
    const fullRolloutCount = flagNames.filter(name => 
      flags[name].enabled && flags[name].rolloutPercentage === 100
    ).length;
    const partialRolloutCount = flagNames.filter(name => 
      flags[name].enabled && flags[name].rolloutPercentage > 0 && flags[name].rolloutPercentage < 100
    ).length;

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║              FEATURE FLAGS SUMMARY                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Total Flags: ${flagNames.length}`);
    console.log(`🟢 Enabled: ${enabledCount}`);
    console.log(`🔴 Disabled: ${disabledCount}`);
    console.log(`✅ Full Rollout: ${fullRolloutCount}`);
    console.log(`🔄 Partial Rollout: ${partialRolloutCount}`);
    console.log('');
  }

  /**
   * Test feature flag for multiple users
   */
  async testFlagForUsers(featureName: string, userIds: string[]): Promise<void> {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log(`║  Testing: ${featureName.padEnd(45)} ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    let enabledCount = 0;

    for (const userId of userIds) {
      const enabled = await this.manager.isEnabled(featureName, userId);
      const icon = enabled ? '✅' : '❌';
      console.log(`${icon} ${userId}: ${enabled ? 'ENABLED' : 'DISABLED'}`);
      
      if (enabled) enabledCount++;
    }

    const percentage = Math.round((enabledCount / userIds.length) * 100);
    console.log(`\n📈 Enabled for ${enabledCount}/${userIds.length} users (${percentage}%)\n`);
  }
}
