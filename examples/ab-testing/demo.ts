import { ABTestingFramework, ExperimentStatus } from './ab-testing-framework';

/**
 * Demo: A/B Testing Framework
 */
async function runDemo() {
  console.log('='.repeat(80));
  console.log('Universal DJ Layer - A/B Testing Framework Demo');
  console.log('='.repeat(80));
  console.log();

  const framework = new ABTestingFramework();
  await framework.initialize();

  // Demo 1: Create Simple A/B Test
  console.log('📋 Demo 1: Create Simple A/B Test (50/50 Split)');
  console.log('-'.repeat(80));

  const buttonColorTest = await framework.createExperiment(
    'Button Color Test',
    'Test if blue or green button performs better',
    [
      { name: 'Control (Blue)', weight: 50 },
      { name: 'Variant (Green)', weight: 50 }
    ],
    {
      metrics: ['clicks', 'conversions']
    }
  );

  console.log(`✓ Created experiment: ${buttonColorTest.id}`);
  console.log(`  Name: ${buttonColorTest.name}`);
  console.log(`  Status: ${buttonColorTest.status}`);
  console.log(`  Variants:`);
  buttonColorTest.variants.forEach(v => {
    console.log(`    - ${v.name} (${v.weight}%)`);
  });
  console.log();

  await framework.startExperiment(buttonColorTest.id);
  console.log(`✓ Started experiment`);
  console.log();

  // Demo 2: Multi-Variant Test
  console.log('📋 Demo 2: Multi-Variant Test (A/B/C/D)');
  console.log('-'.repeat(80));

  const pricingTest = await framework.createExperiment(
    'Pricing Page Test',
    'Test different pricing page layouts',
    [
      { name: 'Original', weight: 25, config: { layout: 'grid' } },
      { name: 'Variant A', weight: 25, config: { layout: 'list' } },
      { name: 'Variant B', weight: 25, config: { layout: 'cards' } },
      { name: 'Variant C', weight: 25, config: { layout: 'comparison' } }
    ],
    {
      metrics: ['pageViews', 'signups', 'purchases']
    }
  );

  console.log(`✓ Created multi-variant experiment: ${pricingTest.id}`);
  console.log(`  Variants: ${pricingTest.variants.length}`);
  pricingTest.variants.forEach(v => {
    console.log(`    - ${v.name} (${v.weight}%) - Layout: ${v.config?.layout}`);
  });
  console.log();

  await framework.startExperiment(pricingTest.id);
  console.log(`✓ Started experiment`);
  console.log();

  // Demo 3: Traffic Allocation
  console.log('📋 Demo 3: Uneven Traffic Split (80/20)');
  console.log('-'.repeat(80));

  const experimentalFeature = await framework.createExperiment(
    'New Search Algorithm',
    'Test new search algorithm with limited traffic',
    [
      { name: 'Current Algorithm', weight: 80 },
      { name: 'New Algorithm', weight: 20 }
    ],
    {
      metrics: ['searches', 'clickThroughRate', 'satisfaction']
    }
  );

  console.log(`✓ Created experiment with uneven split: ${experimentalFeature.id}`);
  experimentalFeature.variants.forEach(v => {
    console.log(`    - ${v.name}: ${v.weight}% of traffic`);
  });
  console.log();

  await framework.startExperiment(experimentalFeature.id);

  // Demo 4: User Assignment
  console.log('📋 Demo 4: User Assignment and Variant Retrieval');
  console.log('-'.repeat(80));

  const users = ['user-001', 'user-002', 'user-003', 'user-004', 'user-005'];
  
  console.log(`Assigning ${users.length} users to button color test:`);
  for (const userId of users) {
    const assignment = await framework.assignVariant(buttonColorTest.id, userId);
    const variant = await framework.getVariant(buttonColorTest.id, userId);
    console.log(`  ${userId} → ${variant?.name}`);
  }
  console.log();

  // Demo 5: Consistent Assignment
  console.log('📋 Demo 5: Consistent User Assignment');
  console.log('-'.repeat(80));

  const userId = 'user-001';
  const assignment1 = await framework.assignVariant(buttonColorTest.id, userId);
  const assignment2 = await framework.assignVariant(buttonColorTest.id, userId);

  console.log(`First assignment: ${assignment1.variantId}`);
  console.log(`Second assignment: ${assignment2.variantId}`);
  console.log(`Consistent: ${assignment1.variantId === assignment2.variantId ? '✓' : '✗'}`);
  console.log();

  // Demo 6: Tracking Events
  console.log('📋 Demo 6: Track Experiment Events');
  console.log('-'.repeat(80));

  // Simulate user interactions
  const interactions = [
    { userId: 'user-001', metric: 'clicks', value: 1 },
    { userId: 'user-001', metric: 'conversions', value: 1 },
    { userId: 'user-002', metric: 'clicks', value: 1 },
    { userId: 'user-003', metric: 'clicks', value: 1 },
    { userId: 'user-003', metric: 'conversions', value: 1 },
    { userId: 'user-004', metric: 'clicks', value: 1 },
    { userId: 'user-005', metric: 'clicks', value: 1 },
    { userId: 'user-005', metric: 'conversions', value: 1 }
  ];

  console.log(`Tracking ${interactions.length} events...`);
  for (const interaction of interactions) {
    await framework.trackEvent(
      buttonColorTest.id,
      interaction.userId,
      interaction.metric,
      interaction.value
    );
  }
  console.log(`✓ Tracked all events`);
  console.log();

  // Demo 7: Experiment Results
  console.log('📋 Demo 7: Experiment Results and Analysis');
  console.log('-'.repeat(80));

  const results = await framework.getResults(buttonColorTest.id);
  
  console.log(`Experiment: ${results.experimentName}`);
  console.log(`Total Participants: ${results.totalParticipants}`);
  console.log(`Started: ${results.startDate.toLocaleString()}`);
  console.log();

  console.log(`Results by Variant:`);
  console.log();

  results.variants.forEach(variant => {
    console.log(`  ${variant.variantName}:`);
    console.log(`    Participants: ${variant.participants}`);
    
    Object.entries(variant.metrics).forEach(([metric, stats]) => {
      console.log(`    ${metric}:`);
      console.log(`      Count: ${stats.count}`);
      console.log(`      Total: ${stats.sum}`);
      console.log(`      Average: ${stats.mean.toFixed(2)}`);
      console.log(`      Conversion Rate: ${stats.conversionRate?.toFixed(2)}%`);
    });
    console.log();
  });

  // Demo 8: Targeted Experiment
  console.log('📋 Demo 8: Targeted Experiment (User Segmentation)');
  console.log('-'.repeat(80));

  const premiumFeatureTest = await framework.createExperiment(
    'Premium Feature Test',
    'Test premium feature with premium users only',
    [
      { name: 'Without Feature', weight: 50 },
      { name: 'With Feature', weight: 50 }
    ],
    {
      targetingRules: [
        { attribute: 'tier', operator: 'equals', value: 'premium' }
      ],
      metrics: ['usage', 'satisfaction']
    }
  );

  console.log(`✓ Created targeted experiment: ${premiumFeatureTest.id}`);
  console.log(`  Targeting: Premium users only`);
  console.log();

  await framework.startExperiment(premiumFeatureTest.id);

  // Try to assign users
  try {
    await framework.assignVariant(
      premiumFeatureTest.id,
      'free-user-001',
      { tier: 'free' }
    );
    console.log(`✗ Should not reach here`);
  } catch (error) {
    console.log(`✓ Free user rejected: ${(error as Error).message}`);
  }

  const premiumAssignment = await framework.assignVariant(
    premiumFeatureTest.id,
    'premium-user-001',
    { tier: 'premium' }
  );
  console.log(`✓ Premium user assigned: ${premiumAssignment.variantId}`);
  console.log();

  // Demo 9: Experiment Lifecycle
  console.log('📋 Demo 9: Experiment Lifecycle Management');
  console.log('-'.repeat(80));

  const lifecycleTest = await framework.createExperiment(
    'Lifecycle Demo',
    'Demonstrate experiment lifecycle',
    [
      { name: 'Control', weight: 50 },
      { name: 'Treatment', weight: 50 }
    ]
  );

  console.log(`Created: ${lifecycleTest.id} (Status: ${lifecycleTest.status})`);

  await framework.startExperiment(lifecycleTest.id);
  const running = framework.getExperiment(lifecycleTest.id);
  console.log(`Started (Status: ${running?.status})`);

  await framework.pauseExperiment(lifecycleTest.id);
  const paused = framework.getExperiment(lifecycleTest.id);
  console.log(`Paused (Status: ${paused?.status})`);

  await framework.completeExperiment(lifecycleTest.id);
  const completed = framework.getExperiment(lifecycleTest.id);
  console.log(`Completed (Status: ${completed?.status})`);
  console.log();

  // Demo 10: Dashboard View
  console.log('📋 Demo 10: Experiment Dashboard');
  console.log('-'.repeat(80));

  const allExperiments = framework.getAllExperiments();
  const runningExperiments = framework.getRunningExperiments();

  console.log(`Total Experiments: ${allExperiments.length}`);
  console.log(`Running Experiments: ${runningExperiments.length}`);
  console.log();

  console.log(`Experiment Status Summary:`);
  const statusCounts: Record<string, number> = {};
  allExperiments.forEach(exp => {
    statusCounts[exp.status] = (statusCounts[exp.status] || 0) + 1;
  });
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  console.log();

  console.log(`Running Experiments:`);
  runningExperiments.forEach(exp => {
    console.log(`  - ${exp.name} (${exp.id})`);
    console.log(`    Variants: ${exp.variants.length}`);
    console.log(`    Started: ${exp.startDate.toLocaleString()}`);
  });
  console.log();

  // Demo 11: Statistical Comparison
  console.log('📋 Demo 11: Variant Performance Comparison');
  console.log('-'.repeat(80));

  const comparisonResults = await framework.getResults(buttonColorTest.id);
  
  console.log(`Comparing variants for: ${comparisonResults.experimentName}`);
  console.log();

  const variants = comparisonResults.variants;
  if (variants.length >= 2) {
    const control = variants[0];
    const variant = variants[1];

    console.log(`Control: ${control.variantName}`);
    console.log(`  Participants: ${control.participants}`);
    console.log(`  Click Rate: ${control.metrics.clicks?.conversionRate?.toFixed(2)}%`);
    console.log(`  Conversion Rate: ${control.metrics.conversions?.conversionRate?.toFixed(2)}%`);
    console.log();

    console.log(`Variant: ${variant.variantName}`);
    console.log(`  Participants: ${variant.participants}`);
    console.log(`  Click Rate: ${variant.metrics.clicks?.conversionRate?.toFixed(2)}%`);
    console.log(`  Conversion Rate: ${variant.metrics.conversions?.conversionRate?.toFixed(2)}%`);
    console.log();

    const clickLift = ((variant.metrics.clicks?.conversionRate || 0) - 
                       (control.metrics.clicks?.conversionRate || 0)) /
                      (control.metrics.clicks?.conversionRate || 1) * 100;
    
    const conversionLift = ((variant.metrics.conversions?.conversionRate || 0) - 
                            (control.metrics.conversions?.conversionRate || 0)) /
                           (control.metrics.conversions?.conversionRate || 1) * 100;

    console.log(`Performance Lift:`);
    console.log(`  Click Rate: ${clickLift >= 0 ? '+' : ''}${clickLift.toFixed(2)}%`);
    console.log(`  Conversion Rate: ${conversionLift >= 0 ? '+' : ''}${conversionLift.toFixed(2)}%`);
  }
  console.log();

  // Cleanup
  await framework.cleanup();

  console.log('='.repeat(80));
  console.log('Demo completed successfully!');
  console.log('='.repeat(80));
}

// Run the demo
runDemo().catch(console.error);
