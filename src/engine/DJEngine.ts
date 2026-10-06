import { Disc, Role, LogEntry } from '../types';

/**
 * DJEngine is the central orchestrator for the DJ Control Layer.
 * It manages disc registration, activation/deactivation, and role-based authority.
 */
export class DJEngine {
  private registeredDiscs: Map<string, Disc>;
  private activeDiscs: Set<string>;
  private roleHierarchy: Map<Role, number>;
  private eventLog: LogEntry[];
  private currentActor: string;
  private currentRole: Role;

  constructor(actor: string = 'System', role: Role = Role.Creator) {
    this.registeredDiscs = new Map();
    this.activeDiscs = new Set();
    this.eventLog = [];
    this.currentActor = actor;
    this.currentRole = role;

    // Initialize role hierarchy (higher number = more authority)
    this.roleHierarchy = new Map([
      [Role.Creator, 5],
      [Role.Admin, 4],
      [Role.Moderator, 3],
      [Role.User, 2],
      [Role.AIAgent, 1],
    ]);

    this.log('EngineInitialized', undefined, {
      actor,
      role,
    });
  }

  /**
   * Set the current actor and role for subsequent operations
   */
  setActor(actor: string, role: Role): void {
    this.currentActor = actor;
    this.currentRole = role;
    this.log('ActorChanged', undefined, { actor, role });
  }

  /**
   * Register a disc with the engine
   * @param disc The disc to register
   * @throws Error if disc metadata is invalid
   */
  registerDisc(disc: Disc): void {
    // Validate disc metadata
    this.validateDisc(disc);

    // Check if disc already exists
    if (this.registeredDiscs.has(disc.name)) {
      throw new Error(`Disc "${disc.name}" is already registered`);
    }

    // Register the disc
    this.registeredDiscs.set(disc.name, disc);

    this.log('DiscRegistered', disc.name, {
      scope: disc.scope,
      allowedRoles: disc.allowedRoles,
      isTemporary: disc.isTemporary,
    });
  }

  /**
   * Activate a disc by name
   * @param name The name of the disc to activate
   * @throws Error if disc doesn't exist or role permissions are insufficient
   */
  activateDisc(name: string): void {
    // Check if disc exists
    const disc = this.registeredDiscs.get(name);
    if (!disc) {
      throw new Error(`Disc "${name}" is not registered`);
    }

    // Check if already active
    if (this.activeDiscs.has(name)) {
      throw new Error(`Disc "${name}" is already active`);
    }

    // Check role permissions
    if (!this.canExecute(this.currentRole, disc)) {
      throw new Error(
        `Role "${this.currentRole}" does not have permission to activate disc "${name}"`
      );
    }

    // Activate the disc
    this.activeDiscs.add(name);

    this.log('DiscActivated', name, {
      isTemporary: disc.isTemporary,
    });

    // Execute the disc if it has an execute function
    if (disc.execute) {
      disc.execute();
    }
  }

  /**
   * Deactivate a disc by name
   * @param name The name of the disc to deactivate
   * @throws Error if disc doesn't exist or is not active
   */
  deactivateDisc(name: string): void {
    // Check if disc exists
    const disc = this.registeredDiscs.get(name);
    if (!disc) {
      throw new Error(`Disc "${name}" is not registered`);
    }

    // Check if disc is active
    if (!this.activeDiscs.has(name)) {
      throw new Error(`Disc "${name}" is not active`);
    }

    // Check role permissions
    if (!this.canExecute(this.currentRole, disc)) {
      throw new Error(
        `Role "${this.currentRole}" does not have permission to deactivate disc "${name}"`
      );
    }

    // Deactivate the disc
    this.activeDiscs.delete(name);

    this.log('DiscDeactivated', name, {
      isTemporary: disc.isTemporary,
    });
  }

  /**
   * Check if a role can execute operations on a disc
   * @param role The role to check
   * @param disc The disc to check against
   * @returns true if the role has sufficient authority
   */
  canExecute(role: Role, disc: Disc): boolean {
    // Check if the role is in the allowed roles for this disc
    if (!disc.allowedRoles.includes(role)) {
      return false;
    }

    // Additional authority check based on role hierarchy
    const roleLevel = this.roleHierarchy.get(role) || 0;
    return roleLevel > 0;
  }

  /**
   * Get a registered disc by name
   */
  getDisc(name: string): Disc | undefined {
    return this.registeredDiscs.get(name);
  }

  /**
   * Get all registered discs
   */
  getRegisteredDiscs(): Disc[] {
    return Array.from(this.registeredDiscs.values());
  }

  /**
   * Get all active disc names
   */
  getActiveDiscs(): string[] {
    return Array.from(this.activeDiscs);
  }

  /**
   * Check if a disc is active
   */
  isDiscActive(name: string): boolean {
    return this.activeDiscs.has(name);
  }

  /**
   * Get the event log
   */
  getEventLog(): LogEntry[] {
    return [...this.eventLog];
  }

  /**
   * Validate disc metadata
   * @throws Error if disc is invalid
   */
  private validateDisc(disc: Disc): void {
    if (!disc.name || disc.name.trim() === '') {
      throw new Error('Disc name is required');
    }

    if (!disc.scope) {
      throw new Error('Disc scope is required');
    }

    if (!disc.allowedRoles || disc.allowedRoles.length === 0) {
      throw new Error('Disc must have at least one allowed role');
    }

    if (disc.isTemporary === undefined || disc.isTemporary === null) {
      throw new Error('Disc isTemporary flag is required');
    }
  }

  /**
   * Log an event to the event log and console
   */
  private log(event: string, discName?: string, details?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      event,
      discName,
      actor: this.currentActor,
      role: this.currentRole,
      details,
    };

    this.eventLog.push(entry);

    // Console logging for observability
    console.log(
      `[${entry.timestamp.toISOString()}] ${entry.event}${
        discName ? ` - ${discName}` : ''
      } by ${entry.actor} (${entry.role})`
    );
  }
}
