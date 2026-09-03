# Drafo Security Threat Model

## 1. System Overview & Trust Boundaries

Drafo is a local-first, peer-to-peer visual architecture studio. Diagram state resides in the local browser (IndexedDB and memory). Collaborative updates are synchronized across peers via WebRTC and BroadcastChannel.

```text
[ Browser Context A ] ─── Encrypted WebRTC ─── [ Browser Context B ]
         │                                              │
  (Public Signaling)                             (Public Relay)
```

---

## 2. Threat Actors & Threat Scenarios

### 2.1 Honest-But-Curious Signaling Server
- **Capabilities**: Observes room IDs, peer IDs, IP addresses, SDP connection offers/answers, and ICE candidates.
- **Protection**: Signaling servers are strictly excluded from document plaintext. All Yjs document synchronization payloads are encrypted with AES-256-GCM before transmission. Signaling never receives document keys.
- **Residual Risk**: Traffic analysis and metadata observation (peer connection times, packet sizes, approximate activity levels).

### 2.2 Malicious or Untrusted STUN/TURN Relay
- **Capabilities**: Forwards encrypted WebRTC DataChannel packets when direct P2P connectivity is blocked by symmetric NATs or corporate firewalls.
- **Protection**: Application-layer authenticated encryption (AES-256-GCM). Even if TLS on the TURN link is terminated or inspected, the inner payload remains encrypted with the room document key.
- **Residual Risk**: Relay denial-of-service (dropping packets or disconnecting peers). Mitigated by fallback to direct P2P or alternative relays.

### 2.3 Network Observer / Man-in-the-Middle (MitM)
- **Capabilities**: Eavesdrops on network packets, intercepts Wi-Fi traffic, attempts payload modification or packet replay.
- **Protection**:
  - DTLS encryption on WebRTC DataChannels.
  - Application-layer AES-256-GCM with 128-bit authentication tags.
  - Monotonic sequence numbers and bounded sliding replay windows in `SessionManager`.
  - Authenticated Additional Data (AAD) prevents metadata modification.
- **Residual Risk**: Physical disruption of connectivity.

### 2.4 Malicious Peer in Collaborative Room
- **Capabilities**: An admitted peer who holds the room key and attempts to corrupt state or flood network channels.
- **Protection**:
  - CRDT deterministic convergence: Arbitrary or out-of-order edits converge deterministically according to Yjs rules.
  - Operation policy and message bounds: Packets exceeding strict size limits (e.g. > 10MB) are rejected.
  - Key epoch rotation: The room administrator/owner can rotate the document key to epoch $N+1$ and re-encrypt for legitimate members.
- **Residual Risk**: A malicious peer who possesses valid write access can delete or modify diagram elements within legitimate CRDT rules. Mitigated by local PGlite snapshots and undo history.

### 2.5 Local Browser Profile Compromise & Storage Reality
- **Reality Check**: The browser's IndexedDB and WebCrypto storage APIs are protected by the browser's Same-Origin Policy (SOP). However, browser storage is **not** a Hardware Security Module (HSM) or secure enclave.
- **Protection**:
  - Private identity keys and document keys are marked `extractable: false` where supported by WebCrypto.
  - Sensitive keys are never serialized into URLs, exported `.drafo` diagram files, diagnostic logs, or console traces.
- **Boundaries & Residual Risk**: If an attacker gains full physical/administrative root access to the user's OS or browser profile folder, or executes arbitrary malicious extensions in the same origin, client-side cryptography cannot protect data from that attacker. Drafo documents this explicitly rather than claiming unrealistic "unhackable" security.
