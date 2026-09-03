/**
 * Drafo Awareness Manager
 *
 * Manages ephemeral presence state (cursors, selections, active tool, display names)
 * decoupled from durable CRDT and React canvas rendering trees.
 *
 * Features:
 * - Dynamic adaptive rate tuning based on transport quality and pointer velocity.
 * - Stationary suppression: 0 updates sent if cursor has not moved.
 * - Isolated event subscriptions preventing canvas-wide re-renders.
 */

export interface CursorPosition {
  x: number;
  y: number;
}

export interface LocalPresenceState {
  name: string;
  color: string;
  cursor: CursorPosition | null;
  selection: string[] | null;
  activeTool?: string | null;
}

export interface RemotePeerPresence extends LocalPresenceState {
  peerId: string;
  lastUpdated: number;
}

export class AwarenessManager {
  private localState: LocalPresenceState;
  private remotePeers = new Map<string, RemotePeerPresence>();
  private listeners = new Set<(peers: RemotePeerPresence[]) => void>();

  private lastSentCursor: CursorPosition | null = null;
  private lastSendTime = 0;
  private targetIntervalMs = 33; // Default ~30Hz

  constructor(initialName: string = 'Anonymous', initialColor: string = '#3B82F6') {
    this.localState = {
      name: initialName,
      color: initialColor,
      cursor: null,
      selection: null,
      activeTool: null
    };
  }

  /**
   * Adjust broadcast rate dynamically based on network transport and latency.
   * Target: Direct P2P ~30-60Hz (16-33ms), Relay/Slow ~10-15Hz (70-100ms).
   */
  public setTransportQuality(isDirect: boolean, rttMs?: number): void {
    if (!isDirect || (rttMs && rttMs > 150)) {
      this.targetIntervalMs = 80; // ~12Hz for slower or relayed connections
    } else if (rttMs && rttMs < 40) {
      this.targetIntervalMs = 20; // ~50Hz for ultra-low latency direct LAN
    } else {
      this.targetIntervalMs = 33; // ~30Hz standard direct WebRTC
    }
  }

  /**
   * Update local cursor position with stationary check.
   * Returns true if update should be dispatched, false if suppressed.
   */
  public updateCursor(x: number | null, y: number | null): boolean {
    const now = performance.now();

    // 1. Check if cursor is unchanged (stationary suppression)
    if (x === null && y === null) {
      if (this.localState.cursor === null) return false;
      this.localState.cursor = null;
      this.lastSentCursor = null;
      return true; // Dispatched once to clear cursor
    }

    if (
      this.lastSentCursor &&
      Math.abs(this.lastSentCursor.x - (x ?? 0)) < 0.5 &&
      Math.abs(this.lastSentCursor.y - (y ?? 0)) < 0.5
    ) {
      return false; // Stationary: suppress transmission
    }

    // 2. Throttle based on target interval
    if (now - this.lastSendTime < this.targetIntervalMs) {
      return false;
    }

    this.localState.cursor = { x: x ?? 0, y: y ?? 0 };
    this.lastSentCursor = { ...this.localState.cursor };
    this.lastSendTime = now;
    return true;
  }

  public updateSelection(selectedIds: string[] | null): void {
    this.localState.selection = selectedIds && selectedIds.length > 0 ? [...selectedIds] : null;
  }

  public setLocalProfile(name: string, color?: string): void {
    this.localState.name = name;
    if (color) this.localState.color = color;
  }

  public getLocalState(): LocalPresenceState {
    return { ...this.localState };
  }

  public setRemotePeerPresence(peerId: string, presence: LocalPresenceState): void {
    this.remotePeers.set(peerId, {
      ...presence,
      peerId,
      lastUpdated: Date.now()
    });
    this.notifyListeners();
  }

  public removeRemotePeer(peerId: string): void {
    if (this.remotePeers.delete(peerId)) {
      this.notifyListeners();
    }
  }

  public getRemotePeers(): RemotePeerPresence[] {
    return Array.from(this.remotePeers.values());
  }

  public subscribe(listener: (peers: RemotePeerPresence[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const peers = this.getRemotePeers();
    this.listeners.forEach((cb) => cb(peers));
  }
}
