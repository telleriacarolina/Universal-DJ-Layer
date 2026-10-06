/**
 * Experiment variant
 */
export interface Variant {
  id: string;
  name: string;
  weight: number;
  config?: Record<string, any>;
}

/**
 * Experiment definition
 */
export interface Experiment {
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

/**
 * Experiment status
 */
export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed'
}

/**
 * Targeting rule
 */
export interface TargetingRule {
  attribute: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  value: any;
}

/**
 * User assignment to variant
 */
export interface Assignment {
  experimentId: string;
  userId: string;
  variantId: string;
  assignedAt: Date;
}

/**
 * Metric event
 */
export interface MetricEvent {
  experimentId: string;
  userId: string;
  variantId: string;
  metric: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Experiment results
 */
export interface ExperimentResults {
  experimentId: string;
  experimentName: string;
  variants: VariantResults[];
  totalParticipants: number;
  startDate: Date;
  endDate?: Date;
}

/**
 * Results for a single variant
 */
export interface VariantResults {
  variantId: string;
  variantName: string;
  participants: number;
  metrics: Record<string, MetricStats>;
}

/**
 * Statistics for a metric
 */
export interface MetricStats {
  count: number;
  sum: number;
  mean: number;
  min: number;
  max: number;
  conversionRate?: number;
}

/**
 * A/B Testing Framework
 */
export class ABTestingFramework {
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, Assignment> = new Map();
  private events: MetricEvent[] = [];
  private experimentCounter = 0;

  /**
   * Initialize the framework
   */
  async initialize(): Promise<void> {
    console.log('A/B Testing Framework initialized');
  }

  /**
   * Create a new experiment
   */
  async createExperiment(
    name: string,
    description: string,
    variants: Omit<Variant, 'id'>[],
    options?: {
      startDate?: Date;
      endDate?: Date;
      targetingRules?: TargetingRule[];
      metrics?: string[];
    }
  ): Promise<Experiment> {
    // Validate variant weights
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error(`Variant weights must sum to 100, got ${totalWeight}`);
    }

    const experiment: Experiment = {
      id: `EXP-${++this.experimentCounter}`,
      name,
      description,
      variants: variants.map((v, i) => ({
        id: `VAR-${this.experimentCounter}-${i + 1}`,
        ...v
      })),
      startDate: options?.startDate || new Date(),
      endDate: options?.endDate,
      targetingRules: options?.targetingRules,
      metrics: options?.metrics || [],
      status: ExperimentStatus.DRAFT
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  /**
   * Start an experiment
   */
  async startExperiment(experimentId: string): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (experiment.status === ExperimentStatus.RUNNING) {
      throw new Error('Experiment is already running');
    }

    experiment.status = ExperimentStatus.RUNNING;
    experiment.startDate = new Date();
  }

  /**
   * Pause an experiment
   */
  async pauseExperiment(experimentId: string): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    experiment.status = ExperimentStatus.PAUSED;
  }

