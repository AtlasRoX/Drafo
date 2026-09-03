/**
 * Drafo Signaling Client
 *
 * Implements connection-establishment metadata exchange strictly separated from transport:
 * 1. BroadcastChannelSignaling (instant local multi-tab sync)
 * 2. WebSocketSignaling (stateless self-hosted open-source server)
 * 3. ManualSignaling (zero-infrastructure user-mediated SDP offer/answer exchange)
 *
 * Invariant: Signaling servers never receive, store, or inspect document plaintext.
 */

export interface SignalingMessage {
  type: 'join' | 'offer' | 'answer' | 'candidate' | 'leave';
  roomId: string;
  senderPeerId: string;
  targetPeerId?: string;
  data?: unknown; // SDP string or RTCIceCandidateInit
  timestamp: number;
}

export interface SignalingTransport {
  connect(roomId: string, localPeerId: string): Promise<void>;
  send(msg: SignalingMessage): Promise<void>;
  onMessage(callback: (msg: SignalingMessage) => void): () => void;
  disconnect(): Promise<void>;
}

/**
 * 1. Same-Origin BroadcastChannel Signaling (Fast local multi-tab discovery)
 */
export class BroadcastChannelSignaling implements SignalingTransport {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<(msg: SignalingMessage) => void>();
  private localPeerId = '';
  private roomId = '';

  public async connect(roomId: string, localPeerId: string): Promise<void> {
    this.roomId = roomId;
    this.localPeerId = localPeerId;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(`drafo-signal-${roomId}`);
      this.channel.onmessage = (event: MessageEvent<SignalingMessage>) => {
        const msg = event.data;
        if (msg && msg.senderPeerId !== this.localPeerId) {
          if (!msg.targetPeerId || msg.targetPeerId === this.localPeerId) {
            this.listeners.forEach((cb) => cb(msg));
          }
        }
      };
    }
  }

  public async send(msg: SignalingMessage): Promise<void> {
    if (this.channel) {
      this.channel.postMessage({
        ...msg,
        senderPeerId: this.localPeerId,
        roomId: this.roomId,
        timestamp: Date.now()
      });
    }
  }

  public onMessage(callback: (msg: SignalingMessage) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public async disconnect(): Promise<void> {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

/**
 * 2. Self-Hosted WebSocket Signaling
 */
export class WebSocketSignaling implements SignalingTransport {
  private ws: WebSocket | null = null;
  private listeners = new Set<(msg: SignalingMessage) => void>();
  private serverUrl: string;
  private localPeerId = '';
  private roomId = '';

  constructor(serverUrl: string = 'ws://localhost:4444') {
    this.serverUrl = serverUrl;
  }

  public async connect(roomId: string, localPeerId: string): Promise<void> {
    this.roomId = roomId;
    this.localPeerId = localPeerId;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.serverUrl}/drafo-signal?room=${encodeURIComponent(roomId)}&peer=${encodeURIComponent(localPeerId)}`);

        this.ws.onopen = () => {
          // Send initial announcement
          this.send({
            type: 'join',
            roomId: this.roomId,
            senderPeerId: this.localPeerId,
            timestamp: Date.now()
          });
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const parsed = JSON.parse(event.data) as SignalingMessage;
            if (parsed && parsed.senderPeerId !== this.localPeerId) {
              if (!parsed.targetPeerId || parsed.targetPeerId === this.localPeerId) {
                this.listeners.forEach((cb) => cb(parsed));
              }
            }
          } catch {
            // Ignore malformed control frames
          }
        };

        this.ws.onerror = (err) => {
          reject(err);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  public async send(msg: SignalingMessage): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public onMessage(callback: (msg: SignalingMessage) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

/**
 * 3. Zero-Infrastructure Manual Signaling (User-mediated SDP copy/paste)
 */
export class ManualSignaling implements SignalingTransport {
  private listeners = new Set<(msg: SignalingMessage) => void>();
  private localPeerId = '';
  private roomId = '';

  public async connect(roomId: string, localPeerId: string): Promise<void> {
    this.roomId = roomId;
    this.localPeerId = localPeerId;
  }

  public async send(msg: SignalingMessage): Promise<void> {
    // In manual mode, outgoing messages are exported as strings by the UI layer
  }

  /**
   * Inject a manually imported signaling payload (from copy-pasted string or scanned QR code)
   */
  public ingestManualPayload(jsonStr: string): void {
    try {
      const parsed = JSON.parse(jsonStr) as SignalingMessage;
      if (parsed && parsed.type && parsed.senderPeerId) {
        this.listeners.forEach((cb) => cb(parsed));
      }
    } catch {
      throw new Error('Failed to parse manual signaling payload');
    }
  }

  public onMessage(callback: (msg: SignalingMessage) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public async disconnect(): Promise<void> {
    this.listeners.clear();
  }
}
