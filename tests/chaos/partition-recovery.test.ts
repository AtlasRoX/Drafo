import test from 'node:test';
import assert from 'node:assert/strict';
import * as Y from 'yjs';
import { ChaosProxy } from '../../src/network/ChaosProxy.ts';
import { DrafoCollaborationEngine } from '../../src/crdt/yjsProvider.ts';

test('Chaos Engineering: Network partition, concurrent split-brain edits, and deterministic post-healing convergence', async () => {
  const engineAlice = new DrafoCollaborationEngine();
  const engineBob = new DrafoCollaborationEngine();

  const docA = engineAlice.getYDoc();
  const docB = engineBob.getYDoc();

  // 1. Initial baseline synchronization
  const nodesA = docA.getMap('nodes');
  nodesA.set('node-gateway', {
    id: 'node-gateway',
    type: 'gateway',
    title: 'API Gateway',
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    style: { bg: '#FFFFFF', borderColor: '#2563EB' },
    isLocked: false
  });

  // Sync initial state
  const initialUpdate = Y.encodeStateAsUpdate(docA);
  Y.applyUpdate(docB, initialUpdate);

  // Assert both have initial gateway node
  assert.equal(docA.getMap('nodes').size, 1);
  assert.equal(docB.getMap('nodes').size, 1);

  // 2. ACTIVATE NETWORK PARTITION (Chaos Proxy)
  const chaos = new ChaosProxy({ enabled: true, isPartitioned: true });

  const aToBDeliveryQueue: Uint8Array[] = [];
  const bToADeliveryQueue: Uint8Array[] = [];

  // 3. Alice performs mutations during partition
  const updateListenerA = (update: Uint8Array) => {
    chaos.intercept(update, (delivered) => {
      aToBDeliveryQueue.push(delivered);
    });
  };
  docA.on('update', updateListenerA);

  const updateListenerB = (update: Uint8Array) => {
    chaos.intercept(update, (delivered) => {
      bToADeliveryQueue.push(delivered);
    });
  };
  docB.on('update', updateListenerB);

  // Alice adds Auth Service and updates project title
  docA.getMap('meta').set('name', 'Architecture (Alice Edits)');
  nodesA.set('node-auth', {
    id: 'node-auth',
    type: 'auth',
    title: 'Auth Microservice',
    x: 100,
    y: 250,
    width: 200,
    height: 100,
    style: { bg: '#FFFFFF', borderColor: '#7C3AED' },
    isLocked: false
  });

  // Bob concurrently adds Database and Section during partition
  docB.getMap('meta').set('name', 'Architecture (Bob Edits)');
  docB.getMap('nodes').set('node-db', {
    id: 'node-db',
    type: 'database',
    title: 'Distributed CockroachDB',
    x: 350,
    y: 250,
    width: 220,
    height: 110,
    style: { bg: '#FFFFFF', borderColor: '#059669' },
    isLocked: false
  });

  // 4. Assert that during partition, no updates leaked through
  assert.equal(aToBDeliveryQueue.length, 0, 'No updates should pass across severed partition');
  assert.equal(bToADeliveryQueue.length, 0, 'No updates should pass across severed partition');
  assert.equal(docA.getMap('nodes').size, 2, 'Alice has 2 nodes');
  assert.equal(docB.getMap('nodes').size, 2, 'Bob has 2 nodes');

  // 5. HEAL NETWORK PARTITION
  chaos.heal();

  // Exchange all missing updates accumulated during partition
  const deltaAtoB = Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB));
  const deltaBtoA = Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA));

  Y.applyUpdate(docB, deltaAtoB);
  Y.applyUpdate(docA, deltaBtoA);

  // 6. ASSERT DETERMINISTIC CRDT CONVERGENCE
  assert.equal(docA.getMap('nodes').size, 3, 'Alice must converge to 3 total nodes');
  assert.equal(docB.getMap('nodes').size, 3, 'Bob must converge to 3 total nodes');

  const nodesListA = Array.from(docA.getMap('nodes').keys()).sort();
  const nodesListB = Array.from(docB.getMap('nodes').keys()).sort();
  assert.deepEqual(nodesListA, ['node-auth', 'node-db', 'node-gateway']);
  assert.deepEqual(nodesListB, ['node-auth', 'node-db', 'node-gateway']);

  // State vectors must be identical
  const stateVectorA = Y.encodeStateVector(docA);
  const stateVectorB = Y.encodeStateVector(docB);
  assert.deepEqual(Array.from(stateVectorA), Array.from(stateVectorB));

  docA.off('update', updateListenerA);
  docB.off('update', updateListenerB);
});
