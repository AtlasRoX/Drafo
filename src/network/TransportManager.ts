/**
 * Drafo Unified Transport Manager
 *
 * Provides a clean transport-agnostic interface abstracting WebRTC DataChannels,
 * BroadcastChannel, and manual transports.
 *
 * Invariant: No React component or CRDT algorithm interacts directly with RTCPeerConnection.
 */

import {
  encodeCollaborationMessage,
  decodeCollaborationMessage
} from '../collaboration/CollaborationProtocol.ts';
import type {
  CollaborationEnvelope,
  LogicalStream
} from '../collaboration/CollaborationProtocol.ts';
import type { PeerInfo } from './PeerTopologyPolicy.ts';

export type TransportType = 'broadcast-channel' | 'webrtc' | 'turn' | 'manual';

export interface TransportMessageEvent {
  envelope: CollaborationEnvelope;
  transportType: TransportType;
  rawBytes: Uint8Array;
}

export interface PeerTransport {
  readonly peerId: string;
  readonly transportType: TransportType;
  send(envelope: CollaborationEnvelope): Promise<void>;
  close(): Promise<void>;
}

export class BroadcastChannelPeerTransport implements PeerTransport {
  public readonly peerId: string;
  public readonly transportType: TransportType = 'broadcast-channel';
  private channel: BroadcastChannel;

  constructor(peerId: string, channel: BroadcastChannel) {
    this.peerId = peerId;
    this.channel = channel;
  }

  public async send(envelope: CollaborationEnvelope): Promise<void> {
    const bytes = encodeCollaborationMessage(envelope);
    this.channel.postMessage(bytes);
  }

  public async close(): Promise<void> {
    // Channel lifecycle managed by transport manager
  }
}

export class WebRTCPeerTransport implements PeerTransport {
  public readonly peerId: string;
  public readonly transportType: TransportType;
  private dataChannel: RTCDataChannel;

  constructor(peerId: string, dataChannel: RTCDataChannel, isTurn: boolean = false) {
    this.peerId = peerId;
    this.transportType = isTurn ? 'turn' : 'webrtc';
    this.dataChannel = dataChannel;
  }

  public async send(envelope: CollaborationEnvelope): Promise<void> {
    if (this.dataChannel.readyState === 'open') {
      const bytes = encodeCollaborationMessage(envelope);
      this.dataChannel.send(bytes as any);
    }
  }

  public async close(): Promise<void> {
    if (this.dataChannel.readyState === 'open') {
      this.dataChannel.close();
    }
  }
}

export class TransportManager {
  private transports = new Map<string, PeerTransport>();
  private localBroadcastChannel: BroadcastChannel | null = null;
  private messageListeners = new Set<(event: TransportMessageEvent) => void>();
  private localPeerId: string;
  private roomId: string;

  constructor(localPeerId: string, roomId: string) {
    this.localPeerId = localPeerId;
    this.roomId = roomId;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.localBroadcastChannel = new BroadcastChannel(`drafo-data-${roomId}`);
      this.localBroadcastChannel.onmessage = (event: MessageEvent) => {
        this.handleIncomingRaw(event.data, 'broadcast-channel');
      };
    }
  }

  public registerPeerTransport(peerId: string, transport: PeerTransport): void {
    this.transports.set(peerId, transport);
  }

  public removePeerTransport(peerId: string): void {
    const existing = this.transports.get(peerId);
    if (existing) {
      existing.close().catch(() => {});
      this.transports.delete(peerId);
    }
  }

  public getPeerTransport(peerId: string): PeerTransport | undefined {
    return this.transports.get(peerId);
  }

  /**
   * Broadcast an envelope to all connected direct peers and local BroadcastChannel
   */
  public async broadcast(envelope: CollaborationEnvelope): Promise<void> {
    const bytes = encodeCollaborationMessage(envelope);

    // 1. Send via local BroadcastChannel
    if (this.localBroadcastChannel) {
      try {
        this.localBroadcastChannel.postMessage(bytes);
      } catch (err) {
        console.warn('BroadcastChannel transmission error:', err);
      }
    }

    // 2. Send to all active WebRTC peers
    const promises: Promise<void>[] = [];
    this.transports.forEach((transport) => {
      promises.push(
        transport.send(envelope).catch((err) => {
          console.warn(`Failed to send to peer ${transport.peerId}:`, err);
        })
      );
    });

    await Promise.allSettled(promises);
  }

  public handleIncomingRaw(rawData: unknown, transportType: TransportType): void {
    let uint8: Uint8Array;
    if (rawData instanceof Uint8Array) {
      uint8 = rawData;
    } else if (rawData instanceof ArrayBuffer) {
      uint8 = new Uint8Array(rawData);
    } else {
      return;
    }

    try {
      const envelope = decodeCollaborationMessage(uint8);
      // Discard self-echoes
      if (envelope.senderPeerId === this.localPeerId) {
        return;
      }

      const event: TransportMessageEvent = {
        envelope,
        transportType,
        rawBytes: uint8
      };

      this.messageListeners.forEach((cb) => cb(event));
    } catch {
      // Safely ignore corrupted or alien frames
    }
  }

  public onMessage(callback: (event: TransportMessageEvent) => void): () => void {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  public async close(): Promise<void> {
    if (this.localBroadcastChannel) {
      this.localBroadcastChannel.close();
      this.localBroadcastChannel = null;
    }

    const closePromises = Array.from(this.transports.values()).map((t) => t.close());
    await Promise.allSettled(closePromises);
    this.transports.clear();
    this.messageListeners.clear();
  }
}
