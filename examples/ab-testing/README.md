# A/B Testing Example

A complete A/B testing framework with variant assignment, traffic splitting, metric tracking, and statistical analysis.

## Features

- 🎯 **Variant Assignment**: Deterministic user-to-variant assignment
- 📊 **Traffic Splitting**: Flexible weight-based traffic allocation
- 🎨 **Multi-Variant Tests**: Support for A/B/C/D/... testing
- 📈 **Metrics Tracking**: Track conversion, engagement, and custom metrics
- 🔍 **User Targeting**: Run experiments for specific user segments
- 📉 **Statistical Analysis**: Conversion rates and performance comparisons
- ⚡ **Real-Time Results**: Monitor experiment performance live
- 🔄 **Experiment Lifecycle**: Draft, running, paused, completed states

## Usage

### Basic Setup

```typescript
import { ABTestingFramework } from './examples/ab-testing';

const framework = new ABTestingFramework();
await framework.initialize();
```

### Creating Experiments

```typescript
// Simple A/B test (50/50 split)
const experiment = await framework.createExperiment(
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

// Multi-variant test
const multiTest = await framework.createExperiment(
  'Pricing Page Test',
  'Test different layouts',
  [
    { name: 'Grid Layout', weight: 25 },
    { name: 'List Layout', weight: 25 },
    { name: 'Card Layout', weight: 25 },
    { name: 'Table Layout', weight: 25 }
  ]
);

// Uneven traffic split (80/20)
const cautiousTest = await framework.createExperiment(
  'New Algorithm Test',
  'Test new algorithm with limited traffic',
  [
    { name: 'Current', weight: 80 },
    { name: 'New', weight: 20 }
  ]
);
```

### Starting and Managing Experiments

```typescript
// Start experiment
await framework.startExperiment(experiment.id);

// Pause experiment
await framework.pauseExperiment(experiment.id);

// Complete experiment
await framework.completeExperiment(experiment.id);
```

### Assigning Users to Variants

```typescript
// Assign user to experiment
const assignment = await framework.assignVariant(
  experiment.id,
  'user-123'
);

// Get user's variant
const variant = await framework.getVariant(experiment.id, 'user-123');

if (variant.name === 'Control (Blue)') {
  // Show blue button
} else {
  // Show green button
}
```

### Tracking Metrics

```typescript
// Track click event
await framework.trackEvent(
  experiment.id,
  'user-123',
  'clicks',
  1
);

// Track conversion
await framework.trackEvent(
  experiment.id,
  'user-123',
  'conversions',
  1
);

// Track custom metric with value
await framework.trackEvent(
  experiment.id,
  'user-123',
  'revenue',
  49.99,
  { currency: 'USD', product: 'premium' }
);
```

### Analyzing Results

```typescript
// Get experiment results
const results = await framework.getResults(experiment.id);

console.log(`Total Participants: ${results.totalParticipants}`);

results.variants.forEach(variant => {
  console.log(`${variant.variantName}:`);
  console.log(`  Participants: ${variant.participants}`);
  
  Object.entries(variant.metrics).forEach(([metric, stats]) => {
    console.log(`  ${metric}:`);
    console.log(`    Conversion Rate: ${stats.conversionRate}%`);
    console.log(`    Average: ${stats.mean}`);
  });
});
```

### User Targeting

```typescript
// Create targeted experiment
const targetedExp = await framework.createExperiment(
  'Premium Feature Test',
  'Test new feature with premium users only',
  [
    { name: 'Control', weight: 50 },
    { name: 'With Feature', weight: 50 }
  ],
  {
    targetingRules: [
      { attribute: 'tier', operator: 'equals', value: 'premium' }
    ]
  }
);

// Assign with user attributes
await framework.assignVariant(
  targetedExp.id,
  'user-123',
  { tier: 'premium', country: 'US' }
);
```

## Running the Demo

```bash
# Compile TypeScript
npm run build

# Run the demo
node dist/examples/ab-testing/demo.js
```

Or with ts-node:

```bash
npx ts-node examples/ab-testing/demo.ts
```

## Demo Output

The demo demonstrates:

