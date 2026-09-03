# Drafo Architecture Constitution & Invariants

This document defines the 14 immutable architectural invariants of **Drafo**. Every design decision, pull request, and refactoring across the codebase must strictly uphold these rules.

---

## The 14 Invariants

### 1. Yjs is the Single Authoritative Source of Truth
In-memory Yjs CRDT (`Y.Doc`, with `nodes`, `edges`, `sections`, and `meta` maps) is the sole authoritative representation of the collaborative document. Neither PostgreSQL, React state, nor network packets may supersede the Yjs state vector.

### 2. PGlite is a Derived Local Projection
All **collaborative project state** stored in the embedded PGlite PostgreSQL 16 database is a derived projection of the canonical Yjs document.
- Invariant: If the local PGlite database is deleted, corrupted, or wiped, all collaborative state must be 100% reconstructible from the Yjs document.
- Local-only data (`LOCAL`, `DERIVED`, `CACHE` e.g., UI layout preferences, export cache, and local diagnostic logs) is explicitly partitioned and remains local.

### 3. Unidirectional Write Path
State mutations follow a strict unidirectional data flow:
```text
User Interaction → Yjs CRDT Mutation → (Debounced PGlite Projection & Peer Network Propagation)
```
React components and event handlers must **never** write directly to PGlite for collaborative fields (node coordinates, labels, dimensions, edge routes, sections, or project titles).

### 4. No Central Peer Authority
Every peer in a Drafo room is equal. There is no central server, authoritative coordinator, or privileged host.
- A peer may temporarily assist in connection coordination, but never possesses authority over document correctness or conflict resolution.
- If the initial room creator or coordinator disconnects or crashes, the remaining peers continue collaborating without disruption.

### 5. Signaling & Relay Never Own Document State
Signaling services and STUN/TURN relays exist exclusively for connection-establishment metadata (SDP offers/answers, ICE candidates) and raw packet relaying.
- Signaling and relays must never receive, store, or inspect document plaintext.
- If all signaling servers disappear after direct WebRTC connections are established, existing peer synchronization must continue unaffected.

### 6. Binary Assets Live Outside the CRDT Payload
Large binary assets (images, screenshots, file attachments) must **never** be embedded directly into Yjs CRDT update vectors.
- The CRDT stores only lightweight content-addressed references (`AssetRef { hash, size, mime }`).
- Binary bytes are stored locally in content-addressed storage (`AssetStore`) and transferred via a dedicated, hash-verified P2P asset protocol.

### 7. Awareness is Ephemeral
Remote cursor positions, hover highlights, and active tools are presence data.
- Selection is presence state unless explicitly promoted to durable document state.
- Presence data is completely disposable, throttled adaptively, and must never pollute CRDT undo/redo history or PGlite persistence.

### 8. Operation Semantics & Non-Discardable Mutations
Durable structural operations (creating/deleting nodes, editing labels, updating edges, changing properties, grouping) can **never** be dropped, even during severe network congestion.
- Coalescing is strictly an optimization of mutation generation/transport (e.g. coalescing intermediate mouse drag samples), never permission to discard state transitions required for CRDT convergence.

### 9. Offline Resilience
Drafo is strictly an offline-first tool. Network disconnection, high latency, or total absence of Internet connectivity must **never** freeze, degrade, or block local diagram editing or local persistence.

### 10. Persistent Identity is Separate from Room Authorization
A user installation has a persistent cryptographic identity keypair that remains stable across sessions.
- Having a valid Peer ID does not imply authorization to access a room.
- Room authorization is governed by cryptographically signed, versioned invitations and shared document keys.

### 11. Cryptographic Key Separation
Key derivation mechanisms are strictly separated by responsibility:
- **Password KDF (PBKDF2)**: Used exclusively for unlocking encrypted `.drafo.enc` archives or deriving key-encryption keys from user passphrases.
- **Session/Document Encryption Key**: Derived via cryptographic key exchange / shared secret agreement. Never derived per-message from PBKDF2.

### 12. Transport is Replaceable
The core collaboration protocol, peer manager, and synchronization engine are transport-agnostic.
- Transports (same-origin `BroadcastChannel`, direct `WebRTC DataChannel`, or manual signaling) sit beneath a unified `TransportManager` interface.
- No React component may depend on WebRTC implementation details.

### 13. Precise P2P_ONLY Definition
When configured in `P2P_ONLY` mode:
- No Drafo-controlled signaling service is contacted.
- No public STUN/TURN relay is used.
- Transport is restricted to direct peer-to-peer connectivity, with manual/local signaling permitted.

### 14. Zero Paid or Proprietary Dependencies
Drafo must run entirely on open-source, self-hostable components. The core application must never require a paid SaaS vendor (e.g. Liveblocks, Pusher, Supabase Cloud, Firebase, Ably) to function.
