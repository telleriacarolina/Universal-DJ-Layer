import { UIDisc, UIConfig, ThemeConfig, UIComponent, UILayout, UITheme } from './ui-disc';

describe('UIDisc', () => {
  describe('Constructor and Metadata', () => {
    test('creates disc with correct metadata', () => {
      const config: UIConfig = {
        name: 'test-ui',
      };

      const disc = new UIDisc(config);

      expect(disc.metadata.name).toBe('test-ui');
      expect(disc.metadata.type).toBe('ui');
      expect(disc.metadata.version).toBe('1.0.0');
      expect(disc.metadata.id).toContain('ui-');
      expect(disc.metadata.createdAt).toBeLessThanOrEqual(Date.now());
    });

    test('generates unique IDs for different instances', () => {
      const config: UIConfig = {
        name: 'test',
      };

      const disc1 = new UIDisc(config);
      const disc2 = new UIDisc(config);

      expect(disc1.metadata.id).not.toBe(disc2.metadata.id);
    });

    test('initializes with default values', () => {
      const disc = new UIDisc({ name: 'test' });

      expect(disc.isDarkMode()).toBe(false);
      expect(disc.getCurrentLayout()).toBeUndefined();
      expect(disc.getActiveTheme()).toBeUndefined();
      expect(disc.getCSSVariables()).toEqual({});
    });
  });

  describe('Theme Management', () => {
    test('sets theme configuration', () => {
      const disc = new UIDisc({ name: 'test', activeTheme: 'light' });

      const themeConfig: ThemeConfig = {
        colors: { primary: '#007bff', secondary: '#6c757d' },
        fonts: { body: 'Arial', heading: 'Georgia' },
        spacing: { small: 8, medium: 16, large: 24 },
      };

      disc.setTheme(themeConfig);

      const theme = disc.getTheme('light');
      expect(theme).toBeDefined();
      expect(theme?.colors).toEqual({ primary: '#007bff', secondary: '#6c757d' });
      expect(theme?.typography).toEqual({ body: 'Arial', heading: 'Georgia' });
      expect(theme?.spacing).toEqual({ small: 8, medium: 16, large: 24 });
    });

    test('merges theme properties without replacing', () => {
      const disc = new UIDisc({
        name: 'test',
        activeTheme: 'custom',
        themes: {
          custom: {
            name: 'custom',
            colors: { primary: '#ff0000', background: '#ffffff' },
          },
        },
      });

      disc.setTheme({ colors: { primary: '#00ff00' } });

      const theme = disc.getTheme('custom');
      expect(theme?.colors).toEqual({ primary: '#00ff00', background: '#ffffff' });
    });

    test('creates theme if it does not exist', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setTheme({ colors: { primary: '#007bff' } });

      const theme = disc.getTheme('default');
      expect(theme).toBeDefined();
      expect(theme?.colors).toEqual({ primary: '#007bff' });
    });

    test('supports custom theme properties', () => {
      const disc = new UIDisc({ name: 'test', activeTheme: 'custom' });

      disc.setTheme({
        colors: { primary: '#007bff' },
        customProp: 'customValue',
        anotherProp: { nested: 'value' },
      });

      const theme = disc.getTheme('custom');
      expect(theme?.customProp).toBe('customValue');
      expect(theme?.anotherProp).toEqual({ nested: 'value' });
    });

    test('updates timestamp when setting theme', () => {
      const disc = new UIDisc({ name: 'test' });

      const before = Date.now();
      disc.setTheme({ colors: { primary: '#007bff' } });
      const after = Date.now();

      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
      expect(disc.metadata.updatedAt!).toBeLessThanOrEqual(after);
    });

    test('getTheme returns null for non-existent theme', () => {
      const disc = new UIDisc({ name: 'test' });

      expect(disc.getTheme('nonexistent')).toBeNull();
    });
  });

  describe('Dark Mode', () => {
    test('toggles dark mode on', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.toggleDarkMode(true);

      expect(disc.isDarkMode()).toBe(true);
    });

    test('toggles dark mode off', () => {
      const disc = new UIDisc({ name: 'test', darkMode: true });

      disc.toggleDarkMode(false);

      expect(disc.isDarkMode()).toBe(false);
    });

    test('updates timestamp when toggling dark mode', () => {
      const disc = new UIDisc({ name: 'test' });

      const before = Date.now();
      disc.toggleDarkMode(true);
      const after = Date.now();

      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
      expect(disc.metadata.updatedAt!).toBeLessThanOrEqual(after);
    });
  });

  describe('Layout Switching', () => {
    test('sets grid layout', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setLayout('grid');

      expect(disc.getCurrentLayout()).toBe('grid');
    });

    test('sets list layout', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setLayout('list');

      expect(disc.getCurrentLayout()).toBe('list');
    });

    test('sets compact layout', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setLayout('compact');

      expect(disc.getCurrentLayout()).toBe('compact');
    });

    test('throws error for invalid layout', () => {
      const disc = new UIDisc({ name: 'test' });

      expect(() => disc.setLayout('invalid' as any)).toThrow('Invalid layout type');
    });

    test('updates timestamp when setting layout', () => {
      const disc = new UIDisc({ name: 'test' });

      const before = Date.now();
      disc.setLayout('grid');
      const after = Date.now();

      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
      expect(disc.metadata.updatedAt!).toBeLessThanOrEqual(after);
    });

    test('getLayout returns layout by name', () => {
      const layout: UILayout = {
        name: 'dashboard',
        type: 'grid',
        config: { columns: 3 },
        components: {},
      };

      const disc = new UIDisc({
        name: 'test',
        layouts: { dashboard: layout },
      });

      expect(disc.getLayout('dashboard')).toEqual(layout);
    });

    test('getLayout returns null for non-existent layout', () => {
      const disc = new UIDisc({ name: 'test' });

      expect(disc.getLayout('nonexistent')).toBeNull();
    });
  });

  describe('Component Visibility', () => {
    test('hides component', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.hideComponent('sidebar');

      expect(disc.isComponentVisible('sidebar')).toBe(false);
    });

    test('shows component', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.hideComponent('sidebar');
      disc.showComponent('sidebar');

      expect(disc.isComponentVisible('sidebar')).toBe(true);
    });

    test('component is visible by default', () => {
      const disc = new UIDisc({ name: 'test' });

      expect(disc.isComponentVisible('header')).toBe(true);
    });

    test('tracks multiple component visibility states', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.hideComponent('sidebar');
      disc.hideComponent('footer');
      disc.showComponent('header');

      expect(disc.isComponentVisible('sidebar')).toBe(false);
      expect(disc.isComponentVisible('footer')).toBe(false);
      expect(disc.isComponentVisible('header')).toBe(true);
    });

    test('getHiddenComponents returns array of hidden IDs', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.hideComponent('sidebar');
      disc.hideComponent('footer');
      disc.showComponent('header');

      const hidden = disc.getHiddenComponents();
      expect(hidden).toHaveLength(2);
      expect(hidden).toContain('sidebar');
      expect(hidden).toContain('footer');
    });

    test('getVisibleComponents returns array of visible IDs', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.showComponent('header');
      disc.showComponent('nav');
      disc.hideComponent('sidebar');

      const visible = disc.getVisibleComponents();
      expect(visible).toHaveLength(2);
      expect(visible).toContain('header');
      expect(visible).toContain('nav');
    });

    test('updates timestamp when changing visibility', () => {
      const disc = new UIDisc({ name: 'test' });

      const before = Date.now();
      disc.hideComponent('sidebar');
      const after = Date.now();

      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
      expect(disc.metadata.updatedAt!).toBeLessThanOrEqual(after);
    });

    test('getComponent returns component by ID', () => {
      const component: UIComponent = {
        id: 'header',
        type: 'navbar',
        visible: true,
        props: { title: 'My App' },
      };

      const disc = new UIDisc({
        name: 'test',
        components: { header: component },
      });

      expect(disc.getComponent('header')).toEqual(component);
    });

    test('getComponent returns null for non-existent component', () => {
      const disc = new UIDisc({ name: 'test' });

      expect(disc.getComponent('nonexistent')).toBeNull();
    });
  });

  describe('A/B Test Variants', () => {
    test('sets variant for experiment', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setVariant('checkout-flow', 'variant-b');

      expect(disc.getVariant('checkout-flow')).toBe('variant-b');
    });

    test('sets multiple variants for different experiments', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setVariant('checkout-flow', 'variant-b');
      disc.setVariant('homepage-hero', 'variant-a');
      disc.setVariant('pricing-table', 'control');

      expect(disc.getVariant('checkout-flow')).toBe('variant-b');
      expect(disc.getVariant('homepage-hero')).toBe('variant-a');
      expect(disc.getVariant('pricing-table')).toBe('control');
    });

    test('overwrites previous variant for same experiment', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setVariant('checkout-flow', 'variant-a');
      disc.setVariant('checkout-flow', 'variant-b');

      expect(disc.getVariant('checkout-flow')).toBe('variant-b');
    });

    test('returns undefined for non-existent experiment', () => {
      const disc = new UIDisc({ name: 'test' });

      expect(disc.getVariant('nonexistent')).toBeUndefined();
    });

    test('updates timestamp when setting variant', () => {
      const disc = new UIDisc({ name: 'test' });

      const before = Date.now();
      disc.setVariant('checkout-flow', 'variant-b');
      const after = Date.now();

      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
      expect(disc.metadata.updatedAt!).toBeLessThanOrEqual(after);
    });
  });

  describe('CSS Variable Overrides', () => {
    test('sets CSS variable with -- prefix', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setCSSVariable('--primary-color', '#ff0000');

      const vars = disc.getCSSVariables();
      expect(vars['--primary-color']).toBe('#ff0000');
    });

    test('sets CSS variable without -- prefix', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setCSSVariable('primary-color', '#ff0000');

      const vars = disc.getCSSVariables();
      expect(vars['--primary-color']).toBe('#ff0000');
    });

    test('sets multiple CSS variables', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setCSSVariable('--primary-color', '#ff0000');
      disc.setCSSVariable('--secondary-color', '#00ff00');
      disc.setCSSVariable('--font-size', '16px');

      const vars = disc.getCSSVariables();
      expect(vars['--primary-color']).toBe('#ff0000');
      expect(vars['--secondary-color']).toBe('#00ff00');
      expect(vars['--font-size']).toBe('16px');
    });

    test('removes CSS variable with -- prefix', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setCSSVariable('--primary-color', '#ff0000');
      disc.removeCSSVariable('--primary-color');

      const vars = disc.getCSSVariables();
      expect(vars['--primary-color']).toBeUndefined();
    });

    test('removes CSS variable without -- prefix', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setCSSVariable('primary-color', '#ff0000');
      disc.removeCSSVariable('primary-color');

      const vars = disc.getCSSVariables();
      expect(vars['--primary-color']).toBeUndefined();
    });

    test('removeCSSVariable does nothing for non-existent variable', () => {
      const disc = new UIDisc({ name: 'test' });

      expect(() => disc.removeCSSVariable('nonexistent')).not.toThrow();
    });

    test('getCSSVariables returns copy of variables', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setCSSVariable('--primary-color', '#ff0000');
      const vars1 = disc.getCSSVariables();
      vars1['--secondary-color'] = '#00ff00';
      const vars2 = disc.getCSSVariables();

      expect(vars2['--secondary-color']).toBeUndefined();
    });

    test('updates timestamp when setting CSS variable', () => {
      const disc = new UIDisc({ name: 'test' });

      const before = Date.now();
      disc.setCSSVariable('--primary-color', '#ff0000');
      const after = Date.now();

      expect(disc.metadata.updatedAt).toBeDefined();
      expect(disc.metadata.updatedAt!).toBeGreaterThanOrEqual(before);
      expect(disc.metadata.updatedAt!).toBeLessThanOrEqual(after);
    });
  });

  describe('Apply Method', () => {
    test('applies all UI configuration to context', async () => {
      const disc = new UIDisc({
        name: 'test',
        activeTheme: 'dark',
        darkMode: true,
        currentLayout: 'grid',
      });

      disc.hideComponent('sidebar');
      disc.setVariant('experiment-1', 'variant-a');
      disc.setCSSVariable('--primary-color', '#ff0000');

      const context = {};
      const result = await disc.apply(context);

      expect(result.ui).toBeDefined();
      expect(result.ui.activeTheme).toBe('dark');
      expect(result.ui.darkMode).toBe(true);
      expect(result.ui.currentLayout).toBe('grid');
      expect(result.ui.componentVisibility.sidebar).toBe(false);
      expect(result.ui.variants['experiment-1']).toBe('variant-a');
      expect(result.ui.cssVariables['--primary-color']).toBe('#ff0000');
    });

    test('stores previous state for revert', async () => {
      const disc = new UIDisc({ name: 'test' });

      const context = {
        ui: {
          activeTheme: 'light',
          darkMode: false,
        },
      };

      await disc.apply(context);
      const reverted = await disc.revert(context);

      expect(reverted.ui.activeTheme).toBe('light');
      expect(reverted.ui.darkMode).toBe(false);
    });

    test('throws error for invalid context', async () => {
      const disc = new UIDisc({ name: 'test' });

      await expect(disc.apply(null)).rejects.toThrow('Invalid context');
      await expect(disc.apply(undefined)).rejects.toThrow('Invalid context');
      await expect(disc.apply('string')).rejects.toThrow('Invalid context');
    });

    test('initializes ui object if not present', async () => {
      const disc = new UIDisc({ name: 'test' });

      const context = {};
      await disc.apply(context);

      expect(context).toHaveProperty('ui');
    });

    test('applies themes and layouts', async () => {
      const theme: UITheme = {
        name: 'custom',
        colors: { primary: '#007bff' },
      };

      const layout: UILayout = {
        name: 'dashboard',
        type: 'grid',
        config: { columns: 3 },
        components: {},
      };

      const disc = new UIDisc({
        name: 'test',
        themes: { custom: theme },
        layouts: { dashboard: layout },
      });

      const context = {};
      const result = await disc.apply(context);

      expect(result.ui.themes.custom).toEqual(theme);
      expect(result.ui.layouts.dashboard).toEqual(layout);
    });
  });

  describe('Revert Method', () => {
    test('reverts UI to previous state', async () => {
      const disc = new UIDisc({ name: 'test', darkMode: true });

      const context = { ui: { darkMode: false } };
      await disc.apply(context);

      expect(context.ui.darkMode).toBe(true);

      await disc.revert(context);
      expect(context.ui.darkMode).toBe(false);
    });

    test('throws error if no previous state', async () => {
      const disc = new UIDisc({ name: 'test' });

      await expect(disc.revert({})).rejects.toThrow('No previous state to revert to');
    });

    test('throws error for invalid context', async () => {
      const disc = new UIDisc({ name: 'test' });

      await disc.apply({});

      await expect(disc.revert(null)).rejects.toThrow('Invalid context');
      await expect(disc.revert(undefined)).rejects.toThrow('Invalid context');
    });

    test('clears previous state after revert', async () => {
      const disc = new UIDisc({ name: 'test' });

      const context = {};
      await disc.apply(context);
      await disc.revert(context);

      await expect(disc.revert(context)).rejects.toThrow('No previous state');
    });
  });

  describe('Preview Method', () => {
    test('shows changes for dark mode', async () => {
      const disc = new UIDisc({ name: 'test', darkMode: true });

      const context = { ui: { darkMode: false } };
      const preview = await disc.preview(context);

      expect(preview.changes.darkMode).toBeDefined();
      expect(preview.changes.darkMode.current).toBe(false);
      expect(preview.changes.darkMode.proposed).toBe(true);
    });

    test('shows changes for layout', async () => {
      const disc = new UIDisc({ name: 'test', currentLayout: 'grid' });

      const context = { ui: { currentLayout: 'list' } };
      const preview = await disc.preview(context);

      expect(preview.changes.currentLayout).toBeDefined();
      expect(preview.changes.currentLayout.current).toBe('list');
      expect(preview.changes.currentLayout.proposed).toBe('grid');
    });

    test('shows changes for theme', async () => {
      const disc = new UIDisc({ name: 'test', activeTheme: 'dark' });

      const context = { ui: { activeTheme: 'light' } };
      const preview = await disc.preview(context);

      expect(preview.changes.activeTheme).toBeDefined();
      expect(preview.changes.activeTheme.current).toBe('light');
      expect(preview.changes.activeTheme.proposed).toBe('dark');
    });

    test('shows component visibility changes', async () => {
      const disc = new UIDisc({ name: 'test' });
      disc.hideComponent('sidebar');

      const context = { ui: { componentVisibility: {} } };
      const preview = await disc.preview(context);

      expect(preview.changes.componentVisibility).toBeDefined();
      expect(preview.changes.componentVisibility.sidebar.current).toBe(true);
      expect(preview.changes.componentVisibility.sidebar.proposed).toBe(false);
    });

    test('shows variant changes', async () => {
      const disc = new UIDisc({ name: 'test' });
      disc.setVariant('experiment-1', 'variant-b');

      const context = { ui: { variants: { 'experiment-1': 'variant-a' } } };
      const preview = await disc.preview(context);

      expect(preview.changes.variants).toBeDefined();
      expect(preview.changes.variants['experiment-1'].current).toBe('variant-a');
      expect(preview.changes.variants['experiment-1'].proposed).toBe('variant-b');
    });

    test('shows CSS variable changes', async () => {
      const disc = new UIDisc({ name: 'test' });
      disc.setCSSVariable('--primary-color', '#ff0000');

      const context = { ui: { cssVariables: {} } };
      const preview = await disc.preview(context);

      expect(preview.changes.cssVariables).toBeDefined();
      expect(preview.changes.cssVariables['--primary-color'].proposed).toBe('#ff0000');
      expect(preview.changes.cssVariables['--primary-color'].action).toBe('add');
    });

    test('returns correct changesCount', async () => {
      const disc = new UIDisc({
        name: 'test',
        darkMode: true,
        currentLayout: 'grid',
        activeTheme: 'dark',
      });

      const context = {
        ui: {
          darkMode: false,
          currentLayout: 'list',
          activeTheme: 'light',
        },
      };
      const preview = await disc.preview(context);

      expect(preview.changesCount).toBe(3);
    });

    test('returns empty changes when no differences', async () => {
      const disc = new UIDisc({
        name: 'test',
        darkMode: false,
        currentLayout: 'grid',
      });

      const context = {
        ui: {
          darkMode: false,
          currentLayout: 'grid',
        },
      };
      const preview = await disc.preview(context);

      expect(preview.changesCount).toBe(0);
      expect(Object.keys(preview.changes)).toHaveLength(0);
    });

    test('includes disc name in preview', async () => {
      const disc = new UIDisc({ name: 'my-ui-disc' });

      const preview = await disc.preview({});

      expect(preview.discName).toBe('my-ui-disc');
    });
  });

  describe('Validate Method', () => {
    test('validates valid configuration', async () => {
      const disc = new UIDisc({
        name: 'test',
        currentLayout: 'grid',
        activeTheme: 'light',
        themes: {
          light: { name: 'light', colors: {} },
        },
      });

      const result = await disc.validate();
      expect(result).toBe(true);
    });

    test('throws error for invalid layout type', async () => {
      const disc = new UIDisc({
        name: 'test',
        currentLayout: 'invalid' as any,
      });

      await expect(disc.validate()).rejects.toThrow('Invalid layout type');
    });

    test('throws error for non-existent active theme', async () => {
      const disc = new UIDisc({
        name: 'test',
        activeTheme: 'nonexistent',
        themes: {},
      });

      await expect(disc.validate()).rejects.toThrow("Active theme 'nonexistent' does not exist");
    });

    test('validates layout structure', async () => {
      const disc = new UIDisc({
        name: 'test',
        layouts: {
          invalid: { name: '', type: '', config: {}, components: {} },
        },
      });

      await expect(disc.validate()).rejects.toThrow('Layout');
    });

    test('validates theme structure', async () => {
      const disc = new UIDisc({
        name: 'test',
        themes: {
          invalid: { name: '' },
        },
      });

      await expect(disc.validate()).rejects.toThrow('Theme');
    });

    test('validates component structure', async () => {
      const disc = new UIDisc({
        name: 'test',
        components: {
          invalid: { id: '', type: '', visible: true },
        },
      });

      await expect(disc.validate()).rejects.toThrow('Component');
    });

    test('validates component requires visible property', async () => {
      const disc = new UIDisc({
        name: 'test',
        components: {
          invalid: { id: 'invalid', type: 'button', visible: undefined as any },
        },
      });

      await expect(disc.validate()).rejects.toThrow('visible is required');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty config', async () => {
      const disc = new UIDisc({ name: 'test' });

      const context = {};
      const result = await disc.apply(context);

      expect(result.ui).toBeDefined();
      expect(result.ui.themes).toEqual({});
      expect(result.ui.layouts).toEqual({});
    });

    test('handles multiple operations in sequence', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.setLayout('grid');
      disc.toggleDarkMode(true);
      disc.hideComponent('sidebar');
      disc.setVariant('exp-1', 'variant-a');
      disc.setCSSVariable('--color', '#fff');

      expect(disc.getCurrentLayout()).toBe('grid');
      expect(disc.isDarkMode()).toBe(true);
      expect(disc.isComponentVisible('sidebar')).toBe(false);
      expect(disc.getVariant('exp-1')).toBe('variant-a');
      expect(disc.getCSSVariables()['--color']).toBe('#fff');
    });

    test('handles component visibility toggle', () => {
      const disc = new UIDisc({ name: 'test' });

      disc.hideComponent('modal');
      expect(disc.isComponentVisible('modal')).toBe(false);

      disc.showComponent('modal');
      expect(disc.isComponentVisible('modal')).toBe(true);

      disc.hideComponent('modal');
      expect(disc.isComponentVisible('modal')).toBe(false);
    });

    test('preserves theme when merging', () => {
      const disc = new UIDisc({
        name: 'test',
        activeTheme: 'base',
        themes: {
          base: {
            name: 'base',
            colors: { primary: '#000', secondary: '#fff' },
            spacing: { small: 4 },
          },
        },
      });

      disc.setTheme({
        colors: { primary: '#111' },
        spacing: { large: 24 },
      });

      const theme = disc.getTheme('base');
      expect(theme?.colors?.primary).toBe('#111');
      expect(theme?.colors?.secondary).toBe('#fff');
      expect(theme?.spacing?.small).toBe(4);
      expect(theme?.spacing?.large).toBe(24);
    });

    test('handles apply and revert cycle multiple times', async () => {
      const disc = new UIDisc({ name: 'test', darkMode: true });

      const context = { ui: { darkMode: false } };

      await disc.apply(context);
      expect(context.ui.darkMode).toBe(true);

      await disc.revert(context);
      expect(context.ui.darkMode).toBe(false);

      await disc.apply(context);
      expect(context.ui.darkMode).toBe(true);

      await disc.revert(context);
      expect(context.ui.darkMode).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    test('complete UI configuration scenario', async () => {
      const disc = new UIDisc({
        name: 'app-ui',
        themes: {
          light: {
            name: 'light',
            colors: { primary: '#007bff', background: '#ffffff' },
          },
          dark: {
            name: 'dark',
            colors: { primary: '#0056b3', background: '#000000' },
          },
        },
        layouts: {
          dashboard: {
            name: 'dashboard',
            type: 'grid',
            config: { columns: 3, gap: 16 },
            components: {},
          },
        },
      });

      disc.setLayout('grid');
      disc.toggleDarkMode(true);
      disc.hideComponent('banner');
      disc.hideComponent('popup');
      disc.setVariant('checkout-test', 'variant-b');
      disc.setVariant('hero-test', 'control');
      disc.setCSSVariable('--header-height', '60px');
      disc.setCSSVariable('--sidebar-width', '250px');

      disc.setTheme({
        colors: { accent: '#ff6b6b' },
        fonts: { body: 'Roboto' },
      });

      const context = {};
      const result = await disc.apply(context);

      expect(result.ui.currentLayout).toBe('grid');
      expect(result.ui.darkMode).toBe(true);
      expect(result.ui.componentVisibility.banner).toBe(false);
      expect(result.ui.componentVisibility.popup).toBe(false);
      expect(result.ui.variants['checkout-test']).toBe('variant-b');
      expect(result.ui.variants['hero-test']).toBe('control');
      expect(result.ui.cssVariables['--header-height']).toBe('60px');
      expect(result.ui.cssVariables['--sidebar-width']).toBe('250px');
      expect(result.ui.themes.dark.colors.primary).toBe('#0056b3');

      const preview = await disc.preview({});
      expect(preview.changesCount).toBeGreaterThan(0);

      const isValid = await disc.validate();
      expect(isValid).toBe(true);
    });
  });
});
