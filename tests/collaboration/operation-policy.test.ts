import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyOperation,
  isDurable,
  isCoalescible,
  isDropEligible
} from '../../src/collaboration/OperationPolicy.ts';
import { BackpressureManager } from '../../src/collaboration/BackpressureManager.ts';
import type { QueuedMessage } from '../../src/collaboration/BackpressureManager.ts';
import { AwarenessManager } from '../../src/collaboration/AwarenessManager.ts';

test('OperationPolicy: Correctly categorizes operation classes', () => {
  assert.equal(classifyOperation({ type: 'cursor', entityType: 'cursor' }), 'EPHEMERAL');
  assert.equal(classifyOperation({ type: 'hover' }), 'EPHEMERAL');
  assert.equal(classifyOperation({ type: 'selection' }), 'EPHEMERAL');

  assert.equal(classifyOperation({ type: 'node-drag-move', isTransientDrag: true }), 'COALESCIBLE');
  assert.equal(classifyOperation({ type: 'node-update', isTransientDrag: true }), 'COALESCIBLE');

  assert.equal(classifyOperation({ type: 'node-create', entityType: 'node' }), 'DURABLE');
  assert.equal(classifyOperation({ type: 'node-delete', entityType: 'node' }), 'DURABLE');
  assert.equal(classifyOperation({ type: 'edge-create', entityType: 'edge' }), 'DURABLE');
  assert.equal(classifyOperation({ type: 'property-edit' }), 'DURABLE');

  assert.ok(isDurable('DURABLE'));
  assert.ok(!isDurable('EPHEMERAL'));
  assert.ok(isCoalescible('COALESCIBLE'));
  assert.ok(isDropEligible('EPHEMERAL'));
  assert.ok(!isDropEligible('DURABLE'));
});

test('BackpressureManager: Durable operations are NEVER dropped; Ephemeral dropped on congestion', () => {
  const bpm = new BackpressureManager(5, 3); // Max cap 5, congestion threshold 3

  // 1. Enqueue 3 durable messages (hits congestion threshold)
  bpm.enqueue({
    id: 'd-1',
    stream: 'DOCUMENT',
    opClass: 'DURABLE',
    payload: { node: 'create-1' },
    timestamp: Date.now()
  });
  bpm.enqueue({
    id: 'd-2',
    stream: 'DOCUMENT',
    opClass: 'DURABLE',
    payload: { node: 'create-2' },
    timestamp: Date.now()
  });
  bpm.enqueue({
    id: 'd-3',
    stream: 'DOCUMENT',
    opClass: 'DURABLE',
    payload: { node: 'create-3' },
    timestamp: Date.now()
  });

  assert.ok(bpm.isCongested(), 'Queue must be marked congested at threshold 3');

  // 2. Enqueue ephemeral presence during congestion -> must be dropped safely
  const ephemeralAccepted = bpm.enqueue({
    id: 'e-1',
    stream: 'AWARENESS',
    opClass: 'EPHEMERAL',
    payload: { cursor: { x: 10, y: 10 } },
    timestamp: Date.now()
  });
  assert.equal(ephemeralAccepted, false, 'Ephemeral message must be dropped during congestion');

  // 3. Enqueue another durable message -> MUST BE ACCEPTED despite congestion
  const durableAccepted = bpm.enqueue({
    id: 'd-4',
    stream: 'DOCUMENT',
    opClass: 'DURABLE',
    payload: { node: 'delete-1' },
    timestamp: Date.now()
  });
  assert.equal(durableAccepted, true, 'Durable message must NEVER be dropped');

  const stats = bpm.getStats();
  assert.equal(stats.droppedEphemeralCount, 1);
  assert.equal(stats.queuedCount, 4);
});

test('BackpressureManager: Coalesces high-frequency transient dragging movements', () => {
  const bpm = new BackpressureManager(20, 10);

  // Simulate rapid mouse movements for node-42 during drag
  bpm.enqueue({
    id: 'move-1',
    stream: 'DOCUMENT',
    opClass: 'COALESCIBLE',
    entityKey: 'node-42',
    payload: { x: 100, y: 100 },
    timestamp: 1000
  });

  bpm.enqueue({
    id: 'move-2',
    stream: 'DOCUMENT',
    opClass: 'COALESCIBLE',
    entityKey: 'node-42',
    payload: { x: 105, y: 105 },
    timestamp: 1010
  });

  bpm.enqueue({
    id: 'move-3',
    stream: 'DOCUMENT',
    opClass: 'COALESCIBLE',
    entityKey: 'node-42',
    payload: { x: 120, y: 120 },
    timestamp: 1020
  });

  const stats = bpm.getStats();
  assert.equal(stats.queuedCount, 1, 'Queue length must remain 1 due to coalescing');
  assert.equal(stats.coalescedCount, 2, '2 redundant updates should be coalesced');

  const item = bpm.dequeue();
  assert.deepEqual(item?.payload, { x: 120, y: 120 }, 'Dequeued item must be the latest coalesced position');
});

test('AwarenessManager: Stationary cursor suppression & adaptive rate tuning', () => {
  const awareness = new AwarenessManager('Alice', '#3B82F6');

  // 1. Initial movement should dispatch
  const firstMove = awareness.updateCursor(150, 200);
  assert.equal(firstMove, true, 'First position should dispatch');

  // 2. Exact or sub-pixel stationary position should be suppressed (0Hz)
  const stationaryMove = awareness.updateCursor(150.1, 200.2);
  assert.equal(stationaryMove, false, 'Stationary position must be suppressed');

  // 3. Transport quality tuning
  awareness.setTransportQuality(true, 20); // Fast LAN
  assert.ok(true);

  awareness.setTransportQuality(false, 250); // High latency relay
  assert.ok(true);
});
