import { PermissionManager } from './permission-manager';
import { Permission } from '../../src/core/types';

/**
 * Demo: Dynamic Permission Management
 */
async function runDemo() {
  console.log('='.repeat(80));
  console.log('Universal DJ Layer - Permission Manager Demo');
  console.log('='.repeat(80));
  console.log();

  const manager = new PermissionManager();
  await manager.initialize();

  // Demo 1: Grant Basic Permissions
  console.log('📋 Demo 1: Grant Basic Permissions');
  console.log('-'.repeat(80));

  const readGrant = await manager.grantPermission(
    'user-001',
    'Alice',
    Permission.READ,
    'admin-001',
    { reason: 'Standard user access' }
  );

  console.log(`✓ Granted READ permission to Alice`);
  console.log(`  Grant ID: ${readGrant.id}`);
  console.log(`  Granted by: ${readGrant.grantedBy}`);
  console.log(`  Expires: ${readGrant.expiresAt || 'Never'}`);
  console.log();

  const writeGrant = await manager.grantPermission(
    'user-001',
    'Alice',
    Permission.WRITE,
    'admin-001',
    { 
      reason: 'Project contributor',
      expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  );

  console.log(`✓ Granted WRITE permission to Alice (temporary)`);
  console.log(`  Grant ID: ${writeGrant.id}`);
  console.log(`  Expires at: ${writeGrant.expiresAt?.toLocaleString()}`);
  console.log();

  // Demo 2: Check Permissions
  console.log('📋 Demo 2: Check User Permissions');
  console.log('-'.repeat(80));

  const readCheck = await manager.hasPermission('user-001', Permission.READ);
  console.log(`✓ Alice has READ permission: ${readCheck.granted}`);
  if (readCheck.expiresAt) {
    console.log(`  Expires: ${readCheck.expiresAt.toLocaleString()}`);
  }

  const writeCheck = await manager.hasPermission('user-001', Permission.WRITE);
  console.log(`✓ Alice has WRITE permission: ${writeCheck.granted}`);
  if (writeCheck.expiresAt) {
    console.log(`  Expires: ${writeCheck.expiresAt.toLocaleString()}`);
  }

  const deleteCheck = await manager.hasPermission('user-001', Permission.DELETE);
  console.log(`✓ Alice has DELETE permission: ${deleteCheck.granted}`);
  if (!deleteCheck.granted && deleteCheck.reason) {
    console.log(`  Reason: ${deleteCheck.reason}`);
  }
  console.log();

  // Demo 3: Resource-Specific Permissions
  console.log('📋 Demo 3: Resource-Specific Permissions');
  console.log('-'.repeat(80));

  await manager.grantPermission(
    'user-002',
    'Bob',
    Permission.WRITE,
    'admin-001',
    {
      resource: 'project-alpha',
      reason: 'Project Alpha team member'
    }
  );

  await manager.grantPermission(
    'user-002',
    'Bob',
    Permission.READ,
    'admin-001',
    {
      resource: 'project-beta',
      reason: 'Project Beta observer'
    }
  );

  console.log(`✓ Granted Bob WRITE permission on project-alpha`);
  console.log(`✓ Granted Bob READ permission on project-beta`);
  console.log();

  const bobWriteAlpha = await manager.hasPermission('user-002', Permission.WRITE, 'project-alpha');
  const bobWriteBeta = await manager.hasPermission('user-002', Permission.WRITE, 'project-beta');

  console.log(`Bob can WRITE to project-alpha: ${bobWriteAlpha.granted}`);
  console.log(`Bob can WRITE to project-beta: ${bobWriteBeta.granted}`);
  console.log();

  // Demo 4: Temporary Permissions with Expiration
  console.log('📋 Demo 4: Temporary Permissions');
  console.log('-'.repeat(80));

  const tempGrant = await manager.grantPermission(
    'user-003',
    'Charlie',
    Permission.EXECUTE,
    'admin-001',
    {
      expiresIn: 2000, // 2 seconds
      reason: 'Temporary maintenance access'
    }
  );

  console.log(`✓ Granted Charlie EXECUTE permission (expires in 2 seconds)`);
  console.log(`  Grant ID: ${tempGrant.id}`);
  console.log(`  Expires at: ${tempGrant.expiresAt?.toLocaleString()}`);
  console.log();

  console.log(`Checking permission immediately...`);
  const check1 = await manager.hasPermission('user-003', Permission.EXECUTE);
  console.log(`  Charlie has EXECUTE permission: ${check1.granted}`);

  console.log(`Waiting 3 seconds...`);
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log(`Checking permission after expiration...`);
  const check2 = await manager.hasPermission('user-003', Permission.EXECUTE);
  console.log(`  Charlie has EXECUTE permission: ${check2.granted}`);
  if (!check2.granted && check2.reason) {
    console.log(`  Reason: ${check2.reason}`);
  }
  console.log();

  // Demo 5: List User Permissions
  console.log('📋 Demo 5: List All User Permissions');
  console.log('-'.repeat(80));

  const alicePermissions = await manager.getUserPermissions('user-001');
  console.log(`Alice's permissions (${alicePermissions.length}):`);
  alicePermissions.forEach(grant => {
    const expiryText = grant.expiresAt 
      ? `expires ${grant.expiresAt.toLocaleString()}`
      : 'permanent';
    console.log(`  - ${grant.permission} (${expiryText})`);
    if (grant.reason) {
      console.log(`    Reason: ${grant.reason}`);
    }
  });
  console.log();

  const bobPermissions = await manager.getUserPermissions('user-002');
  console.log(`Bob's permissions (${bobPermissions.length}):`);
  bobPermissions.forEach(grant => {
    const resourceText = grant.resource ? ` on ${grant.resource}` : '';
    console.log(`  - ${grant.permission}${resourceText}`);
  });
  console.log();

  // Demo 6: Extend Permission
  console.log('📋 Demo 6: Extend Permission Expiration');
  console.log('-'.repeat(80));

  console.log(`Original WRITE permission expiration: ${writeGrant.expiresAt?.toLocaleString()}`);
  
  const extended = await manager.extendPermission(
    writeGrant.id,
    7 * 24 * 60 * 60 * 1000 // Add 7 more days
  );

  if (extended) {
    const updatedGrant = await manager.getGrant(writeGrant.id);
    console.log(`✓ Extended expiration by 7 days`);
    console.log(`  New expiration: ${updatedGrant?.expiresAt?.toLocaleString()}`);
  }
  console.log();

  // Demo 7: Bulk Grant Permissions
  console.log('📋 Demo 7: Bulk Grant Permissions');
  console.log('-'.repeat(80));

  const bulkGrants = await manager.bulkGrant([
    {
      userId: 'user-004',
      userName: 'David',
      permission: Permission.READ,
      reason: 'Team member'
    },
    {
      userId: 'user-004',
      userName: 'David',
      permission: Permission.WRITE,
      resource: 'docs',
      reason: 'Documentation maintainer'
    },
    {
      userId: 'user-005',
      userName: 'Eve',
      permission: Permission.READ,
      reason: 'Viewer'
    }
  ], 'admin-001');

  console.log(`✓ Granted ${bulkGrants.length} permissions in bulk`);
  bulkGrants.forEach(grant => {
    const resourceText = grant.resource ? ` on ${grant.resource}` : '';
    console.log(`  - ${grant.userName}: ${grant.permission}${resourceText}`);
  });
  console.log();

  // Demo 8: Expiring Permissions Report
  console.log('📋 Demo 8: Expiring Permissions Report');
  console.log('-'.repeat(80));

  const expiringIn7Days = await manager.getExpiringPermissions(7 * 24 * 60 * 60 * 1000);
  console.log(`Permissions expiring in next 7 days: ${expiringIn7Days.length}`);
  expiringIn7Days.forEach(grant => {
    const daysRemaining = grant.expiresAt 
      ? Math.ceil((grant.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : 0;
    console.log(`  - ${grant.userName}: ${grant.permission} (expires in ${daysRemaining} days)`);
  });
  console.log();

  // Demo 9: Cleanup Expired Permissions
  console.log('📋 Demo 9: Cleanup Expired Permissions');
  console.log('-'.repeat(80));

  const removedCount = await manager.cleanupExpired();
  console.log(`✓ Removed ${removedCount} expired permissions`);
  console.log();

  // Demo 10: Permission Report
  console.log('📋 Demo 10: Permission Report');
  console.log('-'.repeat(80));

  const report = await manager.generateReport();
  console.log(`Total grants: ${report.totalGrants}`);
  console.log(`Active grants: ${report.activeGrants}`);
  console.log(`Expired grants: ${report.expiredGrants}`);
  console.log();

  console.log(`Grants by permission:`);
  Object.entries(report.byPermission).forEach(([permission, count]) => {
    console.log(`  ${permission}: ${count}`);
  });
  console.log();

  console.log(`Grants by user:`);
  Object.entries(report.byUser).forEach(([userId, count]) => {
    console.log(`  ${userId}: ${count}`);
  });
  console.log();

  // Demo 11: Revoke Permissions
  console.log('📋 Demo 11: Revoke Permissions');
  console.log('-'.repeat(80));

  const revokedCount = await manager.revokeAllUserPermissions('user-001');
  console.log(`✓ Revoked all permissions for user-001 (${revokedCount} grants)`);

  const alicePermissionsAfter = await manager.getUserPermissions('user-001');
  console.log(`  Alice's remaining permissions: ${alicePermissionsAfter.length}`);
  console.log();

  // Cleanup
  await manager.cleanup();

  console.log('='.repeat(80));
  console.log('Demo completed successfully!');
  console.log('='.repeat(80));
}

// Run the demo
runDemo().catch(console.error);
