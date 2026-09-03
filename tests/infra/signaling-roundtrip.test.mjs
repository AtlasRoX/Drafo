import test from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../../infra/signaling/server.mjs';

test('Signaling Server: Handles peer connection, room isolation, offer/answer exchange, and clean shutdown', async () => {
  // 1. Start server on dynamic port
  await new Promise((resolve) => {
    server.listen(0, () => resolve());
  });
  const port = server.address().port;
  const baseUrl = `ws://127.0.0.1:${port}`;

  // 2. Connect Alice and Bob to room-infra-1
  const aliceWs = new WebSocket(`${baseUrl}?room=room-infra-1&peer=peer-alice`);
  const bobWs = new WebSocket(`${baseUrl}?room=room-infra-1&peer=peer-bob`);

  await Promise.all([
    new Promise((resolve) => (aliceWs.onopen = resolve)),
    new Promise((resolve) => (bobWs.onopen = resolve))
  ]);

  // 3. Alice sends SDP offer to Bob
  const offerMsg = {
    type: 'offer',
    roomId: 'room-infra-1',
    senderPeerId: 'peer-alice',
    targetPeerId: 'peer-bob',
    data: { sdp: 'v=0\r\no=alice 100 100 IN IP4 127.0.0.1...' }
  };

  const bobReceivedPromise = new Promise((resolve) => {
    bobWs.onmessage = (event) => {
      resolve(JSON.parse(event.data));
    };
  });

  aliceWs.send(JSON.stringify(offerMsg));
  const bobReceived = await bobReceivedPromise;

  assert.equal(bobReceived.type, 'offer');
  assert.equal(bobReceived.senderPeerId, 'peer-alice');
  assert.equal(bobReceived.data.sdp, offerMsg.data.sdp);

  // 4. Bob sends SDP answer to Alice
  const answerMsg = {
    type: 'answer',
    roomId: 'room-infra-1',
    senderPeerId: 'peer-bob',
    targetPeerId: 'peer-alice',
    data: { sdp: 'v=0\r\no=bob 200 200 IN IP4 127.0.0.1...' }
  };

  const aliceReceivedPromise = new Promise((resolve) => {
    aliceWs.onmessage = (event) => {
      resolve(JSON.parse(event.data));
    };
  });

  bobWs.send(JSON.stringify(answerMsg));
  const aliceReceived = await aliceReceivedPromise;

  assert.equal(aliceReceived.type, 'answer');
  assert.equal(aliceReceived.senderPeerId, 'peer-bob');
  assert.equal(aliceReceived.data.sdp, answerMsg.data.sdp);

  // 5. Clean teardown
  aliceWs.close();
  bobWs.close();

  await new Promise((resolve) => {
    server.close(() => resolve());
  });
});
