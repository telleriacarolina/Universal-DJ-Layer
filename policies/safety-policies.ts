/**
 * Safety Policies - Prevent dangerous combinations or changes
 * 
 * Safety policies enforce rules that prevent potentially harmful
 * configurations, conflicts, or system states.
 * 
 * TODO: Implement safety policy validation with configurable rules
 */

import type { Policy, PolicyMetadata, PolicyEvaluationContext, PolicyResult } from './creator-locks';

export interface SafetyRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Rule severity */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Rule check function */
  check: (context: PolicyEvaluationContext) => boolean;
}

export interface SafetyPolicyConfig {
  /** Custom safety rules */
  customRules?: SafetyRule[];
  /** Whether to use default safety rules */
  useDefaultRules?: boolean;
  /** Severity threshold for blocking */
  blockThreshold?: 'critical' | 'high' | 'medium' | 'low';
}

export class SafetyPolicy implements Policy {
  metadata: PolicyMetadata;
  private config: SafetyPolicyConfig;
  private rules: SafetyRule[] = [];

  constructor(config: SafetyPolicyConfig = {}) {
    this.config = config;
    this.metadata = {
      policyId: this.generatePolicyId(),
      policyType: 'safety',
      createdAt: Date.now(),
      createdBy: 'system',
      priority: 900,
    };

    // Load default safety rules if enabled
    if (config.useDefaultRules !== false) {
      this.rules.push(...this.getDefaultRules());
    }

    // Add custom rules
    if (config.customRules) {
      this.rules.push(...config.customRules);
    }
  }

  /**
   * Evaluate safety policies
   */
  async evaluate(context: PolicyEvaluationContext): Promise<PolicyResult> {
    const violations: Array<{ rule: SafetyRule; reason: string }> = [];

    // Check each rule
    for (const rule of this.rules) {
      try {
        const passed = rule.check(context);
        if (!passed) {
          violations.push({
            rule,
            reason: `Safety rule "${rule.name}" failed: ${rule.description}`,
          });
        }
      } catch (error) {
        // TODO: Log rule evaluation error
        violations.push({
          rule,
          reason: `Safety rule "${rule.name}" encountered an error`,
        });
      }
    }

    // Determine if any violations should block the operation
    const blockingViolations = this.filterBlockingViolations(violations);

    if (blockingViolations.length > 0) {
      return {
        allowed: false,
        reason: blockingViolations.map(v => v.reason).join('; '),
      };
    }

    return { allowed: true };
  }

  /**
   * Validate the policy configuration
   */
  validate(): boolean {
    // Allow empty rules if explicitly configured with useDefaultRules: false
    if (this.config.useDefaultRules === false && this.rules.length === 0) {
      return true;
    }
    return this.rules.length > 0;
  }

  /**
   * Add a custom safety rule
   */
  addRule(rule: SafetyRule): void {
    // TODO: Validate rule structure
    // TODO: Add to rules array
    this.rules.push(rule);
  }

  /**
   * Remove a safety rule
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get default safety rules
   */
  private getDefaultRules(): SafetyRule[] {
    return [
      {
        id: 'no-full-permission-override',
        name: 'No Full Permission Override',
        description: 'Prevent granting full permissions to non-creator roles',
        severity: 'critical',
        check: (context) => {
          // TODO: Implement check logic
          return true;
        },
      },
      {
        id: 'no-self-privilege-escalation',
        name: 'No Self Privilege Escalation',
        description: 'Prevent users from escalating their own privileges',
        severity: 'critical',
        check: (context) => {
          // TODO: Implement check logic
          return true;
        },
      },
      {
        id: 'no-conflicting-controls',
        name: 'No Conflicting Controls',
        description: 'Prevent applying controls that conflict with existing ones',
        severity: 'high',
        check: (context) => {
          // TODO: Implement check logic
          return true;
        },
      },
      {
        id: 'no-circular-dependencies',
        name: 'No Circular Dependencies',
        description: 'Prevent circular dependencies between discs',
        severity: 'high',
        check: (context) => {
          // TODO: Implement check logic
          return true;
        },
      },
    ];
  }

  /**
   * Filter violations that should block the operation
   */
  private filterBlockingViolations(
    violations: Array<{ rule: SafetyRule; reason: string }>
  ): Array<{ rule: SafetyRule; reason: string }> {
    const threshold = this.config.blockThreshold ?? 'high';
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const thresholdIndex = severityLevels.indexOf(threshold);

    return violations.filter(v => {
      const ruleIndex = severityLevels.indexOf(v.rule.severity);
      return ruleIndex >= thresholdIndex;
    });
  }

  private generatePolicyId(): string {
    return `safety-${Date.now()}`;
  }
}
