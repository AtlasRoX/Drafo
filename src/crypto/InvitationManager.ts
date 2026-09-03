/**
 * Drafo Invitation Manager
 *
 * Implements generation, serialization, and cryptographic verification of versioned
 * Drafo room invitations.
 */

import { PeerIdentity } from './PeerIdentity.ts';

export interface DrafoInvitation {
  version: 1;
  roomId: string;
  issuerPeerId: string;
  expiresAt?: number;
  capabilities: ('read' | 'write' | 'admin')[];
  keyEpoch: number;
  encryptedKeyMaterial?: string; // Base64 encoded key material
  transportHints?: {
    signalingUrls?: string[];
    turnEnabled?: boolean;
    directOnly?: boolean;
  };
  signature: string; // Base64 ECDSA signature
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export class InvitationManager {
  /**
   * Produce the canonical string payload used for digital signature generation & verification
   */
  public static canonicalize(inv: Omit<DrafoInvitation, 'signature'>): Uint8Array {
    const caps = [...inv.capabilities].sort().join(',');
    const hints = inv.transportHints ? JSON.stringify(inv.transportHints) : '';
    const str = `${inv.version}:${inv.roomId}:${inv.issuerPeerId}:${inv.expiresAt || 0}:${caps}:${inv.keyEpoch}:${inv.encryptedKeyMaterial || ''}:${hints}`;
    return textEncoder.encode(str);
  }

  /**
   * Create and sign a versioned DrafoInvitation
   */
  public static async createInvitation(
    issuerIdentity: PeerIdentity,
    roomId: string,
    keyEpoch: number,
    encryptedKeyMaterialBase64?: string,
    capabilities: ('read' | 'write' | 'admin')[] = ['read', 'write'],
    expiresInMs?: number
  ): Promise<DrafoInvitation> {
    const unsigned: Omit<DrafoInvitation, 'signature'> = {
      version: 1,
      roomId,
      issuerPeerId: issuerIdentity.getPeerId(),
      expiresAt: expiresInMs ? Date.now() + expiresInMs : undefined,
      capabilities,
      keyEpoch,
      encryptedKeyMaterial: encryptedKeyMaterialBase64,
      transportHints: {
        turnEnabled: true,
        directOnly: false
      }
    };

    const canonicalBytes = this.canonicalize(unsigned);
    const sigBytes = await issuerIdentity.sign(canonicalBytes);
    const signatureBase64 = btoa(String.fromCharCode(...sigBytes));

    return {
      ...unsigned,
      signature: signatureBase64
    };
  }

  /**
   * Cryptographically verify an invitation against the issuer's public key
   */
  public static async verifyInvitation(
    invitation: DrafoInvitation,
    issuerPublicKeyHex: string
  ): Promise<boolean> {
    if (invitation.version !== 1) return false;

    // Check expiration
    if (invitation.expiresAt && Date.now() > invitation.expiresAt) {
      return false;
    }

    try {
      const { signature, ...unsigned } = invitation;
      const canonicalBytes = this.canonicalize(unsigned);
      const sigBinStr = atob(signature);
      const sigBytes = new Uint8Array(sigBinStr.length);
      for (let i = 0; i < sigBinStr.length; i++) {
        sigBytes[i] = sigBinStr.charCodeAt(i);
      }

      return await PeerIdentity.verify(issuerPublicKeyHex, sigBytes, canonicalBytes);
    } catch {
      return false;
    }
  }

  /**
   * Serialize invitation to URL/QR-safe base64 string
   */
  public static serialize(invitation: DrafoInvitation): string {
    const json = JSON.stringify(invitation);
    const bytes = textEncoder.encode(json);
    return btoa(String.fromCharCode(...bytes));
  }

  /**
   * Deserialize base64 string back into DrafoInvitation
   */
  public static deserialize(encoded: string): DrafoInvitation {
    const binStr = atob(encoded);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    const json = textDecoder.decode(bytes);
    const parsed = JSON.parse(json);
    if (parsed.version !== 1 || !parsed.roomId || !parsed.issuerPeerId) {
      throw new Error('Invalid DrafoInvitation structure');
    }
    return parsed as DrafoInvitation;
  }
}
