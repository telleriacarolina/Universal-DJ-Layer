import { Role } from '../../src/core/types';

/**
 * Approval rule definition
 */
export interface ApprovalRule {
  id: string;
  name: string;
  description: string;
  requiredApprovers: number;
  allowedRoles: Role[];
  autoApprove?: (context: any) => boolean;
  conditions?: ApprovalCondition[];
}

/**
 * Approval condition
 */
export interface ApprovalCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains';
  value: any;
}

/**
 * Pre-defined approval rules for common scenarios
 */
export const ApprovalRules: Record<string, ApprovalRule> = {
  configChange: {
    id: 'config-change',
    name: 'Configuration Change',
    description: 'Requires admin approval for configuration changes',
    requiredApprovers: 1,
    allowedRoles: [Role.ADMIN, Role.OWNER]
  },

  criticalChange: {
    id: 'critical-change',
    name: 'Critical Change',
    description: 'Requires two admin approvals for critical changes',
    requiredApprovers: 2,
    allowedRoles: [Role.ADMIN, Role.OWNER]
  },

  featureRelease: {
    id: 'feature-release',
    name: 'Feature Release',
    description: 'Requires owner approval for new feature releases',
    requiredApprovers: 1,
    allowedRoles: [Role.OWNER]
  },

  minorChange: {
    id: 'minor-change',
    name: 'Minor Change',
    description: 'Auto-approved for minor changes by experimenters',
    requiredApprovers: 0,
    allowedRoles: [Role.EXPERIMENTER, Role.ADMIN, Role.OWNER],
    autoApprove: (context) => {
      // Auto-approve if change is small
      return context.changeSize === 'minor';
    }
  },

  dataModification: {
    id: 'data-modification',
    name: 'Data Modification',
    description: 'Requires admin approval for data modifications',
    requiredApprovers: 1,
    allowedRoles: [Role.ADMIN, Role.OWNER],
    conditions: [
      {
        field: 'operation',
        operator: 'equals',
        value: 'modify'
      }
    ]
  },

  deletion: {
    id: 'deletion',
    name: 'Deletion',
    description: 'Requires two owner approvals for deletions',
    requiredApprovers: 2,
    allowedRoles: [Role.OWNER],
    conditions: [
      {
        field: 'operation',
        operator: 'equals',
        value: 'delete'
      }
    ]
  },

  bulkOperation: {
    id: 'bulk-operation',
    name: 'Bulk Operation',
    description: 'Requires admin approval for operations affecting multiple items',
    requiredApprovers: 1,
    allowedRoles: [Role.ADMIN, Role.OWNER],
    conditions: [
      {
        field: 'itemCount',
        operator: 'greaterThan',
        value: 10
      }
    ]
  },

  highRiskChange: {
    id: 'high-risk-change',
    name: 'High Risk Change',
    description: 'Requires three approvals from different roles',
    requiredApprovers: 3,
    allowedRoles: [Role.ADMIN, Role.OWNER]
  }
};

/**
 * Rule matcher - determines which rule applies to a request
 */
export class RuleMatcher {
  /**
   * Find matching rule for a request
   */
  static matchRule(
    request: any,
    customRules?: ApprovalRule[]
  ): ApprovalRule | null {
    const allRules = [
      ...Object.values(ApprovalRules),
      ...(customRules || [])
    ];

    // Check explicit rule ID
    if (request.ruleId) {
      const rule = allRules.find(r => r.id === request.ruleId);
      if (rule) return rule;
    }

    // Match based on conditions
    for (const rule of allRules) {
      if (this.matchesConditions(request, rule.conditions || [])) {
        return rule;
      }
    }

    // Default to config change rule
    return ApprovalRules.configChange;
  }

  /**
   * Check if request matches all conditions
   */
  private static matchesConditions(
    request: any,
    conditions: ApprovalCondition[]
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return false;
    }

    return conditions.every(condition => {
      const value = request[condition.field];

      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'notEquals':
          return value !== condition.value;
        case 'greaterThan':
          return value > condition.value;
        case 'lessThan':
          return value < condition.value;
        case 'contains':
          return Array.isArray(value) && value.includes(condition.value);
        default:
          return false;
      }
    });
  }

  /**
   * Check if auto-approval applies
   */
  static canAutoApprove(request: any, rule: ApprovalRule): boolean {
    if (!rule.autoApprove) {
      return false;
    }

    return rule.autoApprove(request);
  }
}
