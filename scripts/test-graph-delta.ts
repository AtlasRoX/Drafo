import { FlowProject } from '../src/types/flow';
import { executeGraphTransaction } from '../src/utils/ai/transactionExecutor';
import { createDefaultMutationPolicy, GraphOperation } from '../src/utils/ai/graphDelta';
import { incrementalLayout, validateLayout } from '../src/utils/ai/layoutValidator';
import { validateGraphRequirements, validateGraphSemantics, planRepairs } from '../src/utils/ai/graphValidator';
import { extractRequirements, classifyIntent } from '../src/utils/ai/requirements';

function createMockBaseGraph(): FlowProject {
  return {
    id: 'base-project-1',
    name: 'Auth Architecture',
    description: 'Existing authentication system',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    canvasSettings: { showGrid: true, gridType: 'dots', bgColor: '#FFFFFF', snapToGrid: true, gridSize: 20, theme: 'light' },
    sections: [],
    nodes: [
      { id: 'auth-1', type: 'browser', title: 'Client Browser', subtitle: 'React App', x: 60, y: 140, width: 160, height: 115, style: { bg: '#FFF', borderColor: '#2563EB', textColor: '#000' } },
      { id: 'auth-2', type: 'gateway', title: 'API Gateway', subtitle: 'Ingress & Rate Limiter', x: 300, y: 140, width: 170, height: 115, style: { bg: '#EFF', borderColor: '#3B82F6', textColor: '#000' } },
      { id: 'auth-3', type: 'auth', title: 'Auth Service', subtitle: 'JWT Signer', x: 550, y: 140, width: 170, height: 115, style: { bg: '#F0F', borderColor: '#16A34A', textColor: '#000' } },
      { id: 'auth-4', type: 'cache', title: 'Redis Cache', subtitle: 'Sessions', x: 800, y: 80, width: 170, height: 110, style: { bg: '#FEF', borderColor: '#EF4444', textColor: '#000' } },
      { id: 'auth-5', type: 'database', title: 'Users DB', subtitle: 'PostgreSQL Primary', x: 800, y: 220, width: 160, height: 110, style: { bg: '#FAF', borderColor: '#8B5CF6', textColor: '#000' } }
    ],
    edges: [
      { id: 'ae-1', fromNodeId: 'auth-1', toNodeId: 'auth-2', fromPort: 'right', toPort: 'left', label: '1. Login Request', lineStyle: 'solid', routeType: 'straight', color: '#2563EB', width: 2, arrowhead: 'arrow' },
      { id: 'ae-2', fromNodeId: 'auth-2', toNodeId: 'auth-3', fromPort: 'right', toPort: 'left', label: '2. Forward to Auth', lineStyle: 'solid', routeType: 'straight', color: '#16A34A', width: 2, arrowhead: 'arrow' },
      { id: 'ae-3', fromNodeId: 'auth-3', toNodeId: 'auth-4', fromPort: 'right', toPort: 'left', label: '3. Check Cache', lineStyle: 'solid', routeType: 'straight', color: '#DC2626', width: 1.8, arrowhead: 'arrow' },
      { id: 'ae-4', fromNodeId: 'auth-3', toNodeId: 'auth-5', fromPort: 'right', toPort: 'left', label: '4. Verify Password Hash', lineStyle: 'solid', routeType: 'straight', color: '#7C3AED', width: 1.8, arrowhead: 'arrow' }
    ]
  };
}

