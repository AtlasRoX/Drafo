/**
 * Drafo Peer Topology Policy
 *
 * Implements pluggable peer selection algorithms to prevent O(N^2) mesh explosion.
 * Evaluates peer latency, packet stability, and transport health to bound direct connections.
 */

export interface PeerInfo {
  peerId: string;
  displayName?: string;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed';
  transport: 'broadcast-channel' | 'webrtc' | 'relay' | 'turn' | 'local' | 'unknown';
  latencyMs?: number;
  healthScore?: number; // 0 to 100
  bytesSent?: number;
  bytesReceived?: number;
  lastSeen?: number;
}

export interface PeerTopologyPolicy {
  readonly maxDirectPeers: number;
  readonly maxTotalPeers: number;
  selectPeers(candidates: PeerInfo[]): PeerInfo[];
  shouldConnect(currentPeers: PeerInfo[], candidate: PeerInfo): boolean;
}

export class DefaultPeerTopologyPolicy implements PeerTopologyPolicy {
  public readonly maxDirectPeers: number;
  public readonly maxTotalPeers: number;

  constructor(maxDirectPeers: number = 8, maxTotalPeers: number = 20) {
    this.maxDirectPeers = maxDirectPeers;
    this.maxTotalPeers = maxTotalPeers;
  }

  /**
   * Select best direct peer connections up to maxDirectPeers based on health score and latency
   */
  public selectPeers(candidates: PeerInfo[]): PeerInfo[] {
    // Exclude disconnected or failed peers
    const viable = candidates.filter(
      (p) => p.connectionState === 'connected' || p.connectionState === 'connecting'
    );

    // Sort by health score descending, then lowest latency
    viable.sort((a, b) => {
      const healthA = a.healthScore ?? 50;
      const healthB = b.healthScore ?? 50;
      if (healthA !== healthB) return healthB - healthA;

      const latA = a.latencyMs ?? 999;
      const latB = b.latencyMs ?? 999;
      return latA - latB;
    });

    return viable.slice(0, this.maxDirectPeers);
  }

  /**
   * Determine whether to accept or initiate a new direct connection
   */
  public shouldConnect(currentPeers: PeerInfo[], candidate: PeerInfo): boolean {
    const activeDirect = currentPeers.filter(
      (p) => p.connectionState === 'connected' || p.connectionState === 'connecting'
    );

    // If within bounds, accept immediately
    if (activeDirect.length < this.maxDirectPeers) {
      return true;
    }

    // If candidate has substantially better latency than the worst connected peer, permit swap
    const worstPeer = [...activeDirect].sort(
      (a, b) => (b.latencyMs ?? 999) - (a.latencyMs ?? 999)
    )[0];

    if (worstPeer && (candidate.latencyMs ?? 999) < (worstPeer.latencyMs ?? 999) * 0.7) {
      return true;
    }

    return false;
  }
}
