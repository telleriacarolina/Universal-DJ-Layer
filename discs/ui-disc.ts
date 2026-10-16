/**
 * UIDisc - Controls UI elements and layout
 * 
 * Enables dynamic modification of user interface elements, layouts,
 * themes, and visual configurations at runtime.
 * 
 * Note: This disc is for UI-optional environments. The core DJ Layer
 * is headless, but this disc provides UI control when needed.
 */

import type { Disc, DiscMetadata } from './feature-disc';

export interface UIComponent {
  /** Unique identifier for this component */
  id: string;
  /** Component type (button, form, panel, etc.) */
  type: string;
  /** Whether the component is visible */
  visible: boolean;
  /** Component properties */
  props?: Record<string, any>;
  /** Component styling */
  style?: Record<string, any>;
  /** Child components */
  children?: string[];
}

export interface UILayout {
  /** Layout name */
  name: string;
  /** Layout type (grid, flex, absolute, etc.) */
  type: string;
  /** Layout configuration */
  config: Record<string, any>;
  /** Components in this layout */
  components: Record<string, UIComponent>;
}

export interface UITheme {
  /** Theme name */
  name: string;
  /** Color palette */
  colors?: Record<string, string>;
  /** Typography settings */
  typography?: Record<string, any>;
  /** Spacing values */
  spacing?: Record<string, number>;
  /** Other theme properties */
  [key: string]: any;
}

export interface ThemeConfig {
  /** Color palette */
  colors?: Record<string, string>;
  /** Typography settings */
  fonts?: Record<string, any>;
  /** Spacing values */
  spacing?: Record<string, number>;
  /** Other theme properties */
  [key: string]: any;
}

export interface UIConfig {
  /** Name identifier for this UI disc */
  name: string;
  /** Layouts to apply */
  layouts?: Record<string, UILayout>;
  /** Themes to apply */
  themes?: Record<string, UITheme>;
  /** Component configurations */
  components?: Record<string, UIComponent>;
  /** Active theme name */
  activeTheme?: string;
  /** Dark mode enabled */
  darkMode?: boolean;
  /** Current layout type */
  currentLayout?: 'grid' | 'list' | 'compact';
  /** Component visibility state */
  componentVisibility?: Record<string, boolean>;
  /** A/B test variant assignments */
  variants?: Record<string, string>;
  /** CSS variable overrides */
  cssVariables?: Record<string, string>;
}

export class UIDisc implements Disc {
  metadata: DiscMetadata;
  private config: UIConfig;
  private previousState: Record<string, any> | null = null;

  constructor(config: UIConfig) {
    this.config = {
      name: config.name,
      layouts: config.layouts || {},
      themes: config.themes || {},
      components: config.components || {},
      activeTheme: config.activeTheme,
      darkMode: config.darkMode || false,
      currentLayout: config.currentLayout,
      componentVisibility: config.componentVisibility || {},
      variants: config.variants || {},
      cssVariables: config.cssVariables || {},
    };
    this.metadata = {
      id: this.generateId(),
      name: config.name,
      type: 'ui',
      version: '1.0.0',
      createdAt: Date.now(),
    };
  }