async function runAllTests() {
  console.log('🧪 Starting Drafo Graph Delta Engine Test Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      process.exitCode = 1;
    }
  }

  // TEST A: Preserve Existing Graph & Mutation
  {
    const base = createMockBaseGraph();
    const policy = createDefaultMutationPolicy(base, true);

    const ops: GraphOperation[] = [
      { op: 'add_node', node: { id: 'rbac-service', title: 'RBAC Service', type: 'server' } },
      { op: 'add_node', node: { id: 'user-service', title: 'User Service', type: 'server' } },
      { op: 'add_node', node: { id: 'postgres-replica', title: 'PostgreSQL Replica', type: 'database' } },
      { op: 'add_edge', edge: { fromNodeId: 'Auth Service', toNodeId: 'RBAC Service', label: 'Verify Roles' } },
      { op: 'add_edge', edge: { fromNodeId: 'RBAC Service', toNodeId: 'User Service', label: 'Fetch Permissions' } },
      { op: 'add_edge', edge: { fromNodeId: 'Users DB', toNodeId: 'PostgreSQL Replica', label: 'WAL Streaming' } }
    ];

    const result = executeGraphTransaction(base, ops, policy);
    assert(result.success, 'Test A: Transaction succeeds');
    assert(result.graph.nodes.length === 8, 'Test A: Exactly 8 nodes present (5 original + 3 new)');
    assert(result.graph.edges.length === 7, 'Test A: Exactly 7 edges present (4 original + 3 new)');

    // Verify original nodes preserved
    const orig1 = result.graph.nodes.find((n) => n.id === 'auth-1');
    assert(orig1?.x === 60 && orig1?.y === 140, 'Test A: Original node positions preserved');

    // Test incremental layout
    const addedIds = new Set(['rbac-service', 'user-service', 'postgres-replica']);
    const laidOut = incrementalLayout(result.graph, addedIds);
    const layoutVal = validateLayout(laidOut);
    assert(layoutVal.overlaps === 0, 'Test A: Incremental layout produces 0 node overlaps');
  }

  // TEST B: Duplicate Prevention & Idempotency
  {
    const base = createMockBaseGraph();
    const policy = createDefaultMutationPolicy(base, true);

    const ops: GraphOperation[] = [
      { op: 'add_node', node: { id: 'rbac-service', title: 'RBAC Service', type: 'server' } },
      { op: 'add_node', node: { id: 'rbac-service', title: 'RBAC Service', type: 'server' } },
      { op: 'add_node', node: { id: 'rbac-dup', title: 'RBAC Service', type: 'server' } } // same normalized title
    ];

    const result = executeGraphTransaction(base, ops, policy);
    const rbacNodes = result.graph.nodes.filter((n) => n.title.toLowerCase().includes('rbac'));
    assert(rbacNodes.length === 1, 'Test B: Idempotency prevents duplicate nodes (exactly 1 RBAC node)');
  }

  // TEST C: Ambiguous Reference Protection
  {
    const base = createMockBaseGraph();
    // Add two nodes with ambiguous names
    base.nodes.push(
      { id: 'u1', type: 'server', title: 'User Service', subtitle: 'v1', x: 100, y: 100, width: 160, height: 110, style: { bg: '', borderColor: '', textColor: '' } },
      { id: 'u2', type: 'server', title: 'User Service', subtitle: 'v2', x: 300, y: 100, width: 160, height: 110, style: { bg: '', borderColor: '', textColor: '' } }
    );
    const policy = { ...createDefaultMutationPolicy(base, false), allowDelete: true };

    const ops: GraphOperation[] = [
      { op: 'remove_node', id: 'User Service' }
    ];

    const result = executeGraphTransaction(base, ops, policy);
    assert(!result.success, 'Test C: Ambiguous deletion rejected without guessing');
    assert(Boolean(result.error?.toLowerCase().includes('ambiguous')), 'Test C: Error explicitly mentions ambiguous reference');
    assert(result.graph.nodes.length === 7, 'Test C: Graph rolled back, no nodes deleted');
  }

  // TEST D: Protected Node Policy
  {
    const base = createMockBaseGraph();
    const policy = createDefaultMutationPolicy(base, true); // base nodes protected

    const ops: GraphOperation[] = [
      { op: 'remove_node', id: 'auth-3' } // Auth Service is protected
    ];

    const result = executeGraphTransaction(base, ops, policy);
    assert(!result.success, 'Test D: Protected node removal rejected');
    assert(result.graph.nodes.some((n) => n.id === 'auth-3'), 'Test D: Protected Auth Service remains in graph');
  }

  // TEST E: Transactional Rollback
  {
    const base = createMockBaseGraph();
    const policy = createDefaultMutationPolicy(base, true);

    const ops: GraphOperation[] = [
      { op: 'add_node', node: { id: 'temp-1', title: 'Temp Node', type: 'server' } },
      { op: 'add_node', node: { id: 'temp-2', title: 'Temp Node 2', type: 'server' } },
      { op: 'remove_node', id: 'auth-1' } // Protected! Causes failure
    ];

    const result = executeGraphTransaction(base, ops, policy);
    assert(!result.success, 'Test E: Transaction fails due to violation');
    assert(result.graph.nodes.length === 5, 'Test E: Complete rollback, 0 changes applied to graph');
  }

  // TEST F: Requirements Extraction & Separation of Validation/Repair
  {
    const prompt = 'Add RBAC, User Service, and PostgreSQL Replica. Connect Auth Service to RBAC.';
    const base = createMockBaseGraph();
    const reqs = extractRequirements(prompt, base);

    assert(reqs.requirements.length >= 4, 'Test F: Extracted explicit requirements (RBAC, User Service, PostgreSQL Replica, Edge)');

    const validationBefore = validateGraphRequirements(base, reqs.requirements);
    assert(validationBefore.missing.length > 0, 'Test F: Validator accurately detects missing requirements');

    const repairs = planRepairs(base, validationBefore.missing);
    assert(repairs.length > 0, 'Test F: Repair planner creates explicit operations without hallucination');

    const policy = createDefaultMutationPolicy(base, true);
    const repairResult = executeGraphTransaction(base, repairs, policy);
    const validationAfter = validateGraphRequirements(repairResult.graph, reqs.requirements);
    if (validationAfter.missing.length > 0) {
      console.log('Test F Missing items:', JSON.stringify(validationAfter.missing));
    }
    assert(validationAfter.missing.length === 0, 'Test F: Repaired graph satisfies all requirements');
  }

  // TEST G: Semantic Validation
  {
    const base = createMockBaseGraph();
    // Add direct edge from Client to DB
    base.edges.push({
      id: 'bad-edge',
      fromNodeId: 'auth-1', // Client Browser
      toNodeId: 'auth-5',   // Users DB
      fromPort: 'right',
      toPort: 'left',
      label: 'Direct Query',
      lineStyle: 'solid',
      routeType: 'straight',
      color: '#000',
      width: 2,
      arrowhead: 'arrow'
    });

    const violations = validateGraphSemantics(base);
    assert(violations.some((v) => v.code === 'DIRECT_CLIENT_DATABASE'), 'Test G: Semantic validator catches direct client-to-db connection');
  }

  console.log(`\n🏁 Test Suite Finished: ${passed}/${total} Passed.`);
}

runAllTests();
