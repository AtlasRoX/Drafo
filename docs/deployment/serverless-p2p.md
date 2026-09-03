# Drafo 100% Serverless P2P Collaboration Guide

Drafo is completely **serverless**. It does not require any backend servers, databases, Docker containers, or paid cloud services to enable real-time collaboration.

---

## Architecture: Two Serverless Modes

### Mode 1: Zero-Config WebRTC (Option A)
Best for online teams and quick sharing across networks.

- **STUN (NAT Hole Punching)**: Uses Google's public STUN servers (`stun:stun.l.google.com:19302`). STUN only helps two browsers discover their public IP/port so they can talk directly. No diagram data ever touches STUN.
- **Signaling**: Uses public community WebSocket signaling (`wss://signaling.yjs.dev`). Signaling is only used during the initial 1-second handshake to exchange connection offers/answers.
- **Data Path**: 100% direct browser-to-browser WebRTC DataChannel encrypted with AES-256-GCM.
- **Local Tabs**: Automatically detects same-device tabs and syncs over `BroadcastChannel` with **0 network requests**.

---

### Mode 2: Air-Gapped / Manual P2P (Option C)
Best for confidential environments, internal networks, or offline collaboration.

- **Zero Network Servers**: Literally 0 servers involved.
- **Handshake via Link / QR / SDP**:
  1. Room creator clicks **Copy Invite Link**.
  2. The link contains the room identifier and encryption key in the URL hash:
     ```text
     https://drafo.app/#room=arch-room-77&key=...
     ```
  3. Opening the link in another browser connects the session.
  4. For isolated LANs, peers can exchange the manual connection string directly without touching the public internet.

---

## Security & Encryption Guarantee

1. **End-to-End Encryption (AES-GCM-256)**: All collaborative CRDT updates are encrypted before leaving your browser.
2. **Replay Attack Defense**: Bounded 256-bit sliding window drops replayed and duplicate frames.
3. **Local Storage Only**: Collaborative state is stored locally in your browser's embedded PostgreSQL WASM (PGlite) and IndexedDB.
4. **No Central Database**: Drafo has no user database, no tracking cookies, and no cloud document storage.