  /**
   * Set theme configuration
   * @param themeConfig - Theme configuration with colors, fonts, spacing
   * @example
   * uiDisc.setTheme({ colors: { primary: '#007bff' }, fonts: { body: 'Arial' } });
   */
  setTheme(themeConfig: ThemeConfig): void {
    const themeName = this.config.activeTheme || 'default';
    
    if (!this.config.themes) {
      this.config.themes = {};
    }

    if (!this.config.themes[themeName]) {
      this.config.themes[themeName] = {
        name: themeName,
      };
    }

    const currentTheme = this.config.themes[themeName];
    
    if (themeConfig.colors) {
      currentTheme.colors = { ...currentTheme.colors, ...themeConfig.colors };
    }
    
    if (themeConfig.fonts) {
      currentTheme.typography = { ...currentTheme.typography, ...themeConfig.fonts };
    }
    
    if (themeConfig.spacing) {
      currentTheme.spacing = { ...currentTheme.spacing, ...themeConfig.spacing };
    }

    for (const [key, value] of Object.entries(themeConfig)) {
      if (key !== 'colors' && key !== 'fonts' && key !== 'spacing') {
        currentTheme[key] = value;
      }
    }

    this.config.activeTheme = themeName;
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Toggle dark mode
   * @param enabled - Whether dark mode should be enabled
   * @example
   * uiDisc.toggleDarkMode(true);
   */
  toggleDarkMode(enabled: boolean): void {
    this.config.darkMode = enabled;
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Set layout type
   * @param layout - Layout type (grid, list, or compact)
   * @throws Error if layout type is invalid
   * @example
   * uiDisc.setLayout('grid');
   */
  setLayout(layout: 'grid' | 'list' | 'compact'): void {
    const validLayouts = ['grid', 'list', 'compact'];
    if (!validLayouts.includes(layout)) {
      throw new Error(`Invalid layout type: ${layout}. Must be one of: ${validLayouts.join(', ')}`);
    }
    this.config.currentLayout = layout;
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Hide a component by ID
   * @param componentId - Component ID to hide
   * @example
   * uiDisc.hideComponent('sidebar');
   */
  hideComponent(componentId: string): void {
    if (!this.config.componentVisibility) {
      this.config.componentVisibility = {};
    }
    this.config.componentVisibility[componentId] = false;
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Show a component by ID
   * @param componentId - Component ID to show
   * @example
   * uiDisc.showComponent('sidebar');
   */
  showComponent(componentId: string): void {
    if (!this.config.componentVisibility) {
      this.config.componentVisibility = {};
    }
    this.config.componentVisibility[componentId] = true;
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Set A/B test variant for an experiment
   * @param experimentId - Experiment identifier
   * @param variant - Variant name/ID
   * @example
   * uiDisc.setVariant('checkout-flow', 'variant-b');
   */
  setVariant(experimentId: string, variant: string): void {
    if (!this.config.variants) {
      this.config.variants = {};
    }
    this.config.variants[experimentId] = variant;
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Set a CSS variable override
   * @param variable - CSS variable name (with or without --)
   * @param value - CSS variable value
   * @example
   * uiDisc.setCSSVariable('--primary-color', '#ff0000');
   */
  setCSSVariable(variable: string, value: string): void {
    if (!this.config.cssVariables) {
      this.config.cssVariables = {};
    }
    const normalizedVar = variable.startsWith('--') ? variable : `--${variable}`;
    this.config.cssVariables[normalizedVar] = value;
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Remove a CSS variable override
   * @param variable - CSS variable name (with or without --)
   * @example
   * uiDisc.removeCSSVariable('--primary-color');
   */
  removeCSSVariable(variable: string): void {
    if (!this.config.cssVariables) {
      return;
    }
    const normalizedVar = variable.startsWith('--') ? variable : `--${variable}`;
    delete this.config.cssVariables[normalizedVar];
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Check if a component is visible
   * @param componentId - Component ID to check
   * @returns True if visible (or undefined = default visible)
   * @example
   * const visible = uiDisc.isComponentVisible('sidebar');
   */
  isComponentVisible(componentId: string): boolean {
    if (!this.config.componentVisibility) {
      return true;
    }
    return this.config.componentVisibility[componentId] !== false;
  }

  /**
   * Get current variant for an experiment
   * @param experimentId - Experiment identifier
   * @returns Variant name or undefined
   * @example
   * const variant = uiDisc.getVariant('checkout-flow');
   */
  getVariant(experimentId: string): string | undefined {
    return this.config.variants?.[experimentId];
  }

  /**
   * Get all hidden components
   * @returns Array of hidden component IDs
   * @example
   * const hidden = uiDisc.getHiddenComponents();
   */
  getHiddenComponents(): string[] {
    if (!this.config.componentVisibility) {
      return [];
    }
    return Object.entries(this.config.componentVisibility)
      .filter(([_, visible]) => !visible)
      .map(([id]) => id);
  }

  /**
   * Get all visible components
   * @returns Array of visible component IDs
   * @example
   * const visible = uiDisc.getVisibleComponents();
   */
  getVisibleComponents(): string[] {
    if (!this.config.componentVisibility) {
      return [];
    }
    return Object.entries(this.config.componentVisibility)
      .filter(([_, visible]) => visible)
      .map(([id]) => id);
  }

  /**
   * Apply UI changes to the system
   * @param context - Context object to apply UI to
   * @returns Updated context with applied UI
   * @throws Error if context is invalid
   * @example
   * const result = await uiDisc.apply({ ui: {} });
   */
  async apply(context: any): Promise<any> {
    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context: must be an object');
    }

    this.previousState = context.ui ? JSON.parse(JSON.stringify(context.ui)) : {};

    if (!context.ui) {
      context.ui = {};
    }

    context.ui.themes = JSON.parse(JSON.stringify(this.config.themes || {}));
    context.ui.layouts = JSON.parse(JSON.stringify(this.config.layouts || {}));
    context.ui.components = JSON.parse(JSON.stringify(this.config.components || {}));
    context.ui.activeTheme = this.config.activeTheme;
    context.ui.darkMode = this.config.darkMode;
    context.ui.currentLayout = this.config.currentLayout;
    context.ui.componentVisibility = JSON.parse(JSON.stringify(this.config.componentVisibility || {}));
    context.ui.variants = JSON.parse(JSON.stringify(this.config.variants || {}));
    context.ui.cssVariables = JSON.parse(JSON.stringify(this.config.cssVariables || {}));

    return context;
  }

  /**
   * Revert UI to previous state
   * @param context - Context object to revert
   * @returns Context with reverted UI
   * @throws Error if no previous state exists or context is invalid
   * @example
   * const result = await uiDisc.revert(context);
   */
  async revert(context: any): Promise<any> {
    if (!this.previousState) {
      throw new Error('No previous state to revert to');
    }

    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context: must be an object');
    }

    context.ui = JSON.parse(JSON.stringify(this.previousState));
    this.previousState = null;

    return context;
  }

  /**
   * Preview UI changes without applying
   * @param context - Context object to preview against
   * @returns Preview object showing changes
   * @example
   * const preview = await uiDisc.preview(context);
   */
  async preview(context: any): Promise<any> {
    const changes: Record<string, any> = {};
    const currentUI = context?.ui || {};

    if (this.config.activeTheme !== currentUI.activeTheme) {
      changes.activeTheme = {
        current: currentUI.activeTheme,
        proposed: this.config.activeTheme,
        action: 'modify',
      };
    }

    if (this.config.darkMode !== currentUI.darkMode) {
      changes.darkMode = {
        current: currentUI.darkMode,
        proposed: this.config.darkMode,
        action: 'modify',
      };
    }

    if (this.config.currentLayout !== currentUI.currentLayout) {
      changes.currentLayout = {
        current: currentUI.currentLayout,
        proposed: this.config.currentLayout,
        action: 'modify',
      };
    }

    const currentVisibility = currentUI.componentVisibility || {};
    const proposedVisibility = this.config.componentVisibility || {};
    const visibilityChanges: Record<string, any> = {};

    for (const [componentId, visible] of Object.entries(proposedVisibility)) {
      if (currentVisibility[componentId] !== visible) {
        visibilityChanges[componentId] = {
          current: currentVisibility[componentId] ?? true,
          proposed: visible,
          action: 'modify',
        };
      }
    }

    if (Object.keys(visibilityChanges).length > 0) {
      changes.componentVisibility = visibilityChanges;
    }

    const currentVariants = currentUI.variants || {};
    const proposedVariants = this.config.variants || {};
    const variantChanges: Record<string, any> = {};

    for (const [experimentId, variant] of Object.entries(proposedVariants)) {
      if (currentVariants[experimentId] !== variant) {
        variantChanges[experimentId] = {
          current: currentVariants[experimentId],
          proposed: variant,
          action: currentVariants[experimentId] ? 'modify' : 'add',
        };
      }
    }

    if (Object.keys(variantChanges).length > 0) {
      changes.variants = variantChanges;
    }

    const currentCSS = currentUI.cssVariables || {};
    const proposedCSS = this.config.cssVariables || {};
    const cssChanges: Record<string, any> = {};

    for (const [variable, value] of Object.entries(proposedCSS)) {
      if (currentCSS[variable] !== value) {
        cssChanges[variable] = {
          current: currentCSS[variable],
          proposed: value,
          action: currentCSS[variable] ? 'modify' : 'add',
        };
      }
    }

    if (Object.keys(cssChanges).length > 0) {
      changes.cssVariables = cssChanges;
    }

    return {
      discName: this.metadata.name,
      changesCount: Object.keys(changes).length,
      changes,
    };
  }

  /**
   * Validate UI disc configuration
   * @returns True if valid
   * @throws Error with validation details
   * @example
   * const isValid = await uiDisc.validate();
   */
  async validate(): Promise<boolean> {
    const errors: string[] = [];

    if (this.config.currentLayout) {
      const validLayouts = ['grid', 'list', 'compact'];
      if (!validLayouts.includes(this.config.currentLayout)) {
        errors.push(`Invalid layout type: ${this.config.currentLayout}`);
      }
    }

    if (this.config.activeTheme && this.config.themes) {
      if (!this.config.themes[this.config.activeTheme]) {
        errors.push(`Active theme '${this.config.activeTheme}' does not exist in themes`);
      }
    }

    if (this.config.layouts) {
      for (const [layoutName, layout] of Object.entries(this.config.layouts)) {
        if (!layout.name) {
          errors.push(`Layout '${layoutName}': name is required`);
        }
        if (!layout.type) {
          errors.push(`Layout '${layoutName}': type is required`);
        }
      }
    }

    if (this.config.themes) {
      for (const [themeName, theme] of Object.entries(this.config.themes)) {
        if (!theme.name) {
          errors.push(`Theme '${themeName}': name is required`);
        }
      }
    }

    if (this.config.components) {
      for (const [componentId, component] of Object.entries(this.config.components)) {
        if (!component.id) {
          errors.push(`Component '${componentId}': id is required`);
        }
        if (!component.type) {
          errors.push(`Component '${componentId}': type is required`);
        }
        if (component.visible === undefined) {
          errors.push(`Component '${componentId}': visible is required`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed:\n${errors.join('\n')}`);
    }

    return true;
  }

  /**
   * Get a specific layout
   * @param layoutName - Layout name to retrieve
   * @returns Layout object or null
   * @example
   * const layout = uiDisc.getLayout('dashboard');
   */
  getLayout(layoutName: string): UILayout | null {
    return this.config.layouts?.[layoutName] ?? null;
  }

  /**
   * Get a specific theme
   * @param themeName - Theme name to retrieve
   * @returns Theme object or null
   * @example
   * const theme = uiDisc.getTheme('dark');
   */
  getTheme(themeName: string): UITheme | null {
    return this.config.themes?.[themeName] ?? null;
  }

  /**
   * Get a component configuration
   * @param componentId - Component ID to retrieve
   * @returns Component object or null
   * @example
   * const component = uiDisc.getComponent('header');
   */
  getComponent(componentId: string): UIComponent | null {
    return this.config.components?.[componentId] ?? null;
  }

  /**
   * Get current dark mode state
   * @returns True if dark mode is enabled
   * @example
   * const isDark = uiDisc.isDarkMode();
   */
  isDarkMode(): boolean {
    return this.config.darkMode || false;
  }

  /**
   * Get current layout type
   * @returns Current layout type or undefined
   * @example
   * const layout = uiDisc.getCurrentLayout();
   */
  getCurrentLayout(): 'grid' | 'list' | 'compact' | undefined {
    return this.config.currentLayout;
  }

  /**
   * Get active theme name
   * @returns Active theme name or undefined
   * @example
   * const theme = uiDisc.getActiveTheme();
   */
  getActiveTheme(): string | undefined {
    return this.config.activeTheme;
  }

  /**
   * Get all CSS variable overrides
   * @returns Record of CSS variables
   * @example
   * const vars = uiDisc.getCSSVariables();
   */
  getCSSVariables(): Record<string, string> {
    return { ...this.config.cssVariables };
  }

  private generateId(): string {
    return `ui-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
