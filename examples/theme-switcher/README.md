# Theme Switcher Example

A complete theme management implementation demonstrating dynamic UI customization with preset themes and real-time updates.

## Features

- 🎨 **Preset Themes**: 8 built-in themes (light, dark, ocean, forest, sunset, etc.)
- 🌙 **Dark Mode**: Toggle between light and dark modes
- 📏 **Font Customization**: Adjustable font size and family
- 🎨 **Color Customization**: Custom primary and secondary colors
- 💾 **Import/Export**: Save and load themes as JSON
- 📝 **CSS Generation**: Generate CSS variables from theme settings

## Usage

### Basic Setup

```typescript
import { ThemeManager } from './examples/theme-switcher';

const manager = new ThemeManager('user-123');
await manager.initialize();
```

### Applying Preset Themes

```typescript
// Apply built-in preset
await manager.applyPreset('dark');
await manager.applyPreset('ocean');
await manager.applyPreset('highContrast');

// Available presets:
// - light
// - dark
// - highContrast
// - ocean
// - forest
// - sunset
// - corporate
// - accessibility
```

### Custom Theme Configuration

```typescript
// Apply custom theme
await manager.applyCustomTheme({
  primaryColor: '#ff6b6b',
  secondaryColor: '#4ecdc4',
  darkMode: true,
  fontSize: 'large',
  fontFamily: 'Helvetica, sans-serif'
});

// Or update individual properties
await manager.setPrimaryColor('#007bff');
await manager.setDarkMode(true);
await manager.setFontSize('medium');
```

### Generating CSS

```typescript
// Generate CSS variables from current theme
const css = manager.generateCSS();

// Output example:
// :root {
//   --primary-color: #007bff;
//   --secondary-color: #6c757d;
//   --background-color: #1a1a1a;
//   --text-color: #ffffff;
//   --font-size: 16px;
//   --font-family: Arial, sans-serif;
// }
```

### Import/Export Themes

```typescript
// Export current theme
const themeJson = manager.exportTheme();
// Save to file or localStorage

// Import saved theme
await manager.importTheme(themeJson);
```

## Running the Demo

```bash
# Compile TypeScript
npm run build

# Run the demo
node dist/examples/theme-switcher/demo.js
```

Or with ts-node:

```bash
npx ts-node examples/theme-switcher/demo.ts
```

## Demo Output

The demo demonstrates:

1. **Preset Application**: Cycling through all 8 built-in themes
2. **Custom Themes**: Creating and applying custom color schemes
3. **Dark Mode**: Toggling between light and dark modes
4. **Font Customization**: Changing font size and family
5. **CSS Generation**: Generating CSS variables for web integration
6. **Import/Export**: Saving and loading theme configurations

## Integration Example

### Web Application

```typescript
import { ThemeManager } from 'universal-dj-layer/examples/theme-switcher';

class Application {
  private themeManager: ThemeManager;

  async initialize() {
    this.themeManager = new ThemeManager('user-123');
    await this.themeManager.initialize();

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('userTheme');
    if (savedTheme) {
      await this.themeManager.importTheme(savedTheme);
    } else {
      await this.themeManager.applyPreset('light');
    }

    this.applyThemeToDOM();
  }

  applyThemeToDOM() {
    const css = this.themeManager.generateCSS();
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  async switchTheme(presetName: string) {
    await this.themeManager.applyPreset(presetName);
    this.applyThemeToDOM();
    
    // Save to localStorage
    const themeJson = this.themeManager.exportTheme();
    localStorage.setItem('userTheme', themeJson);
  }

  async toggleDarkMode() {
    const currentTheme = this.themeManager.getCurrentTheme();
    await this.themeManager.setDarkMode(!currentTheme.darkMode);
    this.applyThemeToDOM();
  }
}
```

### React Integration

```typescript
import { useState, useEffect } from 'react';
import { ThemeManager } from 'universal-dj-layer/examples/theme-switcher';

export function useTheme() {
  const [themeManager] = useState(() => new ThemeManager('user'));
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    themeManager.initialize().then(() => {
      setTheme(themeManager.getCurrentTheme());
    });
  }, []);

  const applyPreset = async (presetName) => {
    await themeManager.applyPreset(presetName);
    setTheme(themeManager.getCurrentTheme());
  };

  const toggleDarkMode = async () => {
    await themeManager.setDarkMode(!theme.darkMode);
    setTheme(themeManager.getCurrentTheme());
  };

  return { theme, applyPreset, toggleDarkMode, themeManager };
}
```

## API Reference

### ThemeManager

#### Methods

- `initialize()`: Initialize the theme manager
- `applyPreset(presetName)`: Apply a built-in theme preset
- `applyCustomTheme(theme)`: Apply a custom theme configuration
- `setPrimaryColor(color)`: Set primary color (hex format)
- `setSecondaryColor(color)`: Set secondary color (hex format)
- `setDarkMode(enabled)`: Toggle dark mode
- `setFontSize(size)`: Set font size ('small', 'medium', 'large')
- `setFontFamily(fontFamily)`: Set font family
- `getCurrentTheme()`: Get current theme configuration
- `generateCSS()`: Generate CSS variables from theme
- `exportTheme()`: Export theme as JSON string
- `importTheme(jsonString)`: Import theme from JSON string
- `cleanup()`: Cleanup resources

### Theme Configuration

```typescript
interface ThemeConfig {
  primaryColor: string;        // Hex color (#RRGGBB)
  secondaryColor: string;      // Hex color (#RRGGBB)
  darkMode: boolean;           // Dark mode enabled
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;          // CSS font family
}
```

## Best Practices

1. **Validate Colors**: Always use hex format (#RRGGBB) for colors
2. **Save Preferences**: Persist user theme choices in localStorage or database
3. **Accessibility**: Consider high-contrast themes for accessibility
4. **Performance**: Cache generated CSS to avoid repeated generation
5. **Fallbacks**: Provide default theme if saved theme fails to load
6. **Testing**: Test themes across different browsers and devices

## Common Patterns

### User Preference Persistence

```typescript
// Save theme preference
const saveTheme = async (presetName: string) => {
  await themeManager.applyPreset(presetName);
  const themeJson = themeManager.exportTheme();
  localStorage.setItem('userTheme', themeJson);
};

// Load theme preference
const loadTheme = async () => {
  const saved = localStorage.getItem('userTheme');
  if (saved) {
    await themeManager.importTheme(saved);
  }
};
```

### Dynamic Theme Switching

```typescript
// Theme selector component
const themes = ['light', 'dark', 'ocean', 'forest'];
const currentTheme = themeManager.getCurrentTheme();

themes.forEach(themeName => {
  button.onclick = async () => {
    await themeManager.applyPreset(themeName);
    updateUI();
  };
});
```

### System Theme Detection

```typescript
// Detect system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
await themeManager.setDarkMode(prefersDark);

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', async (e) => {
    await themeManager.setDarkMode(e.matches);
  });
```

## Related Examples

- [Feature Flags](../feature-flags/README.md) - Controlled feature rollouts
- [A/B Testing](../ab-testing/README.md) - Theme variant testing
- [Permission Manager](../permission-manager/README.md) - Theme customization permissions

## Architecture

This example uses:
- **ThemeDisc**: Core disc for theme configuration logic
- **DJEngine**: Control layer orchestration
- **State Management**: Persistent theme state
- **Validation**: Color and configuration validation

## Learn More

- [Getting Started Guide](../../docs/GETTING_STARTED.md)
- [Disc Development Guide](../../docs/DISC_DEVELOPMENT.md)
- [API Reference](../../docs/API.md)
