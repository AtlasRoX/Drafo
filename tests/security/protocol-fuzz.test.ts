import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeCollaborationMessage,
  decodeCollaborationMessage,
  ProtocolError,
  PROTOCOL_VERSION
} from '../../src/collaboration/CollaborationProtocol.ts';
import type { CollaborationEnvelope } from '../../src/collaboration/CollaborationProtocol.ts';

test('CollaborationProtocol: Round-trip valid message encoding & decoding', () => {
  const original: CollaborationEnvelope = {
    version: PROTOCOL_VERSION,
    stream: 'DOCUMENT',
    type: 'encrypted-update',
    roomId: 'room-alpha-99',
    sessionId: 'sess-test-uuid-1234',
    senderPeerId: 'peer-alice-001',
    sequence: 42,
    epoch: 1,
    timestamp: 1772651234567,
    iv: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    payload: new Uint8Array([100, 101, 102, 103, 104, 105])
  };

  const encoded = encodeCollaborationMessage(original);
  assert.ok(encoded instanceof Uint8Array);

  const decoded = decodeCollaborationMessage(encoded);
  assert.equal(decoded.version, original.version);
  assert.equal(decoded.stream, original.stream);
  assert.equal(decoded.type, original.type);
  assert.equal(decoded.roomId, original.roomId);
  assert.equal(decoded.sessionId, original.sessionId);
  assert.equal(decoded.senderPeerId, original.senderPeerId);
  assert.equal(decoded.sequence, original.sequence);
  assert.equal(decoded.epoch, original.epoch);
  assert.equal(decoded.timestamp, original.timestamp);
  assert.deepEqual(Array.from(decoded.iv || []), Array.from(original.iv || []));
  assert.deepEqual(Array.from(decoded.payload), Array.from(original.payload));
});

test('CollaborationProtocol: Rejects truncated and malformed inputs gracefully', () => {
  // Empty byte array
  assert.throws(() => decodeCollaborationMessage(new Uint8Array(0)), {
    name: 'ProtocolError',
    message: /too short/i
  });

  // Short header
  assert.throws(() => decodeCollaborationMessage(new Uint8Array([0x44, 0x52, 0x41, 0x46])), {
    name: 'ProtocolError',
    message: /too short/i
  });

  // Wrong magic bytes
  const wrongMagic = new Uint8Array(32);
  wrongMagic.set([0x00, 0x00, 0x00, 0x00], 0);
  assert.throws(() => decodeCollaborationMessage(wrongMagic), {
    name: 'ProtocolError',
    message: /Invalid protocol magic/i
  });
});

test('CollaborationProtocol Fuzzing: 10,000 random byte sequences produce 0 crashes or hangs', () => {
  let handledRejections = 0;
  let parsedMatches = 0;

  for (let i = 0; i < 10000; i++) {
    // Generate random lengths between 0 and 1024 bytes
    const length = Math.floor(Math.random() * 1024);
    const randomBytes = new Uint8Array(length);

    // Occasionally insert the magic bytes to stress header parsers
    if (i % 5 === 0 && length >= 4) {
      randomBytes[0] = 0x44;
      randomBytes[1] = 0x52;
      randomBytes[2] = 0x41;
      randomBytes[3] = 0x46;
    }

    for (let j = (i % 5 === 0 ? 4 : 0); j < length; j++) {
      randomBytes[j] = Math.floor(Math.random() * 256);
    }

    try {
      decodeCollaborationMessage(randomBytes);
      parsedMatches++;
    } catch (err) {
      assert.ok(err instanceof ProtocolError, `Expected ProtocolError but got ${err}`);
      handledRejections++;
    }
  }

  assert.equal(handledRejections + parsedMatches, 10000);
  assert.ok(handledRejections > 9900, 'Expected vast majority of random garbage to be safely rejected');
});
