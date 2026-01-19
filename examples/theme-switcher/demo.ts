import { ThemeManager, ThemePresets, ThemePresetName } from './theme-manager';

/**
 * Theme Switcher Demo - Runnable demonstration
 * Shows runtime UI theme customization capabilities
 */
async function runDemo() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║          THEME SWITCHER DEMO - Universal DJ Layer        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const manager = new ThemeManager('admin');
  await manager.initialize();

  // Demo 1: Apply preset themes
  console.log('🎨 Step 1: Applying Preset Themes...\n');

  const presets: ThemePresetName[] = ['light', 'dark', 'ocean', 'forest', 'sunset'];

  for (const preset of presets) {
    await manager.applyPreset(preset);
    const theme = manager.getCurrentTheme();
    
    console.log(`\n📌 ${preset.toUpperCase()} Theme:`);
    console.log(`   Primary: ${theme.primaryColor}`);
    console.log(`   Secondary: ${theme.secondaryColor}`);
    console.log(`   Dark Mode: ${theme.darkMode ? 'Yes' : 'No'}`);
    console.log(`   Font Size: ${theme.fontSize}`);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Demo 2: Dark mode toggle
  console.log('\n\n🌙 Step 2: Dark Mode Toggle...\n');

  await manager.applyPreset('light');
  console.log('✅ Applied Light theme');
  console.log(`   Background: Light`);
  console.log(`   Text: Dark\n`);

  await new Promise(resolve => setTimeout(resolve, 500));

  await manager.setDarkMode(true);
  console.log('✅ Enabled Dark Mode');
  console.log(`   Background: Dark`);
  console.log(`   Text: Light\n`);

  // Demo 3: Custom color scheme
  console.log('🎨 Step 3: Custom Color Scheme...\n');

  await manager.setPrimaryColor('#FF1493');
  console.log('✅ Set Primary Color: #FF1493 (Deep Pink)');

  await manager.setSecondaryColor('#FFD700');
  console.log('✅ Set Secondary Color: #FFD700 (Gold)\n');

  // Demo 4: Font size adjustment
  console.log('📏 Step 4: Font Size Adjustment...\n');

  const fontSizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];

  for (const size of fontSizes) {
    await manager.setFontSize(size);
    console.log(`✅ Font Size: ${size.toUpperCase()}`);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Demo 5: Generate CSS
  console.log('\n\n🎭 Step 5: Generated CSS...\n');

  await manager.applyPreset('ocean');
  const css = manager.generateCSS();
  
  console.log('CSS Output for Ocean Theme:');
  console.log('─'.repeat(60));
  console.log(css);
  console.log('─'.repeat(60));

  // Demo 6: Theme export/import
  console.log('\n\n💾 Step 6: Theme Export/Import...\n');

  await manager.applyCustomTheme({
    primaryColor: '#9C27B0',
    secondaryColor: '#E91E63',
    darkMode: false,
    fontSize: 'large',
    fontFamily: 'Courier New, monospace'
  });

  const exported = manager.exportTheme();
  console.log('✅ Exported Custom Theme:');
  console.log(exported);

  console.log('\n✅ Importing theme back...');
  await manager.importTheme(exported);
  console.log('✅ Theme successfully imported!');

  // Demo 7: High contrast theme for accessibility
  console.log('\n\n♿ Step 7: Accessibility Theme...\n');

  await manager.applyPreset('highContrast');
  const accessTheme = manager.getCurrentTheme();
  
  console.log('✅ Applied High Contrast theme for accessibility:');
  console.log(`   Primary: ${accessTheme.primaryColor} (Black)`);
  console.log(`   Secondary: ${accessTheme.secondaryColor} (White)`);
  console.log(`   Font Size: ${accessTheme.fontSize} (Large)`);
  console.log(`   Dark Mode: ${accessTheme.darkMode ? 'Yes' : 'No'}`);

  // Demo 8: Real-time preview
  console.log('\n\n🔄 Step 8: Real-time Theme Preview...\n');

  console.log('Simulating real-time theme changes:\n');

  const previewPresets: ThemePresetName[] = ['light', 'dark', 'corporate', 'sunset'];

  for (const preset of previewPresets) {
    await manager.applyPreset(preset);
    const current = manager.getCurrentTheme();
    
    const darkModeIcon = current.darkMode ? '🌙' : '☀️';
    console.log(`${darkModeIcon} ${preset.padEnd(12)} | ${current.primaryColor} | ${current.fontSize}`);
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Final summary
  console.log('\n\n📊 Summary of Available Presets:\n');

  const presetNames = Object.keys(ThemePresets) as ThemePresetName[];
  
  console.log('┌────────────────┬──────────┬──────────┬───────────┐');
  console.log('│ Preset         │ Primary  │ DarkMode │ Font Size │');
  console.log('├────────────────┼──────────┼──────────┼───────────┤');

  for (const name of presetNames) {
    const preset = ThemePresets[name];
    const darkIcon = preset.darkMode ? '   ✓    ' : '   ✗    ';
    console.log(`│ ${name.padEnd(14)} │ ${preset.primaryColor} │ ${darkIcon} │ ${preset.fontSize.padEnd(9)} │`);
  }

  console.log('└────────────────┴──────────┴──────────┴───────────┘');

  await manager.cleanup();

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                   DEMO COMPLETED                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

// Run the demo
if (require.main === module) {
  runDemo().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  });
}

export { runDemo };
