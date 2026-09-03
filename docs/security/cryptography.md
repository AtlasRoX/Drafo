# Drafo Cryptographic & Key Lifecycle Specification

## 1. Cryptographic Primitives

Drafo relies strictly on standard, browser-native WebCrypto (`window.crypto.subtle`) APIs:
- **Symmetric Encryption**: AES-256-GCM (`AES-GCM` with 256-bit keys and 128-bit authentication tags).
- **Initialization Vectors (IV)**: 96-bit (12 bytes) cryptographically secure random nonces generated via `crypto.getRandomValues(new Uint8Array(12))`.
- **Key Derivation (Password-Based)**: PBKDF2 with SHA-256, 100,000 iterations, and a 16-byte random salt.
- **Identity & Signatures**: ECDSA with P-256 curve and SHA-256 (or Ed25519 where browser runtime support permits).

---

## 2. Cryptographic Separation of Concerns

```text
User Password (Passphrase)
        ↓
PBKDF2-SHA256 (100k rounds, 16-byte salt)
        ↓
Key-Encryption / Vault Unlock Key (Exported archives only)
```
vs.
```text
Peer Identity Keypair (WebCrypto in IndexedDB)
        ↓
Key Exchange / Shared Secret Agreement
        ↓
Document Encryption Key (Per Key Epoch)
        ↓
AES-GCM-256 Encrypted Collaborative Yjs Update Payloads
```

> [!IMPORTANT]
> The per-message collaborative encryption key is **never** derived from PBKDF2 on every message. PBKDF2 is reserved exclusively for password-based vault archive unlocks.

---

## 3. Document Key Lifecycle & Key Epochs

A collaborative room maintains a monotonic **Key Epoch** (`epoch: 1, 2, 3...`):

### 3.1 Initial Room Key Creation (Epoch 1)
1. The room creator generates a cryptographically random 256-bit symmetric key (`crypto.getRandomValues(new Uint8Array(32))`).
2. The initial epoch is set to `1`.

### 3.2 Admitting a New Collaborator
1. A valid invitation containing the encrypted room key material (encrypted for the invitee's public key or protected by a pre-shared invitation secret) is transmitted.
2. The invitee decrypts the document key for the current epoch and confirms access.

### 3.3 Member Removal & Key Rotation (Epoch Bump)
1. When a collaborator is revoked or leaves:
   - A remaining authorized peer generates a new 256-bit document key.
   - The key epoch increments (`epoch = currentEpoch + 1`).
   - The new key is distributed encrypted to all remaining authorized members.
2. Any subsequent messages encrypted under old epochs are rejected by active participants according to transition grace period rules.

---

## 4. Session Context & Replay Defense

Every connection session between peers instantiates a dedicated `SessionContext` managed by `SessionManager`:

```ts
interface SessionContext {
  sessionId: string;                 // Unique UUID generated fresh per connection
  peerId: string;                    // Stable cryptographic Peer ID
  documentId: string;                // Room / Document identifier
  keyEpoch: number;                  // Current active key epoch
  sendSequence: number;              // Monotonically increasing sequence counter starting at 1
  highestReceivedSequence: number;   // Highest sequence number seen from this peer
  replayWindow: BoundedSlidingWindow;// 256-bit bitmask tracking received sequence IDs
}
```

### 4.1 Bounded Sliding Replay Window
- Window size: **256 messages**.
- If a received message has `sequence <= highestReceivedSequence - 256`, it is **dropped as too old**.
- If `sequence <= highestReceivedSequence`, the bitmask at offset `(highestReceivedSequence - sequence)` is checked. If already marked, it is **dropped as a replayed duplicate**.
- If `sequence > highestReceivedSequence`, the bitmask is shifted by `(sequence - highestReceivedSequence)`, `highestReceivedSequence` is updated, and the sequence bit is set.

### 4.2 Reconnection Invariant
When a peer disconnects and reconnects:
- A brand-new `sessionId` is generated.
- `sendSequence` resets to `1` under the new `sessionId`.
- Because messages authenticate the `sessionId` in the AAD (Additional Authenticated Data), old session messages cannot be replayed into the new session.
- Nonce invariant: A fresh 12-byte random IV is generated for every single AES-GCM encryption. Nonces are never reused.

---

## 5. Authenticated Additional Data (AAD)

Every encrypted network payload authenticates metadata without encrypting it, ensuring headers cannot be tampered with in transit:

```ts
interface AuthenticatedHeader {
  protocolVersion: number;
  messageType: number;
  roomId: string;
  sessionId: string;
  senderPeerId: string;
  keyEpoch: number;
  sequenceNumber: number;
  timestamp: number;
}
```

The canonical binary serialization of `AuthenticatedHeader` is passed as `additionalData` to `crypto.subtle.encrypt()` and `crypto.subtle.decrypt()`. Any alteration of sender ID, sequence number, epoch, or room ID results in an immediate authentication tag failure.

---

## 6. Versioned DrafoInvitation Schema

```ts
export interface DrafoInvitation {
  version: 1;
  roomId: string;
  issuerPeerId: string;
  expiresAt?: number;
  capabilities: ('read' | 'write' | 'admin')[];
  keyEpoch: number;
  encryptedKeyMaterial?: string; // Base64 ciphertext
  transportHints?: {
    signalingUrls?: string[];
    turnEnabled?: boolean;
    directOnly?: boolean;
  };
  signature: string; // Base64 signature of above fields by issuerPeerId
}
```
