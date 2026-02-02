import { DiscMetadata, DiscState, User, Role, Permission } from './types';

/**
 * Base class for all Discs
 * Discs are modular components that can be plugged into the DJ Control Layer
 */
export abstract class Disc {
  protected metadata: DiscMetadata;
  protected state: DiscState;

  constructor(metadata: DiscMetadata) {
    this.metadata = metadata;
    this.state = {
      enabled: false,
      config: {},
      data: null,
      lastModified: new Date(),
      lastModifiedBy: '',
    };
  }

  /**
   * Get disc metadata
   */
  getMetadata(): DiscMetadata {
    return { ...this.metadata };
  }

  /**
   * Get disc state
   */
  getState(): DiscState {
    return { ...this.state };
  }

  /**
   * Set disc state
   */
  setState(state: Partial<DiscState>, userId: string): void {
    this.state = {
      ...this.state,
      ...state,
      lastModified: new Date(),
      lastModifiedBy: userId,
    };
  }

  /**
   * Enable the disc
   */
  enable(userId: string): void {
    this.state.enabled = true;
    this.state.lastModified = new Date();
    this.state.lastModifiedBy = userId;
  }

  /**
   * Disable the disc
   */
  disable(userId: string): void {
    this.state.enabled = false;
    this.state.lastModified = new Date();
    this.state.lastModifiedBy = userId;
  }

  /**
   * Check if disc is enabled
   */
  isEnabled(): boolean {
    return this.state.enabled;
  }

  /**
   * Update disc configuration
   */
  updateConfig(config: Record<string, any>, userId: string): void {
    this.state.config = { ...this.state.config, ...config };
    this.state.lastModified = new Date();
    this.state.lastModifiedBy = userId;
  }

  /**
   * Get disc configuration
   */
  getConfig(): Record<string, any> {
    return { ...this.state.config };
  }

  /**
   * Initialize the disc (called when added to the layer)
   */
  abstract initialize(): Promise<void>;

  /**
   * Clean up the disc (called when removed from the layer)
   */
  abstract cleanup(): Promise<void>;

  /**
   * Execute disc-specific logic
   */
  abstract execute(context: any): Promise<any>;

  /**
   * Validate disc-specific data
   */
  abstract validate(data: any): Promise<boolean>;

  /**
   * Export disc state for backup/migration
   */
  exportState(): string {
    return JSON.stringify(
      {
        metadata: this.metadata,
        state: this.state,
      },
      null,
      2
    );
  }

  /**
   * Import disc state from backup/migration
   */
  importState(jsonData: string): void {
    try {
      const imported = JSON.parse(jsonData);
      if (imported.state) {
        this.state = {
          ...imported.state,
          lastModified: new Date(imported.state.lastModified),
        };
      }
    } catch (error) {
      throw new Error(`Failed to import disc state: ${error}`);
    }
  }
}