1. **Simple A/B Test**: 50/50 traffic split between two variants
2. **Multi-Variant Test**: A/B/C/D testing with equal traffic distribution
3. **Uneven Traffic Split**: 80/20 split for cautious rollouts
4. **User Assignment**: Assigning users to variants
5. **Consistent Assignment**: Same user always gets same variant
6. **Event Tracking**: Recording user interactions and conversions
7. **Results Analysis**: Statistical analysis and conversion rates
8. **Targeted Experiments**: User segmentation and targeting rules
9. **Experiment Lifecycle**: Managing experiment states
10. **Dashboard View**: Overview of all experiments
11. **Performance Comparison**: Variant performance and lift calculations

## Integration Example

### Express.js Integration

```typescript
import express from 'express';
import { ABTestingFramework } from 'universal-dj-layer/examples/ab-testing';

const app = express();
const abTesting = new ABTestingFramework();

// Middleware to assign variants
app.use(async (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) return next();

  // Get running experiments
  const experiments = abTesting.getRunningExperiments();

  for (const experiment of experiments) {
    const assignment = await abTesting.assignVariant(
      experiment.id,
      userId
    );
    
    // Store in request context
    req.experiments = req.experiments || {};
    req.experiments[experiment.id] = assignment.variantId;
  }

  next();
});

// Use variant in route
app.get('/checkout', async (req, res) => {
  const userId = req.user.id;
  const variant = await abTesting.getVariant('checkout-flow-test', userId);

  if (variant?.name === 'One-Step Checkout') {
    res.render('checkout-onestep');
  } else {
    res.render('checkout-multistep');
  }
});

// Track conversion
app.post('/api/purchase', async (req, res) => {
  const userId = req.user.id;
  
  // Track conversion in all active experiments
  const experiments = abTesting.getRunningExperiments();
  for (const experiment of experiments) {
    await abTesting.trackEvent(
      experiment.id,
      userId,
      'purchase',
      req.body.amount
    );
  }

  res.json({ success: true });
});

// Admin endpoints
app.get('/api/admin/experiments', async (req, res) => {
  const experiments = abTesting.getAllExperiments();
  res.json({ experiments });
});

app.get('/api/admin/experiments/:id/results', async (req, res) => {
  const results = await abTesting.getResults(req.params.id);
  res.json(results);
});
```

### React Integration

```typescript
import { useState, useEffect } from 'react';
import { ABTestingFramework } from 'universal-dj-layer/examples/ab-testing';

export function useExperiment(experimentId: string, userId: string) {
  const [variant, setVariant] = useState(null);
  const [framework] = useState(() => new ABTestingFramework());

  useEffect(() => {
    framework.initialize().then(async () => {
      const assignment = await framework.assignVariant(experimentId, userId);
      const v = await framework.getVariant(experimentId, userId);
      setVariant(v);
    });
  }, [experimentId, userId]);

  const trackEvent = async (metric: string, value: number = 1) => {
    await framework.trackEvent(experimentId, userId, metric, value);
  };

  return { variant, trackEvent };
}

// Usage in component
function CheckoutButton() {
  const userId = useUser().id;
  const { variant, trackEvent } = useExperiment('button-color-test', userId);

  const buttonColor = variant?.name === 'Control (Blue)' ? 'blue' : 'green';

  return (
    <button
      style={{ backgroundColor: buttonColor }}
      onClick={() => {
        trackEvent('clicks');
        // Handle checkout...
      }}
    >
      Checkout
    </button>
  );
}
```

### Analytics Integration

```typescript
import { ABTestingFramework } from 'universal-dj-layer/examples/ab-testing';

class AnalyticsDashboard {
  private framework: ABTestingFramework;

  async generateReport(experimentId: string) {
    const results = await this.framework.getResults(experimentId);
    const experiment = this.framework.getExperiment(experimentId);

    // Calculate statistical significance
    const [control, ...variants] = results.variants;

    return {
      experiment: experiment?.name,
      duration: this.calculateDuration(experiment),
      participants: results.totalParticipants,
      variants: variants.map(v => {
        const controlConversion = control.metrics.conversions?.conversionRate || 0;
        const variantConversion = v.metrics.conversions?.conversionRate || 0;
        const lift = ((variantConversion - controlConversion) / controlConversion) * 100;

        return {
          name: v.variantName,
          participants: v.participants,
          conversionRate: variantConversion,
          lift,
          isWinner: variantConversion > controlConversion
        };
      })
    };
  }

  private calculateDuration(experiment: any): number {
    const start = experiment.startDate.getTime();
    const end = experiment.endDate?.getTime() || Date.now();
    return Math.floor((end - start) / (1000 * 60 * 60 * 24)); // days
  }
}
```

