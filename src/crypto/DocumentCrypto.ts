/**
 * Drafo Document Cryptography (Application-Layer E2EE)
 *
 * Implements AES-256-GCM authenticated encryption with unique 12-byte IVs
 * and Authenticated Additional Data (AAD) to prevent payload tampering,
 * header manipulation, and key-reuse attacks.
 */

export interface AuthenticatedMetadata {
  protocolVersion: number;
  roomId: string;
  sessionId: string;
  senderPeerId: string;
  sequenceNumber: number;
  keyEpoch: number;
}

export class CryptoAuthenticationError extends Error {
  public readonly code: string;
  constructor(message: string, code: string = 'ERR_CRYPTO_AUTH_FAILED') {
    super(message);
    this.name = 'CryptoAuthenticationError';
    this.code = code;
  }
}

const textEncoder = new TextEncoder();

export class DocumentCrypto {
  /**
   * Generate a fresh 256-bit symmetric AES-GCM document key
   */
  public static async generateDocumentKey(): Promise<CryptoKey> {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) throw new Error('WebCrypto subtle is not supported');
    return subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Import a raw 32-byte array into an AES-GCM CryptoKey
   */
  public static async importKey(rawBytes: Uint8Array): Promise<CryptoKey> {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) throw new Error('WebCrypto subtle is not supported');
    if (rawBytes.length !== 32) {
      throw new Error('AES-256 key must be exactly 32 bytes');
    }
    return subtle.importKey('raw', rawBytes as BufferSource, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  /**
   * Export key to raw 32-byte array
   */
  public static async exportKey(key: CryptoKey): Promise<Uint8Array> {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) throw new Error('WebCrypto subtle is not supported');
    const raw = await subtle.exportKey('raw', key);
    return new Uint8Array(raw);
  }

  /**
   * Build deterministic canonical AAD byte representation from message header
   */
  public static buildAAD(meta: AuthenticatedMetadata): Uint8Array {
    const canonicalStr = `${meta.protocolVersion}:${meta.roomId}:${meta.sessionId}:${meta.senderPeerId}:${meta.sequenceNumber}:${meta.keyEpoch}`;
    return textEncoder.encode(canonicalStr);
  }

  /**
   * Encrypt arbitrary plaintext with fresh 12-byte IV and AAD authentication
   */
  public static async encryptPayload(
    key: CryptoKey,
    plaintext: Uint8Array,
    meta: AuthenticatedMetadata
  ): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) throw new Error('WebCrypto subtle is not supported');

    // Fresh cryptographically random 12-byte IV for every encryption (zero IV reuse)
    const iv = new Uint8Array(12);
    globalThis.crypto.getRandomValues(iv);

    const aad = this.buildAAD(meta);

    try {
      const encrypted = await subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv as BufferSource,
          additionalData: aad as BufferSource,
          tagLength: 128
        },
        key,
        plaintext as BufferSource
      );

      return {
        ciphertext: new Uint8Array(encrypted),
        iv
      };
    } catch (err) {
      throw new CryptoAuthenticationError(`Encryption failed: ${err}`);
    }
  }

  /**
   * Decrypt ciphertext with AAD authentication check.
   * Throws CryptoAuthenticationError if ciphertext or AAD has been tampered with.
   */
  public static async decryptPayload(
    key: CryptoKey,
    ciphertext: Uint8Array,
    iv: Uint8Array,
    meta: AuthenticatedMetadata
  ): Promise<Uint8Array> {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) throw new Error('WebCrypto subtle is not supported');

    if (iv.length !== 12) {
      throw new CryptoAuthenticationError('Invalid IV length: expected 12 bytes', 'ERR_INVALID_IV');
    }

    const aad = this.buildAAD(meta);

    try {
      const decrypted = await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv as BufferSource,
          additionalData: aad as BufferSource,
          tagLength: 128
        },
        key,
        ciphertext as BufferSource
      );

      return new Uint8Array(decrypted);
    } catch {
      throw new CryptoAuthenticationError(
        'Decryption failed: authentication tag verification failed (ciphertext or AAD tampered)',
        'ERR_TAG_MISMATCH'
      );
    }
  }
}
