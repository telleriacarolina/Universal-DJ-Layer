/**
 * Example Usage: DJEngine with StateManager and AuditLog Integration
 * 
 * This example demonstrates how to use the integrated DJEngine with
 * StateManager and AuditLog for complete state management and audit trails.
 */

import { DJEngine } from './core/dj-engine';
import { StateManager } from './core/state-manager';
import { AuditLog } from './audit/audit-log';
import type { Disc, DiscMetadata } from './discs/feature-disc';
import type { Role, RoleMetadata } from './roles/creator';

// Mock Disc for demonstration
class ExampleDisc implements Disc {
  metadata: DiscMetadata;
  private config: any;

  constructor(id: string, config: any) {
    this.metadata = {
      id,
      name: 'Example Feature Disc',
      type: 'feature',
      version: '1.0.0',
      createdAt: Date.now(),
    };
    this.config = config;
  }

  async apply(context: any): Promise<any> {
    return { ...this.config };
  }

  async revert(context: any): Promise<any> {
    return {};
  }

  async preview(context: any): Promise<any> {
    return { ...this.config };
  }

  async validate(): Promise<boolean> {
    return true;
  }
}

// Mock Role for demonstration
class ExampleRole implements Role {
  metadata: RoleMetadata;

  constructor(userId: string, roleType: string = 'creator') {
    this.metadata = {
      roleId: `role-${userId}`,
      roleType,
      userId,
      grantedAt: Date.now(),
    };
  }

  hasPermission(permission: string): boolean {
    return true;
  }

  getPermissions(): string[] {
    return ['apply-control', 'revert-control', 'preview-control'];
  }

  getHierarchyLevel(): number {
    return 100;
  }
}

async function main() {
  console.log('=== DJEngine Integration Example ===\n');

  // Create custom StateManager and AuditLog instances
  const stateManager = new StateManager({ maxSnapshots: 100 });
  const auditLog = new AuditLog({ retentionDays: 365, enabled: true });

  // Initialize DJEngine with custom instances
  const dj = new DJEngine({
    creatorId: 'user-123',
    enableAudit: true,
    stateManager,
    auditLog,
  });

  console.log('✓ DJEngine initialized with StateManager and AuditLog\n');

  // Create a disc and role
  const disc = new ExampleDisc('feature-toggle-1', {
    darkMode: true,
    betaFeatures: true,
  });
  const role = new ExampleRole('user-123', 'creator');

  // 1. Preview before applying
  console.log('1. Previewing control...');
  const preview = await dj.previewControl(disc, role);
  console.log('   Preview safe?', preview.safe);
  console.log('   Affected systems:', preview.affectedSystems);
  console.log('   Potential issues:', preview.potentialIssues.length, '\n');

  // 2. Apply control with automatic snapshot + audit
  console.log('2. Applying control...');
  const result = await dj.applyControl(disc, role);
  console.log('   Control ID:', result.controlId);
  console.log('   Status:', result.status);
  console.log('   Timestamp:', new Date(result.timestamp).toISOString());
  console.log('   Affected systems:', result.affectedSystems, '\n');

  // 3. Query audit trail
  console.log('3. Querying audit trail...');
  const trail = await dj.getAuditTrail({ controlId: result.controlId });
  console.log('   Audit entries found:', trail.length);
  console.log('   Latest entry action:', trail[0]?.action);
  console.log('   Latest entry result:', trail[0]?.result, '\n');

  // 4. Get control history
  console.log('4. Getting control history...');
  const history = await dj.getControlHistory(result.controlId);
  console.log('   History entries:', history.length);
  console.log('   Latest change type:', history[0]?.changeType, '\n');

  // 5. List snapshots
  console.log('5. Listing snapshots...');
  const snapshots = await dj.listSnapshots({ controlId: result.controlId });
  console.log('   Total snapshots:', snapshots.length);
  console.log('   Latest snapshot ID:', snapshots[0]?.snapshotId, '\n');

  // 6. Get diff for control
  console.log('6. Getting control diff...');
  const diff = await dj.getDiff(result.controlId);
  console.log('   Before state:', JSON.stringify(diff.before));
  console.log('   After state:', JSON.stringify(diff.after), '\n');

  // 7. Revert control
  console.log('7. Reverting control...');
  await dj.revertControl(result.controlId, role);
  console.log('   Control reverted successfully\n');

  // 8. Query audit trail after revert
  console.log('8. Final audit trail...');
  const finalTrail = await dj.getAuditTrail({ controlId: result.controlId });
  console.log('   Total audit entries:', finalTrail.length);
  const applyEntry = finalTrail.find(e => e.action === 'apply');
  const revertEntry = finalTrail.find(e => e.action === 'revert');
  console.log('   Apply entry:', applyEntry ? '✓' : '✗');
  console.log('   Revert entry:', revertEntry ? '✓' : '✗');

  console.log('\n=== Integration Example Complete ===');
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
