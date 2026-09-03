import test from 'node:test';
import assert from 'node:assert/strict';
import { PeerIdentity } from '../../src/crypto/PeerIdentity.ts';
import { SessionManager, BoundedSlidingWindow } from '../../src/collaboration/SessionManager.ts';
import { DocumentCrypto } from '../../src/crypto/DocumentCrypto.ts';
import type { AuthenticatedMetadata } from '../../src/crypto/DocumentCrypto.ts';
import { InvitationManager } from '../../src/crypto/InvitationManager.ts';

test('PeerIdentity: Generates stable Peer ID and creates verifiable digital signatures', async () => {
  const identity = new PeerIdentity();
  const info = await identity.init();

  assert.ok(info.peerId.startsWith('peer-'));
  assert.equal(typeof info.publicKeyHex, 'string');

  const payload = new TextEncoder().encode('Drafo-Verified-Message-123');
  const signature = await identity.sign(payload);
  assert.ok(signature instanceof Uint8Array);

  const isValid = await PeerIdentity.verify(info.publicKeyHex, signature, payload);
  assert.equal(isValid, true, 'Signature must verify against issuer public key');

  // Verify tampered payload fails
  const tamperedPayload = new TextEncoder().encode('Drafo-Tampered-Message-456');
  const isTamperedValid = await PeerIdentity.verify(info.publicKeyHex, signature, tamperedPayload);
  assert.equal(isTamperedValid, false, 'Tampered payload must fail signature verification');
});

test('SessionManager & BoundedSlidingWindow: Blocks replay attacks and obsolete epochs', () => {
  const sm = new SessionManager();
  const session = sm.createSession('peer-alice-01', 'room-alpha', 1);

  // 1. Initial messages in sequence
  assert.equal(sm.validateIncomingMessage(session.sessionId, 1, 1), 'VALID');
  assert.equal(sm.validateIncomingMessage(session.sessionId, 2, 1), 'VALID');
  assert.equal(sm.validateIncomingMessage(session.sessionId, 5, 1), 'VALID');

  // 2. Out-of-order within window
  assert.equal(sm.validateIncomingMessage(session.sessionId, 3, 1), 'VALID');
  assert.equal(sm.validateIncomingMessage(session.sessionId, 4, 1), 'VALID');

  // 3. Replay of sequence 3 -> MUST BE REJECTED
  assert.equal(
    sm.validateIncomingMessage(session.sessionId, 3, 1),
    'REJECTED_REPLAY',
    'Replayed sequence number must be rejected'
  );

  // 4. Packet with wrong epoch -> MUST BE REJECTED
  assert.equal(
    sm.validateIncomingMessage(session.sessionId, 6, 2),
    'REJECTED_INVALID_EPOCH',
    'Message with invalid epoch must be rejected'
  );

  // 5. Huge jump ahead to test window boundary
  assert.equal(sm.validateIncomingMessage(session.sessionId, 500, 1), 'VALID');

  // Packet with sequence 5 (diff = 495 > 256) -> MUST BE TOO OLD
  assert.equal(
    sm.validateIncomingMessage(session.sessionId, 5, 1),
    'REJECTED_TOO_OLD',
    'Packets outside 256-bit sliding window must be rejected as too old'
  );
});

test('DocumentCrypto: AES-256-GCM encryption with fresh IVs, AAD tamper rejection, and wrong key rejection', async () => {
  const docKey = await DocumentCrypto.generateDocumentKey();
  const rawPlaintext = new TextEncoder().encode('Yjs-Binary-CRDT-Update-Data');

  const meta: AuthenticatedMetadata = {
    protocolVersion: 1,
    roomId: 'room-alpha',
    sessionId: 'sess-001',
    senderPeerId: 'peer-alice-01',
    sequenceNumber: 1,
    keyEpoch: 1
  };

  // 1. Encrypt payload
  const { ciphertext, iv } = await DocumentCrypto.encryptPayload(docKey, rawPlaintext, meta);
  assert.equal(iv.length, 12, 'IV must be exactly 12 bytes');
  assert.notDeepEqual(ciphertext, rawPlaintext);

  // 2. Verify fresh unique IV on subsequent encryption
  const enc2 = await DocumentCrypto.encryptPayload(docKey, rawPlaintext, meta);
  assert.notDeepEqual(iv, enc2.iv, 'Subsequent encryptions must generate unique random nonces');

  // 3. Decrypt with matching metadata
  const decrypted = await DocumentCrypto.decryptPayload(docKey, ciphertext, iv, meta);
  assert.equal(new TextDecoder().decode(decrypted), 'Yjs-Binary-CRDT-Update-Data');

  // 4. Tampered ciphertext rejection
  const tamperedCiphertext = new Uint8Array(ciphertext);
  tamperedCiphertext[0] ^= 0xff; // Flip bits
  await assert.rejects(
    () => DocumentCrypto.decryptPayload(docKey, tamperedCiphertext, iv, meta),
    /failed|tag/i,
    'Tampered ciphertext must fail authentication tag check'
  );

  // 5. Tampered AAD rejection (e.g. attacker alters senderPeerId in header)
  const tamperedMeta: AuthenticatedMetadata = { ...meta, senderPeerId: 'peer-malicious-99' };
  await assert.rejects(
    () => DocumentCrypto.decryptPayload(docKey, ciphertext, iv, tamperedMeta),
    /failed|tag/i,
    'Altered AAD metadata must fail authentication tag check'
  );

  // 6. Wrong key rejection
  const wrongKey = await DocumentCrypto.generateDocumentKey();
  await assert.rejects(
    () => DocumentCrypto.decryptPayload(wrongKey, ciphertext, iv, meta),
    /failed|tag/i,
    'Decryption with wrong document key must fail'
  );
});

test('InvitationManager: Creates verifiable versioned DrafoInvitation and rejects tampered invitations', async () => {
  const issuer = new PeerIdentity();
  await issuer.init();

  const invitation = await InvitationManager.createInvitation(
    issuer,
    'room-security-vault',
    1,
    'YWJjZGVmMTIzNDU2', // Mock base64 key
    ['read', 'write'],
    3600000 // 1 hour
  );

  assert.equal(invitation.version, 1);
  assert.equal(invitation.roomId, 'room-security-vault');
  assert.equal(invitation.issuerPeerId, issuer.getPeerId());

  // 1. Verify valid invitation
  const isValid = await InvitationManager.verifyInvitation(invitation, issuer.getPublicKeyHex());
  assert.equal(isValid, true);

  // 2. Reject tampered invitation (e.g. permissions altered to 'admin')
  const tamperedInvitation = {
    ...invitation,
    capabilities: ['read', 'write', 'admin'] as ('read' | 'write' | 'admin')[]
  };
  const isTamperedValid = await InvitationManager.verifyInvitation(tamperedInvitation, issuer.getPublicKeyHex());
  assert.equal(isTamperedValid, false, 'Tampered invitation capabilities must fail verification');

  // 3. Serialization and deserialization roundtrip
  const serialized = InvitationManager.serialize(invitation);
  assert.equal(typeof serialized, 'string');
  const restored = InvitationManager.deserialize(serialized);
  assert.equal(restored.roomId, invitation.roomId);
  assert.equal(restored.signature, invitation.signature);
});
