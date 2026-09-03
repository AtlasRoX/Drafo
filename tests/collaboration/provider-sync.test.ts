import test from 'node:test';
import assert from 'node:assert/strict';
import * as Y from 'yjs';
import { DrafoCollaborationEngine } from '../../src/crdt/yjsProvider.ts';
import type { FlowProject } from '../../src/types/flow.ts';

test('DrafoCollaborationEngine: Two in-memory collaborative clients converge deterministically', () => {
  const engineAlice = new DrafoCollaborationEngine();
  const engineBob = new DrafoCollaborationEngine();

  const initialProject: FlowProject = {
    id: 'proj-sync-test',
    name: 'Sync Verification Architecture',
    description: 'Testing CRDT convergence between peers',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['E2E', 'P2P'],
    canvasSettings: {
      showGrid: true,
      gridType: 'dots',
      bgColor: '#FFFFFF',
      snapToGrid: true,
      gridSize: 20,
      theme: 'light'
    },
    sections: [
      {
        id: 'sec-core',
        number: '01',
        title: 'Compute Cluster',
        y: 100,
        pillBg: '#F3F4F6',
        pillTextColor: '#111827',
        pillBorderColor: '#E5E7EB',
        hasDivider: true,
        isLocked: false
      }
    ],
    nodes: [
      {
        id: 'node-a1',
        type: 'gateway',
        title: 'Ingress Controller',
        x: 120,
        y: 180,
        width: 200,
        height: 100,
        style: { bg: '#FFFFFF', borderColor: '#4F46E5' },
        isLocked: false
      }
    ],
    edges: []
  };

  // 1. Seed Alice with initial project
  engineAlice.seedFromProject(initialProject);

  // 2. Transmit delta from Alice -> Bob
  const docA = engineAlice.getYDoc();
  const docB = engineBob.getYDoc();

  // Exchange state vector & missing updates
  const stateVectorB = Y.encodeStateVector(docB);
  const diffFromAlice = Y.encodeStateAsUpdate(docA, stateVectorB);
  Y.applyUpdate(docB, diffFromAlice);

  // 3. Verify Bob has converged to Alice's initial state
  const bobProject1 = engineBob.extractProject();
  assert.equal(bobProject1.name, 'Sync Verification Architecture');
  assert.equal(bobProject1.nodes.length, 1);
  assert.equal(bobProject1.nodes[0].title, 'Ingress Controller');
  assert.equal(bobProject1.sections.length, 1);
  assert.equal(bobProject1.sections[0].title, 'Compute Cluster');

  // 4. Bob concurrently adds a database node
  const docBNodes = docB.getMap('nodes');
  docBNodes.set('node-b1', {
    id: 'node-b1',
    type: 'database',
    title: 'Postgres Primary',
    x: 400,
    y: 180,
    width: 200,
    height: 100,
    style: { bg: '#FFFFFF', borderColor: '#059669' },
    isLocked: false
  });

  // 5. Alice concurrently adds a cache node
  const docANodes = docA.getMap('nodes');
  docANodes.set('node-a2', {
    id: 'node-a2',
    type: 'cache',
    title: 'Redis Cache',
    x: 120,
    y: 320,
    width: 200,
    height: 100,
    style: { bg: '#FFFFFF', borderColor: '#DC2626' },
    isLocked: false
  });

  // 6. Cross-sync: Alice sends to Bob, Bob sends to Alice
  const updateBToA = Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA));
  const updateAToB = Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB));

  Y.applyUpdate(docA, updateBToA);
  Y.applyUpdate(docB, updateAToB);

  // 7. Verify bidirectional convergence: Both peers have all 3 nodes!
  const finalAlice = engineAlice.extractProject();
  const finalBob = engineBob.extractProject();

  assert.equal(finalAlice.nodes.length, 3);
  assert.equal(finalBob.nodes.length, 3);

  const aliceNodeTitles = finalAlice.nodes.map((n) => n.title).sort();
  const bobNodeTitles = finalBob.nodes.map((n) => n.title).sort();

  assert.deepEqual(aliceNodeTitles, ['Ingress Controller', 'Postgres Primary', 'Redis Cache']);
  assert.deepEqual(bobNodeTitles, ['Ingress Controller', 'Postgres Primary', 'Redis Cache']);
});
