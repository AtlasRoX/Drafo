import {
  isConstraintText,
  isZoneGroup,
  normalizeEntities
} from '../src/utils/ai/semanticNormalizer';
import { extractRequirements } from '../src/utils/ai/requirements';
import { generateCompletenessReport } from '../src/utils/ai/completenessReporter';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runUnitTests() {
  console.log('\n--- 1. Testing isConstraintText ---');
  assert(isConstraintText('Keep the architecture left-to-right'), 'Detects left-to-right constraint');
  assert(isConstraintText('Use consistent node sizes'), 'Detects node sizing constraint');
  assert(isConstraintText('Include these components:'), 'Detects instruction header');
  assert(!isConstraintText('Web App'), 'Does not falsely flag Web App');
  assert(!isConstraintText('PostgreSQL Primary'), 'Does not falsely flag PostgreSQL Primary');

  console.log('\n--- 2. Testing isZoneGroup ---');
  assert(isZoneGroup('Clients'), 'Clients is a zone');
  assert(isZoneGroup('Edge/API'), 'Edge/API is a zone');
  assert(isZoneGroup('Backend Services'), 'Backend Services is a zone');
  assert(isZoneGroup('Infrastructure'), 'Infrastructure is a zone');
  assert(isZoneGroup('Data Layer'), 'Data Layer is a zone');
  assert(isZoneGroup('External Services'), 'External Services is a zone');
  assert(!isZoneGroup('Auth Service'), 'Auth Service is NOT a zone');
  assert(!isZoneGroup('Redis Cache'), 'Redis Cache is NOT a zone');

  console.log('\n--- 3. Testing normalizeEntities (Deduplication & Distinction) ---');
  const inputList = [
    'Keep the architecture left-to-right',
    'Use consistent node sizes',
    'Include these components',
    'Clients',
    'Edge/API',
    'Web App',
    'Mobile App',
    'Redis Cache',
    'Redis',
    'Message Queue',
    'Queue',
    'PostgreSQL Primary',
    'PostgreSQL Read Replica',
    'PostgreSQL',
    'Analytics Service',
    'Analytics Database',
    'Search Service',
    'Search Index',
    'OAuth Provider',
    'Payment Provider',
    'Email Provider',
    'Push Notification Provider'
  ];

  const result = normalizeEntities(inputList);

  // Constraints
  assert(result.constraints.length >= 3, 'Found all 3 constraints');
  assert(result.constraints.includes('Keep the architecture left-to-right'), 'Found left-to-right in constraints');

  // Groups
  assert(result.groups.includes('Clients'), 'Found Clients in groups');
  assert(result.groups.includes('Edge/API'), 'Found Edge/API in groups');
  assert(result.nodes.every(n => n !== 'Clients' && n !== 'Edge/API'), 'No zone exists in nodes');

  // Deduplication
  assert(result.nodes.includes('Redis Cache') && !result.nodes.includes('Redis'), 'Redis + Redis Cache deduplicated to Redis Cache');
  assert(result.nodes.includes('Message Queue') && !result.nodes.includes('Queue'), 'Queue + Message Queue deduplicated to Message Queue');
  assert(result.nodes.includes('PostgreSQL Primary') && !result.nodes.includes('PostgreSQL'), 'PostgreSQL + PostgreSQL Primary deduplicated');

  // Distinct entities preserved
  assert(result.nodes.includes('PostgreSQL Primary'), 'PostgreSQL Primary preserved');
  assert(result.nodes.includes('PostgreSQL Read Replica'), 'PostgreSQL Read Replica preserved');
  assert(result.nodes.includes('Analytics Service'), 'Analytics Service preserved');
  assert(result.nodes.includes('Analytics Database'), 'Analytics Database preserved');
  assert(result.nodes.includes('Search Service'), 'Search Service preserved');
  assert(result.nodes.includes('Search Index'), 'Search Index preserved');
  assert(result.nodes.includes('OAuth Provider'), 'OAuth Provider preserved');
  assert(result.nodes.includes('Payment Provider'), 'Payment Provider preserved');
  assert(result.nodes.includes('Email Provider'), 'Email Provider preserved');
  assert(result.nodes.includes('Push Notification Provider'), 'Push Notification Provider preserved');

  console.log('\n--- 4. Testing extractRequirements on full prompt ---');
  const fullPrompt = `Create a modern distributed architecture.
Keep the architecture left-to-right.
Use consistent node sizes.
Include these components:
Clients: Web App, Mobile App
Edge/API: API Gateway, Rate Limiter
Backend Services: Auth Service, User Service, Billing Service, Search Service, Analytics Service
Infrastructure: Redis Cache, Redis, Message Queue, Queue, Background Worker
Data Layer: PostgreSQL Primary, PostgreSQL Read Replica, PostgreSQL, Object Storage, Search Index, Analytics Database
External Services: OAuth Provider, Payment Provider, Email Provider, Push Notification Provider`;

  const dummyProject: any = { id: 'p1', name: 'Test', nodes: [], edges: [], sections: [] };
  const extracted = extractRequirements(fullPrompt, dummyProject);

  const nodeReqs = extracted.requirements.filter(r => r.kind === 'node').map(r => r.text);
  const groupReqs = extracted.requirements.filter(r => r.kind === 'group').map(r => r.text);
  const constraintReqs = extracted.requirements.filter(r => r.kind === 'constraint').map(r => r.text);

  console.log('Extracted Nodes:', nodeReqs);
  console.log('Extracted Groups:', groupReqs);
  console.log('Extracted Constraints:', constraintReqs);

  assert(!nodeReqs.some(n => n.toLowerCase().includes('consistent node sizes')), 'No sizing constraint in nodes');
  assert(!nodeReqs.some(n => n.toLowerCase().includes('left-to-right')), 'No left-to-right constraint in nodes');
  assert(!nodeReqs.includes('Clients') && !nodeReqs.includes('Infrastructure'), 'Zones are not in nodes');
  assert(groupReqs.includes('Clients'), 'Clients is in groups');
  assert(groupReqs.includes('Infrastructure'), 'Infrastructure is in groups');
  assert(nodeReqs.includes('PostgreSQL Primary') && nodeReqs.includes('PostgreSQL Read Replica'), 'Both PostgreSQL Primary and Replica extracted');
  assert(nodeReqs.includes('Analytics Service') && nodeReqs.includes('Analytics Database'), 'Both Analytics Service and DB extracted');

  console.log('\nAll Unit Tests Passed Successfully! 🎉\n');
}

