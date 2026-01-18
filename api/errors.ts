/**
 * Custom error types for Control API
 * 
 * These errors provide structured error handling with error codes
 * and additional context for API consumers.
 */

/**
 * Base error class for Control API errors
 */
export class ControlAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ControlAPIError';
    Object.setPrototypeOf(this, ControlAPIError.prototype);
  }
}

/**
 * Error thrown when actor lacks required permissions
 */
export class PermissionError extends ControlAPIError {
  constructor(message: string) {
    super(message, 'PERMISSION_DENIED');
    this.name = 'PermissionError';
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}

/**
 * Error thrown when a policy is violated
 */
export class PolicyViolationError extends ControlAPIError {
  constructor(reason: string, violations?: any[]) {
    super(`Policy violation: ${reason}`, 'POLICY_VIOLATION', { violations });
    this.name = 'PolicyViolationError';
    Object.setPrototypeOf(this, PolicyViolationError.prototype);
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends ControlAPIError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error thrown when control application fails
 */
export class ApplyError extends ControlAPIError {
  constructor(message: string, options?: { cause: Error }) {
    super(message, 'APPLY_FAILED', options);
    this.name = 'ApplyError';
    Object.setPrototypeOf(this, ApplyError.prototype);
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends ControlAPIError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
