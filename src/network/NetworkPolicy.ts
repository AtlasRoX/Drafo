/**
 * Drafo Network Policy
 *
 * Configures connection constraints, infrastructure access, and operational modes:
 * - AUTO: Uses configured discovery/signaling + best available transport (Direct P2P or TURN).
 * - LOCAL: Restricts to same-device and local LAN connections; no public Internet signaling.
 * - MANUAL: Zero-infrastructure mode; user mediates SDP offer/answer exchange directly.
 * - P2P_ONLY: No Drafo signaling, no relay, no TURN. Direct peer transport only.
 * - OFFLINE: Completely disables all network activity; purely local editing and persistence.
 */

export type ConnectionMode = 'AUTO' | 'LOCAL' | 'MANUAL' | 'OFFLINE' | 'P2P_ONLY';

export interface NetworkPolicy {
  mode: ConnectionMode;
  maxDirectPeers: number;
  maxTotalPeers: number;
  allowRelay: boolean;
  allowTurn: boolean;
  allowInternetSignaling: boolean;
}

export const DEFAULT_NETWORK_POLICIES: Record<ConnectionMode, NetworkPolicy> = {
  AUTO: {
    mode: 'AUTO',
    maxDirectPeers: 8,
    maxTotalPeers: 20,
    allowRelay: true,
    allowTurn: true,
    allowInternetSignaling: true
  },
  LOCAL: {
    mode: 'LOCAL',
    maxDirectPeers: 12,
    maxTotalPeers: 24,
    allowRelay: false,
    allowTurn: false,
    allowInternetSignaling: false
  },
  MANUAL: {
    mode: 'MANUAL',
    maxDirectPeers: 6,
    maxTotalPeers: 12,
    allowRelay: false,
    allowTurn: false,
    allowInternetSignaling: false
  },
  P2P_ONLY: {
    mode: 'P2P_ONLY',
    maxDirectPeers: 8,
    maxTotalPeers: 16,
    allowRelay: false,
    allowTurn: false,
    allowInternetSignaling: false
  },
  OFFLINE: {
    mode: 'OFFLINE',
    maxDirectPeers: 0,
    maxTotalPeers: 0,
    allowRelay: false,
    allowTurn: false,
    allowInternetSignaling: false
  }
};

export function createNetworkPolicy(
  mode: ConnectionMode = 'AUTO',
  overrides?: Partial<NetworkPolicy>
): NetworkPolicy {
  const base = DEFAULT_NETWORK_POLICIES[mode] || DEFAULT_NETWORK_POLICIES.AUTO;
  return {
    ...base,
    ...overrides,
    mode // Ensure mode remains consistent
  };
}
