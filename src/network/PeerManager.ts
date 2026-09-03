/**
 * Drafo Peer Manager
 *
 * Manages active remote peers, health scores, duplicate connection glare prevention,
 * and topology bounds enforcement.
 */

import { DefaultPeerTopologyPolicy } from './PeerTopologyPolicy.ts';
import type { PeerInfo, PeerTopologyPolicy } from './PeerTopologyPolicy.ts';

export class PeerManager {
  private peers = new Map<string, PeerInfo>();
  private localPeerId: string;
  private topologyPolicy: PeerTopologyPolicy;
  private listeners = new Set<(peers: PeerInfo[]) => void>();

  constructor(localPeerId: string, topologyPolicy?: PeerTopologyPolicy) {
    this.localPeerId = localPeerId;
    this.topologyPolicy = topologyPolicy || new DefaultPeerTopologyPolicy();
  }

  public getLocalPeerId(): string {
    return this.localPeerId;
  }

  /**
   * Deterministic tie-breaker to prevent glare / duplicate connections:
   * Only the lexicographically smaller Peer ID initiates an offer to the other.
   */
  public shouldInitiateOffer(remotePeerId: string): boolean {
    return this.localPeerId < remotePeerId;
  }

  public addOrUpdatePeer(info: Partial<PeerInfo> & { peerId: string }): void {
    const existing = this.peers.get(info.peerId) || {
      peerId: info.peerId,
      connectionState: 'connecting',
      transport: 'unknown',
      healthScore: 100,
      bytesSent: 0,
      bytesReceived: 0,
      lastSeen: Date.now()
    };

    const updated: PeerInfo = {
      ...existing,
      ...info,
      lastSeen: Date.now()
    };

    this.peers.set(info.peerId, updated);
    this.notify();
  }

  public removePeer(peerId: string): void {
    if (this.peers.delete(peerId)) {
      this.notify();
    }
  }

  public getPeer(peerId: string): PeerInfo | undefined {
    return this.peers.get(peerId);
  }

  public getAllPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  public getActivePeers(): PeerInfo[] {
    return this.topologyPolicy.selectPeers(this.getAllPeers());
  }

  public canAcceptConnection(candidate: PeerInfo): boolean {
    return this.topologyPolicy.shouldConnect(this.getAllPeers(), candidate);
  }

  /**
   * Record a pong response, calculate RTT, and update health score
   */
  public recordPong(peerId: string, rttMs: number): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.latencyMs = Math.round(rttMs);
      // Health score computation: 100 base, penalize high latency
      let score = 100;
      if (rttMs > 200) score -= Math.min(50, Math.round((rttMs - 200) / 10));
      peer.healthScore = Math.max(10, score);
      peer.lastSeen = Date.now();
      this.notify();
    }
  }

  public subscribe(listener: (peers: PeerInfo[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const list = this.getAllPeers();
    this.listeners.forEach((cb) => cb(list));
  }
}
