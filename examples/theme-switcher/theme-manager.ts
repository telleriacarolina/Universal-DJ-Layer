import { ThemeDisc } from '../../src/discs/theme-disc';
import { Role } from '../../src/core/types';

/**
 * Theme presets for quick theme switching
 */
export const ThemePresets = {
  light: {
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    darkMode: false,
    fontSize: 'medium' as const,
    fontFamily: 'Arial, sans-serif'
  },

  dark: {
    primaryColor: '#0d6efd',
    secondaryColor: '#6c757d',
    darkMode: true,
    fontSize: 'medium' as const,
    fontFamily: 'Arial, sans-serif'
  },

  highContrast: {
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    darkMode: true,
    fontSize: 'large' as const,
    fontFamily: 'Arial, sans-serif'
  },

  ocean: {
    primaryColor: '#006994',
    secondaryColor: '#0099cc',
    darkMode: false,
    fontSize: 'medium' as const,
    fontFamily: 'Helvetica, sans-serif'
  },

  forest: {
    primaryColor: '#228B22',
    secondaryColor: '#90EE90',
    darkMode: false,
    fontSize: 'medium' as const,
    fontFamily: 'Georgia, serif'
  },

  sunset: {
    primaryColor: '#FF6347',
    secondaryColor: '#FFD700',
    darkMode: false,
    fontSize: 'medium' as const,
    fontFamily: 'Verdana, sans-serif'
  },

  corporate: {
    primaryColor: '#003366',
    secondaryColor: '#336699',
    darkMode: false,
    fontSize: 'medium' as const,
    fontFamily: 'Tahoma, sans-serif'
  },

  accessibility: {
    primaryColor: '#000000',
    secondaryColor: '#FFFF00',
    darkMode: false,
    fontSize: 'large' as const,
    fontFamily: 'Arial, sans-serif'
  }
};

export type ThemePresetName = keyof typeof ThemePresets;

/**
 * Theme Manager - Manages application theme settings
 */
export class ThemeManager {
  private disc: ThemeDisc;
  private actorId: string;

  constructor(actorId: string = 'system') {
    this.disc = new ThemeDisc();
    this.actorId = actorId;
  }

  /**
   * Initialize the theme manager
   */
  async initialize(): Promise<void> {
    await this.disc.initialize();
    this.disc.enable(this.actorId);
  }

  /**
   * Apply a preset theme
   */
  async applyPreset(presetName: ThemePresetName): Promise<void> {
    const preset = ThemePresets[presetName];
    if (!preset) {
      throw new Error(`Unknown preset: ${presetName}`);
    }

    this.disc.updateConfig(preset, this.actorId);
  }

  /**
   * Set primary color
   */
  async setPrimaryColor(color: string): Promise<void> {
    this.disc.setPrimaryColor(color, this.actorId);
  }

  /**
   * Set secondary color
   */
  async setSecondaryColor(color: string): Promise<void> {
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      throw new Error('Invalid color format. Use hex format: #RRGGBB');
    }
    this.disc.updateConfig({ secondaryColor: color }, this.actorId);
  }

  /**
   * Toggle dark mode
   */
  async setDarkMode(enabled: boolean): Promise<void> {
    this.disc.setDarkMode(enabled, this.actorId);
  }

  /**
   * Set font size
   */
  async setFontSize(size: 'small' | 'medium' | 'large'): Promise<void> {
    this.disc.setFontSize(size, this.actorId);
  }

  /**
   * Set font family
   */
  async setFontFamily(fontFamily: string): Promise<void> {
    this.disc.updateConfig({ fontFamily }, this.actorId);
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): any {
    return this.disc.getConfig();
  }

  /**
   * Apply custom theme
   */
  async applyCustomTheme(theme: {
    primaryColor?: string;
    secondaryColor?: string;
    darkMode?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
    fontFamily?: string;
  }): Promise<void> {
    // Validate before applying
    const valid = await this.disc.validate(theme);
    if (!valid) {
      throw new Error('Invalid theme configuration');
    }

    this.disc.updateConfig(theme, this.actorId);
  }

  /**
   * Generate CSS from current theme
   */
  generateCSS(): string {
    const theme = this.getCurrentTheme();
    
    const fontSizes: Record<string, string> = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };

    return `
:root {
  --primary-color: ${theme.primaryColor};
  --secondary-color: ${theme.secondaryColor};
  --background-color: ${theme.darkMode ? '#1a1a1a' : '#ffffff'};
  --text-color: ${theme.darkMode ? '#ffffff' : '#000000'};
  --font-size: ${fontSizes[theme.fontSize] || '16px'};
  --font-family: ${theme.fontFamily};
}

body {
  background-color: var(--background-color);
  color: var(--text-color);
  font-size: var(--font-size);
  font-family: var(--font-family);
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-secondary {
  background-color: var(--secondary-color);
  color: white;
}
    `.trim();
  }

  /**
   * Export theme as JSON
   */
  exportTheme(): string {
    return JSON.stringify(this.getCurrentTheme(), null, 2);
  }

  /**
   * Import theme from JSON
   */
  async importTheme(jsonString: string): Promise<void> {
    try {
      const theme = JSON.parse(jsonString);
      await this.applyCustomTheme(theme);
    } catch (error) {
      throw new Error(`Failed to import theme: ${error}`);
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.disc.cleanup();
  }
}
