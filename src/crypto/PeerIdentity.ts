/**
 * Drafo Cryptographic Peer Identity
 *
 * Generates and manages a persistent cryptographic keypair for each installation.
 * Derives a stable, verifiable Peer ID (SHA-256 hash of public key).
 *
 * Invariant: Private key material is never exported, logged, or serialized into network messages.
 */

export interface PeerIdentityData {
  peerId: string;
  publicKeyHex: string;
}

export class PeerIdentity {
  private keyPair: CryptoKeyPair | null = null;
  private peerId: string | null = null;
  private publicKeyHex: string | null = null;

  /**
   * Initialize or generate a persistent cryptographic keypair
   */
  public async init(existingPrivateKey?: CryptoKey, existingPublicKey?: CryptoKey): Promise<PeerIdentityData> {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      throw new Error('WebCrypto subtle is not supported in this environment');
    }

    if (existingPrivateKey && existingPublicKey) {
      this.keyPair = { privateKey: existingPrivateKey, publicKey: existingPublicKey };
    } else {
      // Generate ECDSA P-256 keypair for digital signatures
      this.keyPair = await subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        true, // public key extractable, private key protected
        ['sign', 'verify']
      );
    }

    // Export raw public key to derive deterministic Peer ID
    const rawPublicKey = await subtle.exportKey('raw', this.keyPair.publicKey);
    const hashBuffer = await subtle.digest('SHA-256', rawPublicKey);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    this.peerId = `peer-${hashArray.slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
    this.publicKeyHex = Array.from(new Uint8Array(rawPublicKey))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      peerId: this.peerId,
      publicKeyHex: this.publicKeyHex
    };
  }

  public getPeerId(): string {
    if (!this.peerId) throw new Error('PeerIdentity has not been initialized');
    return this.peerId;
  }

  public getPublicKeyHex(): string {
    if (!this.publicKeyHex) throw new Error('PeerIdentity has not been initialized');
    return this.publicKeyHex;
  }

  /**
   * Sign a message payload using the installation's private key
   */
  public async sign(data: Uint8Array): Promise<Uint8Array> {
    if (!this.keyPair?.privateKey) throw new Error('Private key unavailable for signing');
    const subtle = globalThis.crypto.subtle;
    const sig = await subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' }
      },
      this.keyPair.privateKey,
      data as BufferSource
    );
    return new Uint8Array(sig);
  }

  /**
   * Verify a signature against a given public key in hex format
   */
  public static async verify(publicKeyHex: string, signature: Uint8Array, data: Uint8Array): Promise<boolean> {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) throw new Error('WebCrypto subtle is not supported');

    try {
      const rawBytes = new Uint8Array(
        (publicKeyHex.match(/.{1,2}/g) || []).map((byte) => parseInt(byte, 16))
      );
      const cryptoKey = await subtle.importKey(
        'raw',
        rawBytes,
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        true,
        ['verify']
      );

      return await subtle.verify(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' }
        },
        cryptoKey,
        signature as BufferSource,
        data as BufferSource
      );
    } catch {
      return false;
    }
  }
}
