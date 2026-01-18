import { Disc } from '../core/disc';
import { Role, Permission, DiscMetadata } from '../core/types';

/**
 * Example Theme Disc - Manages UI theme settings
 */
export class ThemeDisc extends Disc {
  constructor() {
    const metadata: DiscMetadata = {
      id: 'theme-disc',
      name: 'Theme Disc',
      version: '1.0.0',
      description: 'Manages application theme and visual settings',
      author: 'DJ Control Layer',
      requiredRole: Role.EXPERIMENTER,
      requiredPermissions: [Permission.READ, Permission.WRITE]
    };

    super(metadata);

    // Initialize default config
    this.state.config = {
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      darkMode: false,
      fontSize: 'medium',
      fontFamily: 'Arial, sans-serif'
    };
  }

  async initialize(): Promise<void> {
    console.log('Theme Disc initialized');
  }

  async cleanup(): Promise<void> {
    console.log('Theme Disc cleaned up');
  }

  async execute(context: any): Promise<any> {
    // Apply theme settings
    const theme = {
      ...this.state.config,
      appliedAt: new Date(),
      appliedBy: context.userId
    };

    return {
      success: true,
      theme
    };
  }

  async validate(data: any): Promise<boolean> {
    // Validate theme data
    if (data.primaryColor && !/^#[0-9A-F]{6}$/i.test(data.primaryColor)) {
      return false;
    }

    if (data.secondaryColor && !/^#[0-9A-F]{6}$/i.test(data.secondaryColor)) {
      return false;
    }

    if (data.fontSize && !['small', 'medium', 'large'].includes(data.fontSize)) {
      return false;
    }

    return true;
  }

  /**
   * Set primary color
   */
  setPrimaryColor(color: string, userId: string): void {
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      throw new Error('Invalid color format');
    }
    this.updateConfig({ primaryColor: color }, userId);
  }

  /**
   * Set dark mode
   */
  setDarkMode(enabled: boolean, userId: string): void {
    this.updateConfig({ darkMode: enabled }, userId);
  }

  /**
   * Set font size
   */
  setFontSize(size: 'small' | 'medium' | 'large', userId: string): void {
    this.updateConfig({ fontSize: size }, userId);
  }
}
