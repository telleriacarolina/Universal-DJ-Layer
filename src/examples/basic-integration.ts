import {
  DJControlLayer,
  Role,
  Permission,
  User,
  ThemeDisc,
  FeatureFlagDisc,
  ComplianceRule,
} from '../index';

/**
 * Example integration demonstrating how to use the DJ Control Layer
 */

// Define a custom compliance rule
const dataPrivacyRule: ComplianceRule = {
  id: 'data-privacy',
  name: 'Data Privacy Rule',
  description: 'Ensures user data is not exposed inappropriately',
  validate: async (context: any) => {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Example validation logic
    if (context.data && context.data.includePersonalData === true) {
      violations.push('Personal data cannot be included in disc configuration');
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
    };
  },
};

// Initialize the DJ Control Layer
const djLayer = new DJControlLayer({
  enableAuditLog: true,
  maxSnapshots: 50,
  enableUserIsolation: true,
  complianceRules: [dataPrivacyRule],
  hooks: {
    onBeforeChange: async (context) => {
      console.log(
        `Change requested by ${context.user.name}: ${context.action} on ${context.discId}`
      );
      return true; // Allow the change
    },
    onAfterChange: async (context) => {
      console.log(`Change completed: ${context.action} on ${context.discId}`);
    },
    onAuditLog: async (entry) => {
      console.log(`Audit log: ${entry.action} by ${entry.userName} at ${entry.timestamp}`);
    },
  },
});

// Create example users
const ownerUser: User = {
  id: 'user-001',
  name: 'Alice Owner',
  role: Role.OWNER,
};

const adminUser: User = {
  id: 'user-002',
  name: 'Bob Admin',
  role: Role.ADMIN,
};

const experimenterUser: User = {
  id: 'user-003',
  name: 'Charlie Experimenter',
  role: Role.EXPERIMENTER,
};

const viewerUser: User = {
  id: 'user-004',
  name: 'Diana Viewer',
  role: Role.VIEWER,
};

// Example usage function
async function demonstrateUsage() {
  console.log('=== DJ Control Layer Example ===\n');

  // 1. Add discs to the layer
  console.log('1. Adding discs...');
  const themeDisc = new ThemeDisc();
  const featureFlagDisc = new FeatureFlagDisc();

  await djLayer.addDisc(themeDisc, adminUser);
  await djLayer.addDisc(featureFlagDisc, adminUser);
  console.log('✓ Discs added\n');

  // 2. Enable discs
  console.log('2. Enabling discs...');
  await djLayer.enableDisc('theme-disc', experimenterUser);
  await djLayer.enableDisc('feature-flag-disc', experimenterUser);
  console.log('✓ Discs enabled\n');

  // 3. Create a snapshot before making changes
  console.log('3. Creating snapshot...');
  const snapshotId = await djLayer.createSnapshot(adminUser, 'Before theme changes');
  console.log(`✓ Snapshot created: ${snapshotId}\n`);

  // 4. Update theme configuration
  console.log('4. Updating theme configuration...');
  await djLayer.updateDiscConfig(
    'theme-disc',
    {
      primaryColor: '#ff6347',
      darkMode: true,
    },
    experimenterUser
  );
  console.log('✓ Theme updated\n');

  // 5. Set feature flags
  console.log('5. Setting feature flags...');
  const ffDisc = djLayer.getDisc('feature-flag-disc') as FeatureFlagDisc;
  ffDisc.setFeatureFlag('new-dashboard', true, experimenterUser.id, {
    rolloutPercentage: 50,
  });
  ffDisc.setFeatureFlag('beta-feature', true, experimenterUser.id, {
    userWhitelist: ['user-003'],
  });
  console.log('✓ Feature flags set\n');

  // 6. Execute discs
  console.log('6. Executing discs...');
  const themeResult = await djLayer.executeDisc('theme-disc', {}, experimenterUser);
  console.log('Theme result:', themeResult);

  const featureResult = await djLayer.executeDisc(
    'feature-flag-disc',
    {
      featureName: 'new-dashboard',
    },
    experimenterUser
  );
  console.log('Feature flag result:', featureResult);
  console.log('');

  // 7. View audit logs
  console.log('7. Viewing audit logs...');
  const logs = djLayer.getAuditLogs(adminUser);
  console.log(`Total audit logs: ${logs.length}`);
  console.log('Recent logs:');
  logs.slice(-3).forEach((log) => {
    console.log(
      `  - ${log.action} on ${log.discName} by ${log.userName} at ${log.timestamp.toISOString()}`
    );
  });
  console.log('');

  // 8. Demonstrate rollback
  console.log('8. Rolling back to snapshot...');
  await djLayer.rollbackToSnapshot(snapshotId, adminUser);
  console.log('✓ Rolled back to snapshot\n');

  // 9. Demonstrate permission checking
  console.log('9. Testing permission enforcement...');
  try {
    // This should fail - viewer doesn't have write permission
    await djLayer.updateDiscConfig('theme-disc', { primaryColor: '#000000' }, viewerUser);
  } catch (error) {
    console.log(`✓ Permission check working: ${(error as Error).message}\n`);
  }

  // 10. Export state
  console.log('10. Exporting layer state...');
  const exportedState = djLayer.exportState();
  console.log(`✓ Exported state (${exportedState.length} characters)\n`);

  console.log('=== Example Complete ===');
}

// Export the example function
export { djLayer, ownerUser, adminUser, experimenterUser, viewerUser, demonstrateUsage };

// Run the example if this file is executed directly
if (require.main === module) {
  demonstrateUsage().catch(console.error);
}
