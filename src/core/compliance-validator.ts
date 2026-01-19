import { ComplianceRule, ComplianceResult } from './types';

/**
 * Compliance validation system
 */
export class ComplianceValidator {
  private rules: Map<string, ComplianceRule> = new Map();

  /**
   * Add a compliance rule
   */
  addRule(rule: ComplianceRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a compliance rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get a compliance rule
   */
  getRule(ruleId: string): ComplianceRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all compliance rules
   */
  getAllRules(): ComplianceRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Validate against all rules
   */
  async validateAll(context: any): Promise<ComplianceResult> {
    const results = await Promise.all(
      Array.from(this.rules.values()).map((rule) => rule.validate(context))
    );

    const allViolations: string[] = [];
    const allWarnings: string[] = [];

    for (const result of results) {
      allViolations.push(...result.violations);
      allWarnings.push(...result.warnings);
    }

    return {
      passed: allViolations.length === 0,
      violations: allViolations,
      warnings: allWarnings,
    };
  }

  /**
   * Validate against specific rules
   */
  async validateRules(context: any, ruleIds: string[]): Promise<ComplianceResult> {
    const rules = ruleIds
      .map((id) => this.rules.get(id))
      .filter((rule): rule is ComplianceRule => rule !== undefined);

    const results = await Promise.all(rules.map((rule) => rule.validate(context)));

    const allViolations: string[] = [];
    const allWarnings: string[] = [];

    for (const result of results) {
      allViolations.push(...result.violations);
      allWarnings.push(...result.warnings);
    }

    return {
      passed: allViolations.length === 0,
      violations: allViolations,
      warnings: allWarnings,
    };
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules.clear();
  }
}
