/**
 * Unit tests for custom error types
 */

import {
  ControlAPIError,
  PermissionError,
  PolicyViolationError,
  NotFoundError,
  ApplyError,
  ValidationError,
} from './errors';

describe('ControlAPIError', () => {
  test('creates error with message, code, and details', () => {
    const error = new ControlAPIError('Test error', 'TEST_CODE', { foo: 'bar' });
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.details).toEqual({ foo: 'bar' });
    expect(error.name).toBe('ControlAPIError');
  });

  test('is instance of Error', () => {
    const error = new ControlAPIError('Test', 'CODE');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ControlAPIError);
  });

  test('works without details', () => {
    const error = new ControlAPIError('Test', 'CODE');
    
    expect(error.details).toBeUndefined();
  });
});

describe('PermissionError', () => {
  test('creates permission error with correct code', () => {
    const error = new PermissionError('No permission');
    
    expect(error.message).toBe('No permission');
    expect(error.code).toBe('PERMISSION_DENIED');
    expect(error.name).toBe('PermissionError');
  });

  test('is instance of ControlAPIError', () => {
    const error = new PermissionError('Test');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ControlAPIError);
    expect(error).toBeInstanceOf(PermissionError);
  });
});

describe('PolicyViolationError', () => {
  test('creates policy violation error with reason', () => {
    const error = new PolicyViolationError('Safety check failed');
    
    expect(error.message).toBe('Policy violation: Safety check failed');
    expect(error.code).toBe('POLICY_VIOLATION');
    expect(error.name).toBe('PolicyViolationError');
  });

  test('includes violations in details', () => {
    const violations = [
      { rule: 'safety', message: 'Unsafe operation' },
      { rule: 'compliance', message: 'Non-compliant' },
    ];
    const error = new PolicyViolationError('Multiple violations', violations);
    
    expect(error.details).toEqual({ violations });
  });

  test('is instance of ControlAPIError', () => {
    const error = new PolicyViolationError('Test');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ControlAPIError);
    expect(error).toBeInstanceOf(PolicyViolationError);
  });
});

describe('NotFoundError', () => {
  test('creates not found error with correct code', () => {
    const error = new NotFoundError('Resource not found');
    
    expect(error.message).toBe('Resource not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('NotFoundError');
  });

  test('is instance of ControlAPIError', () => {
    const error = new NotFoundError('Test');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ControlAPIError);
    expect(error).toBeInstanceOf(NotFoundError);
  });
});

describe('ApplyError', () => {
  test('creates apply error with correct code', () => {
    const error = new ApplyError('Application failed');
    
    expect(error.message).toBe('Application failed');
    expect(error.code).toBe('APPLY_FAILED');
    expect(error.name).toBe('ApplyError');
  });

  test('includes cause in details', () => {
    const cause = new Error('Original error');
    const error = new ApplyError('Wrapped error', { cause });
    
    expect(error.details).toEqual({ cause });
  });

  test('is instance of ControlAPIError', () => {
    const error = new ApplyError('Test');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ControlAPIError);
    expect(error).toBeInstanceOf(ApplyError);
  });
});

describe('ValidationError', () => {
  test('creates validation error with correct code', () => {
    const error = new ValidationError('Invalid input');
    
    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.name).toBe('ValidationError');
  });

  test('includes details', () => {
    const details = { field: 'username', issue: 'too short' };
    const error = new ValidationError('Validation failed', details);
    
    expect(error.details).toEqual(details);
  });

  test('is instance of ControlAPIError', () => {
    const error = new ValidationError('Test');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ControlAPIError);
    expect(error).toBeInstanceOf(ValidationError);
  });
});
