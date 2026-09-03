import test from 'node:test';
import assert from 'node:assert/strict';
import { ConnectionStateMachine } from '../../src/network/ConnectionStateMachine.ts';
import type { StateTransitionEvent } from '../../src/network/ConnectionStateMachine.ts';
import { ManualSignaling } from '../../src/network/SignalingClient.ts';
import type { SignalingMessage } from '../../src/network/SignalingClient.ts';

test('ConnectionStateMachine: Deterministic lifecycle transitions and backoff calculation', () => {
  const csm = new ConnectionStateMachine(4);
  const events: StateTransitionEvent[] = [];
  csm.subscribe((e) => events.push(e));

  assert.equal(csm.getState(), 'idle');

  // 1. Transition idle -> discovering -> connecting
  csm.transitionTo('discovering');
  assert.equal(csm.getState(), 'discovering');

  csm.transitionTo('connecting');
  assert.equal(csm.getState(), 'connecting');

  // 2. Transition connecting -> connected
  csm.transitionTo('connected');
  assert.equal(csm.getState(), 'connected');
  assert.equal(csm.getReconnectAttempt(), 0, 'Successful connection must reset reconnect counter');

  // 3. Temporary degradation
  csm.transitionTo('degraded', 'high packet loss');
  assert.equal(csm.getState(), 'degraded');

  // 4. Lost connection -> reconnecting
  csm.transitionTo('reconnecting');
  assert.equal(csm.getState(), 'reconnecting');
  assert.equal(csm.getReconnectAttempt(), 1);

  // 5. Exponential backoff calculation
  const delay1 = csm.getBackoffDelay(500, 15000);
  assert.ok(delay1 >= 500 && delay1 <= 1500, `Delay must incorporate jitter: ${delay1}`);

  csm.transitionTo('reconnecting');
  assert.equal(csm.getReconnectAttempt(), 2);
  const delay2 = csm.getBackoffDelay(500, 15000);
  assert.ok(delay2 > delay1 * 0.8, 'Delay must grow exponentially with attempts');

  assert.equal(events.length, 6);
});

test('ManualSignaling: Ingests manual SDP payloads and notifies subscribers', async () => {
  const manual = new ManualSignaling();
  await manual.connect('room-manual-test', 'peer-bob');

  const received: SignalingMessage[] = [];
  manual.onMessage((msg) => received.push(msg));

  const validPayload = JSON.stringify({
    type: 'offer',
    roomId: 'room-manual-test',
    senderPeerId: 'peer-alice',
    data: { sdp: 'v=0\r\no=alice 123456 ...' },
    timestamp: Date.now()
  });

  manual.ingestManualPayload(validPayload);

  assert.equal(received.length, 1);
  assert.equal(received[0].type, 'offer');
  assert.equal(received[0].senderPeerId, 'peer-alice');

  // Malformed JSON should throw cleanly
  assert.throws(() => manual.ingestManualPayload('not-a-valid-json'), /Failed to parse/i);

  await manual.disconnect();
});