async function runApiIntegrationTest() {
  console.log('--- 5. Testing Live API endpoint /api/ai/generate ---');
  const fullPrompt = `Create a modern distributed architecture.
Keep the architecture left-to-right.
Use consistent node sizes.
Include these components:
Clients: Web App, Mobile App
Edge/API: API Gateway, Rate Limiter
Backend Services: Auth Service, User Service, Billing Service, Search Service, Analytics Service
Infrastructure: Redis Cache, Redis, Message Queue, Queue, Background Worker
Data Layer: PostgreSQL Primary, PostgreSQL Read Replica, PostgreSQL, Object Storage, Search Index, Analytics Database
External Services: OAuth Provider, Payment Provider, Email Provider, Push Notification Provider`;

  const res = await fetch('http://localhost:3000/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: fullPrompt })
  });

  assert(res.ok, `API response status is ${res.status}`);
  const data = await res.json();
  assert(data.success, 'API response success is true');

  const project = data.project;
  const nodes = project.nodes || [];
  const edges = project.edges || [];
  const sections = project.sections || [];
  const nodeTitles = nodes.map((n: any) => n.title);

  console.log(`Total Nodes: ${nodes.length}`);
  console.log(`Total Edges: ${edges.length}`);
  console.log(`Total Sections (Zones): ${sections.length}`);
  console.log('Generated Node Titles:', nodeTitles);

  // 1. Zero constraint nodes
  assert(!nodeTitles.some((t: string) => /left-to-right|consistent node size|include these/i.test(t)), 'Zero constraint nodes created');

  // 2. Zero zone group nodes (they should be sections, not nodes)
  assert(!nodeTitles.includes('Clients') && !nodeTitles.includes('Infrastructure') && !nodeTitles.includes('Data Layer'), 'Zones are sections, not service nodes');
  assert(sections.length >= 4, `Created ${sections.length} architectural zone sections`);

  // 3. Deduplication check
  const redisCount = nodeTitles.filter((t: string) => /redis/i.test(t)).length;
  assert(redisCount === 1, `Redis deduplicated to 1 node (found ${redisCount})`);

  // 4. Distinct entity checks
  assert(nodeTitles.includes('PostgreSQL Primary'), 'Contains PostgreSQL Primary');
  assert(nodeTitles.includes('PostgreSQL Read Replica'), 'Contains PostgreSQL Read Replica');
  assert(nodeTitles.includes('Analytics Service'), 'Contains Analytics Service');
  assert(nodeTitles.includes('Analytics Database'), 'Contains Analytics Database');
  assert(nodeTitles.includes('Search Service'), 'Contains Search Service');
  assert(nodeTitles.includes('Search Index'), 'Contains Search Index');
  assert(nodeTitles.includes('OAuth Provider'), 'Contains OAuth Provider');
  assert(nodeTitles.includes('Payment Provider'), 'Contains Payment Provider');
  assert(nodeTitles.includes('Email Provider'), 'Contains Email Provider');
  assert(nodeTitles.includes('Push Notification Provider'), 'Contains Push Notification Provider');

  // 5. Zero container edge rule
  const containerNodeIds = new Set(nodes.filter((n: any) => n.type === 'container' || n.type === 'group').map((n: any) => n.id));
  const invalidEdges = edges.filter((e: any) => containerNodeIds.has(e.fromNodeId) || containerNodeIds.has(e.toNodeId));
  assert(invalidEdges.length === 0, 'Zero edges connect to container/group bounding boxes');

  // 6. Post-Generation Completeness Report
  console.log('\n--- Completeness Report Audit ---');
  console.log('Completeness Report:', JSON.stringify(data.completenessReport, null, 2));
  assert(data.completenessReport !== undefined, 'Completeness report returned in API response');
  assert(data.completenessReport.missing.length === 0, `Completeness report has 0 missing: [${data.completenessReport.missing.join(', ')}]`);
  assert(data.completenessReport.isComplete === true, 'Completeness report confirms graph is 100% complete');

  console.log('\nAll API Integration Tests Passed! 🚀🎯\n');
}

async function main() {
  await runUnitTests();
  await runApiIntegrationTest();
}

main().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
