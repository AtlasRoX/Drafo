import test from 'node:test';
import assert from 'node:assert/strict';
import * as Y from 'yjs';
import { DrafoCollaborationEngine } from '../../src/crdt/yjsProvider.ts';
import {
  encodeCollaborationMessage,
  decodeCollaborationMessage
} from '../../src/collaboration/CollaborationProtocol.ts';
import type { CollaborationEnvelope } from '../../src/collaboration/CollaborationProtocol.ts';
import type { FlowProject } from '../../src/types/flow.ts';

test('E2E Collaboration Convergence: Multi-peer real-time sync with protocol envelopes', async () => {
  // Simulate two isolated peer contexts (e.g. Browser Context A and Browser Context B)
  const peerAlice = new DrafoCollaborationEngine();
  const peerBob = new DrafoCollaborationEngine();

  const baseProject: FlowProject = {
    id: 'e2e-project-arch',
    name: 'Cloud Infrastructure Diagram',
    description: 'Autonomous multi-region topology',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    tags: ['E2E', 'Multiplayer'],
    canvasSettings: {
      showGrid: true,
      gridType: 'dots',
      bgColor: '#F8FAFC',
      snapToGrid: true,
      gridSize: 20,
      theme: 'light'
    },
    sections: [],
    nodes: [
      {
        id: 'node-lb',
        type: 'loadbalancer',
        title: 'Global Anycast Load Balancer',
        x: 200,
        y: 80,
        width: 240,
        height: 100,
        style: { bg: '#FFFFFF', borderColor: '#2563EB' },
        isLocked: false
      }
    ],
    edges: []
  };

  // 1. Alice initializes and seeds diagram
  peerAlice.seedFromProject(baseProject);

  const docAlice = peerAlice.getYDoc();
  const docBob = peerBob.getYDoc();

  // 2. Initial state synchronization via protocol envelopes
  const svBob = Y.encodeStateVector(docBob);
  const diffFromAlice = Y.encodeStateAsUpdate(docAlice, svBob);

  const aliceSyncEnvelope: CollaborationEnvelope = {
    version: 1,
    stream: 'DOCUMENT',
    type: 'update',
    roomId: 'room-e2e-77',
    sessionId: 'sess-alice-01',
    senderPeerId: 'peer-alice',
    sequence: 1,
    epoch: 1,
    timestamp: Date.now(),
    payload: diffFromAlice
  };

  // Alice encodes to wire format
  const wireBytes = encodeCollaborationMessage(aliceSyncEnvelope);

  // Bob receives from network and decodes
  const decodedBobEnvelope = decodeCollaborationMessage(wireBytes);
  assert.equal(decodedBobEnvelope.senderPeerId, 'peer-alice');
  assert.equal(decodedBobEnvelope.stream, 'DOCUMENT');

  // Bob applies Yjs update payload
  Y.applyUpdate(docBob, decodedBobEnvelope.payload);

  // Bob verifies initial diagram convergence
  const bobExtracted = peerBob.extractProject();
  assert.equal(bobExtracted.name, 'Cloud Infrastructure Diagram');
  assert.equal(bobExtracted.nodes.length, 1);
  assert.equal(bobExtracted.nodes[0].title, 'Global Anycast Load Balancer');

  // 3. Bob concurrently adds an edge and two worker nodes
  const bobNodes = docBob.getMap('nodes');
  bobNodes.set('node-worker-1', {
    id: 'node-worker-1',
    type: 'worker',
    title: 'K8s Worker Node 01',
    x: 100,
    y: 260,
    width: 200,
    height: 90,
    style: { bg: '#FFFFFF', borderColor: '#059669' },
    isLocked: false
  });
  bobNodes.set('node-worker-2', {
    id: 'node-worker-2',
    type: 'worker',
    title: 'K8s Worker Node 02',
    x: 340,
    y: 260,
    width: 200,
    height: 90,
    style: { bg: '#FFFFFF', borderColor: '#059669' },
    isLocked: false
  });

  const bobEdges = docBob.getMap('edges');
  bobEdges.set('edge-lb-w1', {
    id: 'edge-lb-w1',
    fromNodeId: 'node-lb',
    toNodeId: 'node-worker-1',
    fromPort: 'bottom',
    toPort: 'top',
    label: 'TCP Round Robin',
    lineStyle: 'solid',
    routeType: 'curved',
    color: '#2563EB',
    width: 2,
    arrowhead: 'arrow',
    bidirectional: false,
    isAnimated: true
  });

  // 4. Bob sends update to Alice
  const diffFromBob = Y.encodeStateAsUpdate(docBob, Y.encodeStateVector(docAlice));
  const bobEnvelope: CollaborationEnvelope = {
    version: 1,
    stream: 'DOCUMENT',
    type: 'update',
    roomId: 'room-e2e-77',
    sessionId: 'sess-bob-01',
    senderPeerId: 'peer-bob',
    sequence: 1,
    epoch: 1,
    timestamp: Date.now(),
    payload: diffFromBob
  };

  const bobWireBytes = encodeCollaborationMessage(bobEnvelope);
  const aliceReceivedEnvelope = decodeCollaborationMessage(bobWireBytes);
  Y.applyUpdate(docAlice, aliceReceivedEnvelope.payload);

  // 5. Assert final bidirectional convergence
  const finalAliceProject = peerAlice.extractProject();
  const finalBobProject = peerBob.extractProject();

  assert.equal(finalAliceProject.nodes.length, 3);
  assert.equal(finalBobProject.nodes.length, 3);
  assert.equal(finalAliceProject.edges.length, 1);
  assert.equal(finalBobProject.edges.length, 1);

  assert.deepEqual(
    finalAliceProject.nodes.map((n) => n.id).sort(),
    ['node-lb', 'node-worker-1', 'node-worker-2']
  );
  assert.deepEqual(
    finalBobProject.nodes.map((n) => n.id).sort(),
    ['node-lb', 'node-worker-1', 'node-worker-2']
  );

  const svA = Array.from(Y.encodeStateVector(docAlice));
  const svB = Array.from(Y.encodeStateVector(docBob));
  assert.deepEqual(svA, svB, 'State vectors between Alice and Bob must be identical');
});
