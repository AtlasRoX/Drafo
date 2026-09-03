import test from 'node:test';
import assert from 'node:assert/strict';
import { createNetworkPolicy, DEFAULT_NETWORK_POLICIES } from '../../src/network/NetworkPolicy.ts';
import { DefaultPeerTopologyPolicy } from '../../src/network/PeerTopologyPolicy.ts';
import type { PeerInfo } from '../../src/network/PeerTopologyPolicy.ts';
import { PeerManager } from '../../src/network/PeerManager.ts';

test('NetworkPolicy: Enforces mode-specific transport and signaling constraints', () => {
  const autoPolicy = createNetworkPolicy('AUTO');
  assert.equal(autoPolicy.allowRelay, true);
  assert.equal(autoPolicy.allowTurn, true);
  assert.equal(autoPolicy.allowInternetSignaling, true);

  const localPolicy = createNetworkPolicy('LOCAL');
  assert.equal(localPolicy.allowRelay, false);
  assert.equal(localPolicy.allowTurn, false);
  assert.equal(localPolicy.allowInternetSignaling, false);

  const p2pPolicy = createNetworkPolicy('P2P_ONLY');
  assert.equal(p2pPolicy.allowRelay, false);
  assert.equal(p2pPolicy.allowTurn, false);
  assert.equal(p2pPolicy.allowInternetSignaling, false);

  const offlinePolicy = createNetworkPolicy('OFFLINE');
  assert.equal(offlinePolicy.maxDirectPeers, 0);
  assert.equal(offlinePolicy.maxTotalPeers, 0);
});

test('PeerTopologyPolicy: Bounds peer mesh and selects healthiest low-latency peers', () => {
  const policy = new DefaultPeerTopologyPolicy(3, 10); // Max 3 direct peers

  const peers: PeerInfo[] = [
    { peerId: 'p1', connectionState: 'connected', transport: 'webrtc', latencyMs: 120, healthScore: 90 },
    { peerId: 'p2', connectionState: 'connected', transport: 'webrtc', latencyMs: 25, healthScore: 95 },
    { peerId: 'p3', connectionState: 'connected', transport: 'webrtc', latencyMs: 350, healthScore: 60 },
    { peerId: 'p4', connectionState: 'connected', transport: 'webrtc', latencyMs: 40, healthScore: 95 },
    { peerId: 'p5', connectionState: 'disconnected', transport: 'unknown' }
  ];

  const selected = policy.selectPeers(peers);
  assert.equal(selected.length, 3, 'Must cap direct peers to maxDirectPeers (3)');

  // Selected should be p2 (health 95, lat 25), p4 (health 95, lat 40), and p1 (health 90, lat 120)
  assert.equal(selected[0].peerId, 'p2');
  assert.equal(selected[1].peerId, 'p4');
  assert.equal(selected[2].peerId, 'p1');
});

test('PeerManager: Deterministic glare prevention and health tracking', () => {
  const pmAlice = new PeerManager('peer-alice');
  const pmBob = new PeerManager('peer-bob');

  // Lexicographical tie-breaker: peer-alice < peer-bob
  assert.equal(pmAlice.shouldInitiateOffer('peer-bob'), true, 'Alice should initiate offer to Bob');
  assert.equal(pmBob.shouldInitiateOffer('peer-alice'), false, 'Bob should NOT initiate offer to Alice (waits for Alice)');

  // Record ping/pong RTT
  pmAlice.addOrUpdatePeer({ peerId: 'peer-bob', connectionState: 'connected' });
  pmAlice.recordPong('peer-bob', 35); // 35ms low latency

  const bobInfo = pmAlice.getPeer('peer-bob');
  assert.equal(bobInfo?.latencyMs, 35);
  assert.equal(bobInfo?.healthScore, 100);

  pmAlice.recordPong('peer-bob', 450); // High latency spike
  assert.ok((bobInfo?.healthScore ?? 0) < 90, 'Health score must degrade on high latency');
});
