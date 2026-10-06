import { FeatureFlagManager } from './feature-flag-manager';
import { FeatureFlagDashboard } from './dashboard';
import { Role } from '../../src/core/types';

/**
 * Feature Flags Demo - Runnable demonstration
 * Shows complete feature flag lifecycle with gradual rollout
 */
async function runDemo() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         FEATURE FLAGS DEMO - Universal DJ Layer          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Initialize manager
  const manager = new FeatureFlagManager('admin', Role.ADMIN);
  await manager.initialize();

  const dashboard = new FeatureFlagDashboard(manager);

  // Demo 1: Create feature flags
  console.log('📝 Step 1: Creating Feature Flags...\n');
  
  await manager.createFlag('new-search', {
    enabled: false,
    rolloutPercentage: 0
  });
  console.log('✅ Created "new-search" feature flag (disabled)\n');

  await manager.createFlag('dark-mode', {
    enabled: true,
    rolloutPercentage: 50
  });
  console.log('✅ Created "dark-mode" feature flag (50% rollout)\n');

  await manager.createFlag('beta-features', {
    enabled: true,
    rolloutPercentage: 100,
    userWhitelist: ['user-001', 'user-002']
  });
  console.log('✅ Created "beta-features" feature flag (whitelist only)\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Show dashboard
  await dashboard.displaySummary();
  await dashboard.displayAllFlags();

  // Demo 2: Gradual rollout
  console.log('🔄 Step 2: Demonstrating Gradual Rollout...\n');

  console.log('Enabling "new-search" feature...');
  await manager.enableFlag('new-search');
  
  console.log('Rolling out to 10% of users...');
  await manager.setRollout('new-search', 10);
  await dashboard.displayRolloutProgress('new-search');
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('Rolling out to 50% of users...');
  await manager.setRollout('new-search', 50);
  await dashboard.displayRolloutProgress('new-search');
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('Rolling out to 100% of users...');
  await manager.setRollout('new-search', 100);
  await dashboard.displayRolloutProgress('new-search');
  await new Promise(resolve => setTimeout(resolve, 500));

  // Demo 3: User targeting
  console.log('\n👥 Step 3: User Targeting...\n');

  const testUsers = [
    'user-001', 'user-002', 'user-003', 
    'user-004', 'user-005', 'user-006'
  ];

  console.log('Testing "dark-mode" (50% rollout):');
  await dashboard.testFlagForUsers('dark-mode', testUsers);

  // Add specific user to whitelist
  console.log('Adding user-006 to whitelist...');
  await manager.addToWhitelist('dark-mode', 'user-006');
  await dashboard.displayFlagStatus('dark-mode', 'user-006');

  // Demo 4: A/B Testing scenario
  console.log('🧪 Step 4: A/B Testing Scenario...\n');

  await manager.createFlag('experiment-new-ui', {
    enabled: true,
    rolloutPercentage: 50
  });

  console.log('Testing 50/50 split for UI experiment:');
  const experimentUsers = Array.from({ length: 20 }, (_, i) => `user-${String(i).padStart(3, '0')}`);
  await dashboard.testFlagForUsers('experiment-new-ui', experimentUsers);

  // Demo 5: Check individual user status
  console.log('🔍 Step 5: Individual User Checks...\n');

  await dashboard.displayFlagStatus('new-search', 'user-001');
  await dashboard.displayFlagStatus('beta-features', 'user-001');
  await dashboard.displayFlagStatus('beta-features', 'user-999');

  // Final summary
  console.log('📊 Final Summary:');
  await dashboard.displaySummary();
  await dashboard.displayAllFlags();

  // Cleanup
  await manager.cleanup();

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                   DEMO COMPLETED                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

// Run the demo
if (require.main === module) {
  runDemo().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  });
}

export { runDemo };
