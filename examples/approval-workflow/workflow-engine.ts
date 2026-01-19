import { Role } from '../../src/core/types';
import { ApprovalRule, ApprovalRules, RuleMatcher } from './approval-rules';

/**
 * Approval request status
 */
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

/**
 * Approval request
 */
export interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedByRole: Role;
  requestedAt: Date;
  status: ApprovalStatus;
  rule: ApprovalRule;
  approvals: Approval[];
  rejections: Rejection[];
  expiresAt?: Date;
  context: any;
}

/**
 * Individual approval
 */
export interface Approval {
  approver: string;
  approverRole: Role;
  approvedAt: Date;
  comment?: string;
}

/**
 * Individual rejection
 */
export interface Rejection {
  rejector: string;
  rejectorRole: Role;
  rejectedAt: Date;
  reason: string;
}

/**
 * Workflow engine for multi-step approval processes
 */
export class WorkflowEngine {
  private requests: Map<string, ApprovalRequest> = new Map();
  private customRules: ApprovalRule[] = [];
  private requestCounter = 0;

  /**
   * Initialize the workflow engine
   */
  async initialize(): Promise<void> {
    console.log('Workflow Engine initialized');
  }

  /**
   * Register a custom approval rule
   */
  registerRule(rule: ApprovalRule): void {
    this.customRules.push(rule);
  }

  /**
   * Create an approval request
   */
  async createRequest(
    title: string,
    description: string,
    requestedBy: string,
    requestedByRole: Role,
    context?: any
  ): Promise<ApprovalRequest> {
    const rule = RuleMatcher.matchRule(context || {}, this.customRules);
    
    if (!rule) {
      throw new Error('No matching approval rule found');
    }

    // Check for auto-approval
    if (RuleMatcher.canAutoApprove(context || {}, rule)) {
      return this.createAutoApprovedRequest(
        title,
        description,
        requestedBy,
        requestedByRole,
        rule,
        context
      );
    }

    const request: ApprovalRequest = {
      id: `REQ-${++this.requestCounter}`,
      title,
      description,
      requestedBy,
      requestedByRole,
      requestedAt: new Date(),
      status: ApprovalStatus.PENDING,
      rule,
      approvals: [],
      rejections: [],
      context: context || {}
    };

    // Set expiration if configured
    if (context?.expiresIn) {
      request.expiresAt = new Date(Date.now() + context.expiresIn);
    }

    this.requests.set(request.id, request);
    return request;
  }

  /**
   * Create an auto-approved request
   */
  private createAutoApprovedRequest(
    title: string,
    description: string,
    requestedBy: string,
    requestedByRole: Role,
    rule: ApprovalRule,
    context: any
  ): ApprovalRequest {
    const request: ApprovalRequest = {
      id: `REQ-${++this.requestCounter}`,
      title,
      description,
      requestedBy,
      requestedByRole,
      requestedAt: new Date(),
      status: ApprovalStatus.APPROVED,
      rule,
      approvals: [
        {
          approver: 'system',
          approverRole: Role.ADMIN,
          approvedAt: new Date(),
          comment: 'Auto-approved by system'
        }
      ],
      rejections: [],
      context: context || {}
    };

    this.requests.set(request.id, request);
    return request;
  }

  /**
   * Approve a request
   */
  async approve(
    requestId: string,
    approver: string,
    approverRole: Role,
    comment?: string
  ): Promise<void> {
    const request = this.requests.get(requestId);
    
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Request ${requestId} is not pending`);
    }

    // Check if approver role is allowed
    if (!request.rule.allowedRoles.includes(approverRole)) {
      throw new Error(`Role ${approverRole} is not allowed to approve this request`);
    }

    // Check if already approved by this user
    if (request.approvals.some(a => a.approver === approver)) {
      throw new Error(`${approver} has already approved this request`);
    }

    // Add approval
    request.approvals.push({
      approver,
      approverRole,
      approvedAt: new Date(),
      comment
    });

    // Check if enough approvals
    if (request.approvals.length >= request.rule.requiredApprovers) {
      request.status = ApprovalStatus.APPROVED;
    }
  }

  /**
   * Reject a request
   */
  async reject(
    requestId: string,
    rejector: string,
    rejectorRole: Role,
    reason: string
  ): Promise<void> {
    const request = this.requests.get(requestId);
    
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Request ${requestId} is not pending`);
    }

    // Check if rejector role is allowed
    if (!request.rule.allowedRoles.includes(rejectorRole)) {
      throw new Error(`Role ${rejectorRole} is not allowed to reject this request`);
    }

    // Add rejection
    request.rejections.push({
      rejector,
      rejectorRole,
      rejectedAt: new Date(),
      reason
    });

    // One rejection is enough to reject the request
    request.status = ApprovalStatus.REJECTED;
  }

  /**
   * Cancel a request
   */
  async cancel(requestId: string, cancelledBy: string): Promise<void> {
    const request = this.requests.get(requestId);
    
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Request ${requestId} is not pending`);
    }

    // Only the requester can cancel
    if (request.requestedBy !== cancelledBy) {
      throw new Error('Only the requester can cancel the request');
    }

    request.status = ApprovalStatus.CANCELLED;
  }

  /**
   * Get a request by ID
   */
  getRequest(requestId: string): ApprovalRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Get all requests
   */
  getAllRequests(): ApprovalRequest[] {
    return Array.from(this.requests.values());
  }

  /**
   * Get pending requests
   */
  getPendingRequests(): ApprovalRequest[] {
    return this.getAllRequests().filter(r => r.status === ApprovalStatus.PENDING);
  }

  /**
   * Get requests by status
   */
  getRequestsByStatus(status: ApprovalStatus): ApprovalRequest[] {
    return this.getAllRequests().filter(r => r.status === status);
  }

  /**
   * Get requests for a specific approver
   */
  getRequestsForApprover(approverRole: Role): ApprovalRequest[] {
    return this.getPendingRequests().filter(r =>
      r.rule.allowedRoles.includes(approverRole)
    );
  }

  /**
   * Check expired requests and update status
   */
  async checkExpiredRequests(): Promise<number> {
    const now = new Date();
    let expiredCount = 0;

    const requests = Array.from(this.requests.values());
    for (const request of requests) {
      if (
        request.status === ApprovalStatus.PENDING &&
        request.expiresAt &&
        request.expiresAt < now
      ) {
        request.status = ApprovalStatus.EXPIRED;
        expiredCount++;
      }
    }

    return expiredCount;
  }

  /**
   * Get approval progress for a request
   */
  getProgress(requestId: string): {
    current: number;
    required: number;
    percentage: number;
  } {
    const request = this.requests.get(requestId);
    
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    const current = request.approvals.length;
    const required = request.rule.requiredApprovers;
    const percentage = required > 0 ? (current / required) * 100 : 100;

    return { current, required, percentage };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.requests.clear();
    this.customRules = [];
    console.log('Workflow Engine cleaned up');
  }
}
