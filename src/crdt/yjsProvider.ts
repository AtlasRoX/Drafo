'use client';

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { WebsocketProvider } from 'y-websocket';
import type { FlowProject, FlowNode, FlowEdge, FlowSection } from '../types/flow.ts';

export interface PeerPresence {
  clientId: number;
  name: string;
  color: string;
  cursor?: { x: number; y: number } | null;
  selectedId?: string | null;
}

const PEER_COLORS = [
  '#2563EB', // Blue
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#EA580C', // Orange
  '#059669', // Emerald
  '#0284C7', // Sky
  '#D97706', // Amber
  '#4F46E5'  // Indigo
];

function getRandomColor(): string {
  return PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];
}

function getRandomName(): string {
  const adjectives = ['Curious', 'Swift', 'Bright', 'Clever', 'Agile', 'Cosmic', 'Solar', 'Atomic'];
  const nouns = ['Architect', 'Designer', 'Engineer', 'Navigator', 'Creator', 'Builder', 'Pioneer'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

/**
 * Generate an always unique, collision-free collaboration room ID
 */
export function generateUniqueRoomId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const timestamp = Date.now().toString(36).slice(-4);
  return `room-${rand}-${timestamp}`;
}

export class DrafoCollaborationEngine {
  private ydoc: Y.Doc;
  private webrtcProvider: WebrtcProvider | null = null;
  private wsProvider: WebsocketProvider | null = null;
  private currentRoomId: string | null = null;
  private localUser: { name: string; color: string };
  private onProjectSyncCallbacks: Set<(project: FlowProject) => void> = new Set();
  private onPeersChangeCallbacks: Set<(peers: PeerPresence[]) => void> = new Set();
  private isApplyingRemoteUpdate = false;

  constructor() {
    this.ydoc = new Y.Doc();
    this.localUser = {
      name: getRandomName(),
      color: getRandomColor()
    };
  }

  /**
   * Initialize or join collaboration session with dual WebRTC P2P + WebSocket transports
   */
  public joinRoom(roomId: string, password?: string): void {
    if (typeof window === 'undefined') return;
    if (this.currentRoomId === roomId && (this.webrtcProvider || this.wsProvider)) return;

    this.leaveRoom();
    this.currentRoomId = roomId;

    const cleanRoomId = roomId.trim();
    const webrtcRoomName = `drafo-room-${cleanRoomId}`;
    const wsRoomName = `drafo-sync-${cleanRoomId}`;

    const signalingServers = [
      'wss://y-webrtc-signaling.fly.dev',
      'wss://y-webrtc.fly.dev'
    ];

    try {
      // 1. Initialize P2P WebRTC Provider with Google STUN + OpenRelay TURN servers
      this.webrtcProvider = new WebrtcProvider(webrtcRoomName, this.ydoc, {
        signaling: signalingServers,
        password: password && password.trim().length > 0 ? password.trim() : undefined,
        filterBcConns: false, // Keep BroadcastChannel enabled for instant multi-tab sync!
        peerOpts: {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun.cloudflare.com:3478' },
              { urls: 'stun:openrelay.metered.ca:80' },
              {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelay',
                credential: 'openrelay'
              },
              {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelay',
                credential: 'openrelay'
              },
              {
                urls: 'turns:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelay',
                credential: 'openrelay'
              }
            ]
          }
        }
      });

      // 2. Initialize WebSocket Provider for guaranteed cross-network, cellular & firewall sync
      // Connects over outbound port 443; bridges peers across different NATs and networks seamlessly
      this.wsProvider = new WebsocketProvider(
        'wss://demos.yjs.dev/ws',
        wsRoomName,
        this.ydoc,
        {
          awareness: this.webrtcProvider.awareness
        }
      );

      // Set initial local presence in shared awareness
      this.webrtcProvider.awareness.setLocalStateField('user', {
        name: this.localUser.name,
        color: this.localUser.color,
        cursor: null,
        selectedId: null
      });

      // Listen for awareness changes (remote cursors & peer count)
      this.webrtcProvider.awareness.on('change', () => {
        this.notifyPeersChange();
      });

      // Listen for document changes
      this.ydoc.on('update', () => {
        if (!this.isApplyingRemoteUpdate) {
          this.notifyProjectSync();
        }
      });

      // Listen for provider connection and sync events
      this.webrtcProvider.on('synced', (data: { synced: boolean }) => {
        if (data && data.synced) {
          this.notifyProjectSync();
        }
      });

      this.wsProvider.on('sync', (isSynced: boolean) => {
        if (isSynced) {
          this.notifyProjectSync();
        }
      });
      this.wsProvider.on('status', () => {
        this.notifyPeersChange();
      });

      this.webrtcProvider.on('status', () => {
        this.notifyPeersChange();
      });
      this.webrtcProvider.on('peers', () => {
        this.notifyPeersChange();
      });
    } catch (err) {
      console.error('Failed to join WebRTC/WebSocket collaboration room:', err);
    }
  }

  /**
   * Leave the active collaboration session
   */
  public leaveRoom(): void {
    if (this.webrtcProvider) {
      this.webrtcProvider.destroy();
      this.webrtcProvider = null;
    }
    if (this.wsProvider) {
      this.wsProvider.destroy();
      this.wsProvider = null;
    }
    this.currentRoomId = null;
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#room=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    this.notifyPeersChange();
  }

  /**
   * Seed the Yjs CRDT with the current active project
   */
  public seedFromProject(project: FlowProject): void {
    this.ydoc.transact(() => {
      this.isApplyingRemoteUpdate = true;
      try {
        const yMeta = this.ydoc.getMap('meta');
        yMeta.set('id', project.id);
        yMeta.set('name', project.name);
        yMeta.set('description', project.description || '');
        yMeta.set('version', project.version || '1.0.0');
        yMeta.set('updatedAt', project.updatedAt);
        yMeta.set('canvasSettings', JSON.stringify(project.canvasSettings || {}));

        const yNodes = this.ydoc.getMap<FlowNode>('nodes');
        yNodes.clear();
        for (const n of project.nodes) {
          yNodes.set(n.id, n);
        }

        const yEdges = this.ydoc.getMap<FlowEdge>('edges');
        yEdges.clear();
        for (const e of project.edges) {
          yEdges.set(e.id, e);
        }

        const ySections = this.ydoc.getArray<FlowSection>('sections');
        ySections.delete(0, ySections.length);
        ySections.push(project.sections);
      } finally {
        this.isApplyingRemoteUpdate = false;
      }
    });
  }

  /**
   * Extract current state from Yjs CRDT into a FlowProject
   */
  public extractProject(): FlowProject {
    const yMeta = this.ydoc.getMap('meta');
    const yNodes = this.ydoc.getMap<FlowNode>('nodes');
    const yEdges = this.ydoc.getMap<FlowEdge>('edges');
    const ySections = this.ydoc.getArray<FlowSection>('sections');

    const nodes: FlowNode[] = [];
    yNodes.forEach((node) => {
      nodes.push(node);
    });

    const edges: FlowEdge[] = [];
    yEdges.forEach((edge) => {
      edges.push(edge);
    });

    const sections: FlowSection[] = ySections.toArray();

    const canvasSettingsRaw = yMeta.get('canvasSettings');
    let canvasSettings: FlowProject['canvasSettings'] = {
      showGrid: true,
      gridType: 'dots',
      bgColor: '#FFFFFF',
      snapToGrid: true,
      gridSize: 20,
      theme: 'light'
    };
    if (typeof canvasSettingsRaw === 'string') {
      try {
        canvasSettings = { ...canvasSettings, ...JSON.parse(canvasSettingsRaw) };
      } catch {
        // fallback
      }
    }

    return {
      id: (yMeta.get('id') as string) || 'project-crdt',
      name: (yMeta.get('name') as string) || 'Collaborative Diagram',
      description: (yMeta.get('description') as string) || '',
      version: (yMeta.get('version') as string) || '1.0.0',
      updatedAt: (yMeta.get('updatedAt') as string) || new Date().toISOString(),
      tags: ['Collaborative'],
      canvasSettings,
      sections,
      nodes,
      edges
    };
  }

  /**
   * Push local project modifications to the CRDT
   */
  public updateProjectFromLocal(project: FlowProject): void {
    if (this.isApplyingRemoteUpdate) return;

    this.ydoc.transact(() => {
      const yMeta = this.ydoc.getMap('meta');
      yMeta.set('name', project.name);
      yMeta.set('updatedAt', project.updatedAt);

      const yNodes = this.ydoc.getMap<FlowNode>('nodes');
      // Update or add nodes
      const activeNodeIds = new Set<string>();
      for (const node of project.nodes) {
        activeNodeIds.add(node.id);
        const existing = yNodes.get(node.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(node)) {
          yNodes.set(node.id, node);
        }
      }
      // Remove deleted nodes
      yNodes.forEach((_, id) => {
        if (!activeNodeIds.has(id)) {
          yNodes.delete(id);
        }
      });

      const yEdges = this.ydoc.getMap<FlowEdge>('edges');
      const activeEdgeIds = new Set<string>();
      for (const edge of project.edges) {
        activeEdgeIds.add(edge.id);
        const existing = yEdges.get(edge.id);
        if (!existing || JSON.stringify(existing) !== JSON.stringify(edge)) {
          yEdges.set(edge.id, edge);
        }
      }
      yEdges.forEach((_, id) => {
        if (!activeEdgeIds.has(id)) {
          yEdges.delete(id);
        }
      });

      const ySections = this.ydoc.getArray<FlowSection>('sections');
      ySections.delete(0, ySections.length);
      ySections.push(project.sections);
    });
  }

  /**
   * Broadcast local cursor position over awareness
   */
  public setLocalCursor(x: number | null, y: number | null, selectedId?: string | null): void {
    const awareness = this.webrtcProvider?.awareness || this.wsProvider?.awareness;
    if (!awareness) return;

    awareness.setLocalStateField('user', {
      name: this.localUser.name,
      color: this.localUser.color,
      cursor: x !== null && y !== null ? { x, y } : null,
      selectedId: selectedId || null
    });
  }

  /**
   * Set local username and color
   */
  public setLocalUserProfile(name: string, color?: string): void {
    this.localUser.name = name;
    if (color) this.localUser.color = color;
    const awareness = this.webrtcProvider?.awareness || this.wsProvider?.awareness;
    if (awareness) {
      const current = awareness.getLocalState()?.user || {};
      awareness.setLocalStateField('user', {
        ...current,
        name: this.localUser.name,
        color: this.localUser.color
      });
    }
  }

  public getLocalUserProfile(): { name: string; color: string } {
    return { ...this.localUser };
  }

  /**
   * Get active remote peers currently connected across WebRTC and WebSocket
   */
  public getRemotePeers(): PeerPresence[] {
    const awareness = this.webrtcProvider?.awareness || this.wsProvider?.awareness;
    if (!awareness) return [];

    const states = awareness.getStates();
    const myId = this.ydoc.clientID;
    const peers: PeerPresence[] = [];

    states.forEach((state: any, clientId: number) => {
      if (clientId !== myId && state.user) {
        peers.push({
          clientId,
          name: state.user.name || 'Anonymous Peer',
          color: state.user.color || '#3B82F6',
          cursor: state.user.cursor || null,
          selectedId: state.user.selectedId || null
        });
      }
    });

    return peers;
  }

  public onProjectSync(callback: (project: FlowProject) => void): () => void {
    this.onProjectSyncCallbacks.add(callback);
    return () => this.onProjectSyncCallbacks.delete(callback);
  }

  public onPeersChange(callback: (peers: PeerPresence[]) => void): () => void {
    this.onPeersChangeCallbacks.add(callback);
    return () => this.onPeersChangeCallbacks.delete(callback);
  }

  private notifyProjectSync(): void {
    const yMeta = this.ydoc.getMap('meta');
    const yNodes = this.ydoc.getMap('nodes');
    // Guard against emitting blank canvas before sync packets arrive from remote peer
    if (yNodes.size === 0 && !yMeta.has('name')) {
      return;
    }
    const proj = this.extractProject();
    this.onProjectSyncCallbacks.forEach((cb) => cb(proj));
  }

  private notifyPeersChange(): void {
    const peers = this.getRemotePeers();
    this.onPeersChangeCallbacks.forEach((cb) => cb(peers));
  }

  public getRoomId(): string | null {
    return this.currentRoomId;
  }

  public isConnected(): boolean {
    return !!(this.webrtcProvider || this.wsProvider);
  }

  public getYDoc(): Y.Doc {
    return this.ydoc;
  }
}

// Global Singleton Instance
export const collabEngine = new DrafoCollaborationEngine();
