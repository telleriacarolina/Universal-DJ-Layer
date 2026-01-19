import { WorkflowEngine, ApprovalStatus } from './workflow-engine';
import { ApprovalRules, ApprovalRule } from './approval-rules';
import { Role } from '../../src/core/types';

/**
 * Demo: Multi-step Approval Workflow
 */
async function runDemo() {
  console.log('='.repeat(80));
  console.log('Universal DJ Layer - Approval Workflow Demo');
  console.log('='.repeat(80));
  console.log();

  const engine = new WorkflowEngine();
  await engine.initialize();

  // Demo 1: Simple Configuration Change
  console.log('📋 Demo 1: Simple Configuration Change');
  console.log('-'.repeat(80));
  
  const configRequest = await engine.createRequest(
    'Update API Rate Limit',
    'Increase rate limit from 100 to 200 requests/min',
    'alice',
    Role.EXPERIMENTER,
    { ruleId: 'config-change', changeSize: 'moderate' }
  );

  console.log(`✓ Created request: ${configRequest.id}`);
  console.log(`  Title: ${configRequest.title}`);
  console.log(`  Requested by: ${configRequest.requestedBy}`);
  console.log(`  Status: ${configRequest.status}`);
  console.log(`  Required approvals: ${configRequest.rule.requiredApprovers}`);
  console.log();

  await engine.approve(configRequest.id, 'bob', Role.ADMIN, 'Approved - looks reasonable');
  const updated1 = engine.getRequest(configRequest.id);
  console.log(`✓ Approved by: bob (${Role.ADMIN})`);
  console.log(`  Status: ${updated1?.status}`);
  console.log(`  Approvals: ${updated1?.approvals.length}/${updated1?.rule.requiredApprovers}`);
  console.log();

  // Demo 2: Critical Change Requiring Multiple Approvals
  console.log('📋 Demo 2: Critical Change (Multiple Approvals Required)');
  console.log('-'.repeat(80));

  const criticalRequest = await engine.createRequest(
    'Modify Production Database Schema',
    'Add new column to users table',
    'charlie',
    Role.ADMIN,
    { ruleId: 'critical-change', severity: 'high' }
  );

  console.log(`✓ Created request: ${criticalRequest.id}`);
  console.log(`  Title: ${criticalRequest.title}`);
  console.log(`  Required approvals: ${criticalRequest.rule.requiredApprovers}`);
  console.log();

  await engine.approve(criticalRequest.id, 'bob', Role.ADMIN, 'Schema change approved');
  const progress1 = engine.getProgress(criticalRequest.id);
  console.log(`✓ First approval by: bob`);
  console.log(`  Progress: ${progress1.current}/${progress1.required} (${progress1.percentage.toFixed(0)}%)`);
  console.log();

  await engine.approve(criticalRequest.id, 'owner1', Role.OWNER, 'Final approval granted');
  const progress2 = engine.getProgress(criticalRequest.id);
  const updated2 = engine.getRequest(criticalRequest.id);
  console.log(`✓ Second approval by: owner1`);
  console.log(`  Progress: ${progress2.current}/${progress2.required} (${progress2.percentage.toFixed(0)}%)`);
  console.log(`  Status: ${updated2?.status}`);
  console.log();

  // Demo 3: Auto-Approved Minor Change
  console.log('📋 Demo 3: Auto-Approved Minor Change');
  console.log('-'.repeat(80));

  const minorRequest = await engine.createRequest(
    'Update UI Text',
    'Fix typo in welcome message',
    'david',
    Role.EXPERIMENTER,
    { ruleId: 'minor-change', changeSize: 'minor' }
  );

  console.log(`✓ Created request: ${minorRequest.id}`);
  console.log(`  Title: ${minorRequest.title}`);
  console.log(`  Status: ${minorRequest.status} (auto-approved)`);
  console.log(`  Reason: Minor change by experimenter`);
  console.log();

  // Demo 4: Rejected Request
  console.log('📋 Demo 4: Rejected Request');
  console.log('-'.repeat(80));

  const deleteRequest = await engine.createRequest(
    'Delete User Data',
    'Remove inactive user accounts',
    'eve',
    Role.ADMIN,
    { ruleId: 'deletion', operation: 'delete', itemCount: 50 }
  );

  console.log(`✓ Created request: ${deleteRequest.id}`);
  console.log(`  Title: ${deleteRequest.title}`);
  console.log(`  Required approvals: ${deleteRequest.rule.requiredApprovers} owners`);
  console.log();

  await engine.reject(
    deleteRequest.id,
    'owner2',
    Role.OWNER,
    'Need more information about affected users'
  );
  const updated3 = engine.getRequest(deleteRequest.id);
  console.log(`✗ Rejected by: owner2`);
  console.log(`  Status: ${updated3?.status}`);
  console.log(`  Reason: ${updated3?.rejections[0]?.reason}`);
  console.log();

  // Demo 5: Cancelled Request
  console.log('📋 Demo 5: Cancelled Request');
  console.log('-'.repeat(80));

  const cancelRequest = await engine.createRequest(
    'Deploy New Feature',
    'Deploy feature X to production',
    'frank',
    Role.EXPERIMENTER,
    { ruleId: 'feature-release' }
  );

  console.log(`✓ Created request: ${cancelRequest.id}`);
  console.log(`  Title: ${cancelRequest.title}`);
  console.log();

  await engine.cancel(cancelRequest.id, 'frank');
  const updated4 = engine.getRequest(cancelRequest.id);
  console.log(`✗ Cancelled by requester: frank`);
  console.log(`  Status: ${updated4?.status}`);
  console.log();

  // Demo 6: Custom Approval Rule
  console.log('📋 Demo 6: Custom Approval Rule');
  console.log('-'.repeat(80));

  const customRule: ApprovalRule = {
    id: 'custom-security',
    name: 'Security Review',
    description: 'Requires security team approval',
    requiredApprovers: 2,
    allowedRoles: [Role.ADMIN, Role.OWNER],
    conditions: [
      { field: 'category', operator: 'equals', value: 'security' }
    ]
  };

  engine.registerRule(customRule);
  console.log(`✓ Registered custom rule: ${customRule.name}`);
  console.log(`  Required approvers: ${customRule.requiredApprovers}`);
  console.log();

  const securityRequest = await engine.createRequest(
    'Update Security Policy',
    'Strengthen password requirements',
    'security-lead',
    Role.ADMIN,
    { category: 'security' }
  );

  console.log(`✓ Created request: ${securityRequest.id}`);
  console.log(`  Matched rule: ${securityRequest.rule.name}`);
  console.log(`  Required approvals: ${securityRequest.rule.requiredApprovers}`);
  console.log();

  // Demo 7: Dashboard View
  console.log('📋 Demo 7: Approval Dashboard');
  console.log('-'.repeat(80));

  const allRequests = engine.getAllRequests();
  const pending = engine.getPendingRequests();
  const approved = engine.getRequestsByStatus(ApprovalStatus.APPROVED);
  const rejected = engine.getRequestsByStatus(ApprovalStatus.REJECTED);

  console.log('Summary:');
  console.log(`  Total requests: ${allRequests.length}`);
  console.log(`  Pending: ${pending.length}`);
  console.log(`  Approved: ${approved.length}`);
  console.log(`  Rejected: ${rejected.length}`);
  console.log();

  console.log('Pending Requests:');
  pending.forEach(req => {
    const progress = engine.getProgress(req.id);
    console.log(`  ${req.id}: ${req.title}`);
    console.log(`    Progress: ${progress.current}/${progress.required} approvals`);
    console.log(`    Rule: ${req.rule.name}`);
  });
  console.log();

  // Demo 8: Approver View
  console.log('📋 Demo 8: Requests for Admin Role');
  console.log('-'.repeat(80));

  const adminRequests = engine.getRequestsForApprover(Role.ADMIN);
  console.log(`Pending requests requiring Admin approval: ${adminRequests.length}`);
  adminRequests.forEach(req => {
    console.log(`  ${req.id}: ${req.title}`);
    console.log(`    Requested by: ${req.requestedBy} (${req.requestedByRole})`);
    console.log(`    Description: ${req.description}`);
  });
  console.log();

  // Demo 9: Approval with Conditions
  console.log('📋 Demo 9: Bulk Operation Approval');
  console.log('-'.repeat(80));

  const bulkRequest = await engine.createRequest(
    'Bulk Update User Preferences',
    'Update notification settings for 500 users',
    'grace',
    Role.EXPERIMENTER,
    {
      operation: 'modify',
      itemCount: 500,
      category: 'bulk'
    }
  );

  console.log(`✓ Created request: ${bulkRequest.id}`);
  console.log(`  Matched rule: ${bulkRequest.rule.name}`);
  console.log(`  Reason: Item count (500) exceeds threshold (10)`);
  console.log(`  Required approvals: ${bulkRequest.rule.requiredApprovers}`);
  console.log();

  await engine.approve(bulkRequest.id, 'admin1', Role.ADMIN, 'Bulk operation approved');
  const updated5 = engine.getRequest(bulkRequest.id);
  console.log(`✓ Approved by: admin1`);
  console.log(`  Status: ${updated5?.status}`);
  console.log();

  // Cleanup
  await engine.cleanup();

  console.log('='.repeat(80));
  console.log('Demo completed successfully!');
  console.log('='.repeat(80));
}

// Run the demo
runDemo().catch(console.error);
