/**
 * Validation and helper utilities for Control API
 */

import type { Disc } from '../discs/feature-disc';
import type { Actor, ControlDetail } from './types';
import { ValidationError } from './errors';

/**
 * Validate a disc object
 * 
 * @param disc - Disc to validate
 * @throws {ValidationError} If disc is invalid
 */
export function validateDisc(disc: Disc): void {
  if (!disc) {
    throw new ValidationError('Disc is required');
  }

  if (!disc.metadata?.id) {
    throw new ValidationError('Disc must have a valid ID');
  }

  if (!disc.metadata?.type) {
    throw new ValidationError('Disc must have a valid type');
  }
}

/**
 * Validate an actor object
 * 
 * @param actor - Actor to validate
 * @throws {ValidationError} If actor is invalid
 */
export function validateActor(actor: Actor): void {
  if (!actor) {
    throw new ValidationError('Actor is required');
  }

  if (!actor.id) {
    throw new ValidationError('Actor must have a valid ID');
  }

  if (!actor.role) {
    throw new ValidationError('Actor must have a valid role');
  }
}

/**
 * Check if an actor can view a specific control
 * 
 * @param actor - Actor attempting to view
 * @param control - Control to check visibility for
 * @returns true if actor can view the control
 */
export function canView(actor: Actor, control: ControlDetail): boolean {
  // Actors can always view their own controls
  if (control.appliedBy.id === actor.id) {
    return true;
  }

  // Check if role has view permission
  if (actor.role.hasPermission('view-audit') || actor.role.hasPermission('full-control')) {
    return true;
  }

  return false;
}

/**
 * Check if a control ID is valid
 * 
 * @param controlId - Control ID to validate
 * @throws {ValidationError} If control ID is invalid
 */
export function validateControlId(controlId: string): void {
  if (!controlId || typeof controlId !== 'string') {
    throw new ValidationError('Control ID must be a non-empty string');
  }
}