  /**
   * Complete an experiment
   */
  async completeExperiment(experimentId: string): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    experiment.status = ExperimentStatus.COMPLETED;
    experiment.endDate = new Date();
  }

  /**
   * Assign a user to a variant
   */
  async assignVariant(
    experimentId: string,
    userId: string,
    userAttributes?: Record<string, any>
  ): Promise<Assignment> {
    const experiment = this.experiments.get(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    if (experiment.status !== ExperimentStatus.RUNNING) {
      throw new Error('Experiment is not running');
    }

    // Check if user is already assigned
    const existingKey = `${experimentId}-${userId}`;
    const existing = this.assignments.get(existingKey);
    if (existing) {
      return existing;
    }

    // Check targeting rules
    if (experiment.targetingRules && experiment.targetingRules.length > 0) {
      const matches = this.matchesTargeting(userAttributes || {}, experiment.targetingRules);
      if (!matches) {
        throw new Error('User does not match targeting rules');
      }
    }

    // Select variant based on weights
    const variantId = this.selectVariant(experiment.variants, userId);

    const assignment: Assignment = {
      experimentId,
      userId,
      variantId,
      assignedAt: new Date()
    };

    this.assignments.set(existingKey, assignment);
    return assignment;
  }

  /**
   * Get variant for a user
   */
  async getVariant(experimentId: string, userId: string): Promise<Variant | null> {
    const key = `${experimentId}-${userId}`;
    const assignment = this.assignments.get(key);
    
    if (!assignment) {
      return null;
    }

    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return null;
    }

    return experiment.variants.find(v => v.id === assignment.variantId) || null;
  }

  /**
   * Track a metric event
   */
  async trackEvent(
    experimentId: string,
    userId: string,
    metric: string,
    value: number = 1,
    metadata?: Record<string, any>
  ): Promise<void> {
    const assignment = this.assignments.get(`${experimentId}-${userId}`);
    
    if (!assignment) {
      throw new Error('User not assigned to experiment');
    }

    const event: MetricEvent = {
      experimentId,
      userId,
      variantId: assignment.variantId,
      metric,
      value,
      timestamp: new Date(),
      metadata
    };

    this.events.push(event);
  }

  /**
   * Get experiment results
   */
  async getResults(experimentId: string): Promise<ExperimentResults> {
    const experiment = this.experiments.get(experimentId);
    
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const assignments = Array.from(this.assignments.values())
      .filter(a => a.experimentId === experimentId);

    const variantResults: VariantResults[] = experiment.variants.map(variant => {
      const variantAssignments = assignments.filter(a => a.variantId === variant.id);
      const variantEvents = this.events.filter(e => 
        e.experimentId === experimentId && e.variantId === variant.id
      );

      const metrics: Record<string, MetricStats> = {};

      // Group events by metric
      const metricGroups = this.groupBy(variantEvents, e => e.metric);

      for (const [metric, events] of Object.entries(metricGroups)) {
        const values = events.map(e => e.value);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = values.length > 0 ? sum / values.length : 0;

        metrics[metric] = {
          count: events.length,
          sum,
          mean,
          min: values.length > 0 ? Math.min(...values) : 0,
          max: values.length > 0 ? Math.max(...values) : 0,
          conversionRate: variantAssignments.length > 0 
            ? (events.length / variantAssignments.length) * 100 
            : 0
        };
      }

      return {
        variantId: variant.id,
        variantName: variant.name,
        participants: variantAssignments.length,
        metrics
      };
    });

    return {
      experimentId: experiment.id,
      experimentName: experiment.name,
      variants: variantResults,
      totalParticipants: assignments.length,
      startDate: experiment.startDate,
      endDate: experiment.endDate
    };
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * Get all experiments
   */
  getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Get running experiments
   */
  getRunningExperiments(): Experiment[] {
    return this.getAllExperiments().filter(e => e.status === ExperimentStatus.RUNNING);
  }

  /**
   * Select variant based on weights using deterministic hashing
   */
  private selectVariant(variants: Variant[], userId: string): string {
    // Use hash of userId for deterministic assignment
    const hash = this.hashString(userId);
    const normalized = (hash % 10000) / 100; // 0-100 range

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight;
      if (normalized < cumulative) {
        return variant.id;
      }
    }

    // Fallback to first variant
    return variants[0].id;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if user matches targeting rules
   */
  private matchesTargeting(
    attributes: Record<string, any>,
    rules: TargetingRule[]
  ): boolean {
    return rules.every(rule => {
      const value = attributes[rule.attribute];

      switch (rule.operator) {
        case 'equals':
          return value === rule.value;
        case 'notEquals':
          return value !== rule.value;
        case 'contains':
          return Array.isArray(value) && value.includes(rule.value);
        case 'greaterThan':
          return value > rule.value;
        case 'lessThan':
          return value < rule.value;
        default:
          return false;
      }
    });
  }

  /**
   * Group array by key function
   */
  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((result, item) => {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.experiments.clear();
    this.assignments.clear();
    this.events = [];
    console.log('A/B Testing Framework cleaned up');
  }
}