## API Reference

### ABTestingFramework

#### Methods

- `initialize()`: Initialize the framework
- `createExperiment(name, description, variants, options?)`: Create a new experiment
- `startExperiment(experimentId)`: Start an experiment
- `pauseExperiment(experimentId)`: Pause an experiment
- `completeExperiment(experimentId)`: Complete an experiment
- `assignVariant(experimentId, userId, userAttributes?)`: Assign user to variant
- `getVariant(experimentId, userId)`: Get user's assigned variant
- `trackEvent(experimentId, userId, metric, value?, metadata?)`: Track a metric event
- `getResults(experimentId)`: Get experiment results and statistics
- `getExperiment(experimentId)`: Get experiment by ID
- `getAllExperiments()`: Get all experiments
- `getRunningExperiments()`: Get running experiments
- `cleanup()`: Cleanup resources

### Interfaces

```typescript
interface Variant {
  id: string;
  name: string;
  weight: number;
  config?: Record<string, any>;
}

interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
  startDate: Date;
  endDate?: Date;
  targetingRules?: TargetingRule[];
  metrics: string[];
  status: ExperimentStatus;
}

interface MetricStats {
  count: number;
  sum: number;
  mean: number;
  min: number;
  max: number;
  conversionRate?: number;
}

enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed'
}
```

## Best Practices

1. **Statistical Significance**: Run experiments until statistically significant
2. **Sample Size**: Ensure adequate sample size for each variant
3. **Consistent Assignment**: Users always see the same variant
4. **Track Key Metrics**: Focus on business-critical metrics
5. **Gradual Rollout**: Use uneven splits for risky changes (95/5)
6. **Segment Testing**: Use targeting rules to test specific user groups
7. **Document Learnings**: Record insights from each experiment

## Common Patterns

### Gradual Feature Rollout

```typescript
// Week 1: 95/5 split
await framework.createExperiment('New Feature', 'Test new feature', [
  { name: 'Control', weight: 95 },
  { name: 'New Feature', weight: 5 }
]);

// Week 2: 90/10 split (create new experiment)
// Week 3: 80/20 split
// Week 4: 50/50 split
// Week 5: Full rollout
```

### Multi-Stage Funnel Testing

```typescript
// Test each funnel step
await framework.trackEvent(expId, userId, 'viewed_landing');
await framework.trackEvent(expId, userId, 'clicked_cta');
await framework.trackEvent(expId, userId, 'started_signup');
await framework.trackEvent(expId, userId, 'completed_signup');
```

### Winner Selection

```typescript
const results = await framework.getResults(experimentId);
const winner = results.variants.reduce((best, current) => {
  const bestConv = best.metrics.conversions?.conversionRate || 0;
  const currentConv = current.metrics.conversions?.conversionRate || 0;
  return currentConv > bestConv ? current : best;
});

console.log(`Winner: ${winner.variantName}`);
```

## Related Examples

- [Feature Flags](../feature-flags/README.md) - Feature toggle management
- [Approval Workflow](../approval-workflow/README.md) - Experiment approval process
- [Permission Manager](../permission-manager/README.md) - Experiment access control

## Architecture

This example demonstrates:
- **Deterministic Assignment**: Consistent user-to-variant mapping
- **Statistical Analysis**: Conversion rate and performance metrics
- **Lifecycle Management**: Complete experiment workflow
- **Event Tracking**: Metric collection and aggregation

## Learn More

- [Getting Started Guide](../../docs/GETTING_STARTED.md)
- [Disc Development Guide](../../docs/DISC_DEVELOPMENT.md)
- [API Reference](../../docs/API.md)
