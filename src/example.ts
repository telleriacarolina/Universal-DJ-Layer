/**
 * Example usage of DJEngine
 * This demonstrates the core functionality of the DJ Control Layer
 */

import { DJEngine, Disc, Role, Scope } from './index';

// Initialize the engine with a Creator actor
const engine = new DJEngine('SystemAdmin', Role.Creator);

console.log('\n=== Universal DJ Layer - Example Usage ===\n');

// Define sample discs
const loggingDisc: Disc = {
  name: 'EnhancedLogging',
  description: 'Adds verbose logging capabilities',
  scope: Scope.Global,
  allowedRoles: [Role.Creator, Role.Admin, Role.Moderator],
  isTemporary: true,
  execute: () => {
    console.log('  → Enhanced logging is now active!');
  }
};

const debugDisc: Disc = {
  name: 'DebugMode',
  description: 'Enables debug mode for development',
  scope: Scope.Local,
  allowedRoles: [Role.Creator, Role.Admin],
  isTemporary: true,
  execute: () => {
    console.log('  → Debug mode activated!');
  }
};

const securityDisc: Disc = {
  name: 'SecurityEnhancement',
  description: 'Permanent security improvements',
  scope: Scope.Global,
  allowedRoles: [Role.Creator],
  isTemporary: false,
  execute: () => {
    console.log('  → Security enhancements applied!');
  }
};

// Register discs
console.log('1. Registering discs...');
engine.registerDisc(loggingDisc);
engine.registerDisc(debugDisc);
engine.registerDisc(securityDisc);
console.log(`   Registered ${engine.getRegisteredDiscs().length} discs\n`);

// Activate discs
console.log('2. Activating discs...');
engine.activateDisc('EnhancedLogging');
engine.activateDisc('DebugMode');
console.log(`   Active discs: ${engine.getActiveDiscs().join(', ')}\n`);

// Check disc status
console.log('3. Checking disc status...');
console.log(`   EnhancedLogging is active: ${engine.isDiscActive('EnhancedLogging')}`);
console.log(`   SecurityEnhancement is active: ${engine.isDiscActive('SecurityEnhancement')}\n`);

// Change actor and test permissions
console.log('4. Testing role-based permissions...');
engine.setActor('RegularUser', Role.User);
try {
  engine.activateDisc('SecurityEnhancement');
} catch (error) {
  console.log(`   ✓ Correctly blocked: ${(error as Error).message}\n`);
}

// Switch back to admin and activate security disc
engine.setActor('SystemAdmin', Role.Creator);
engine.activateDisc('SecurityEnhancement');
console.log(`   ✓ Security disc activated by Creator\n`);

// Deactivate temporary discs
console.log('5. Deactivating temporary discs...');
engine.deactivateDisc('EnhancedLogging');
engine.deactivateDisc('DebugMode');
console.log(`   Active discs: ${engine.getActiveDiscs().join(', ')}\n`);

// Show event log
console.log('6. Event Log Summary:');
const logs = engine.getEventLog();
console.log(`   Total events logged: ${logs.length}`);
console.log('   Recent events:');
logs.slice(-5).forEach(log => {
  console.log(`   - ${log.event} ${log.discName ? `(${log.discName})` : ''} by ${log.actor}`);
});

console.log('\n=== Example Complete ===\n');
