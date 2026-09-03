'use client';

import { FlowProject } from '../types/flow';

interface EncryptedEnvelope {
  version: 1;
  algorithm: 'AES-256-GCM-PBKDF2';
  salt: string; // Base64
  iv: string;   // Base64
  ciphertext: string; // Base64
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives an AES-GCM-256 key from a passphrase using PBKDF2 with 100,000 iterations.
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a FlowProject into an authenticated AES-256-GCM encrypted envelope.
 */
export async function encryptDiagram(
  project: FlowProject,
  passphrase: string
): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('WebCrypto is not supported in this environment');
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(project));

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer
    },
    key,
    plaintext
  );

  const envelope: EncryptedEnvelope = {
    version: 1,
    algorithm: 'AES-256-GCM-PBKDF2',
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(cipherBuffer)
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Decrypt an AES-256-GCM encrypted envelope back into a FlowProject.
 */
export async function decryptDiagram(
  envelopeString: string,
  passphrase: string
): Promise<FlowProject> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('WebCrypto is not supported in this environment');
  }

  let envelope: EncryptedEnvelope;
  try {
    envelope = JSON.parse(envelopeString);
    if (envelope.version !== 1 || envelope.algorithm !== 'AES-256-GCM-PBKDF2') {
      throw new Error('Unsupported encrypted diagram format');
    }
  } catch (err: any) {
    throw new Error('Invalid encrypted envelope: ' + err.message);
  }

  const salt = base64ToBuffer(envelope.salt);
  const iv = base64ToBuffer(envelope.iv);
  const ciphertext = base64ToBuffer(envelope.ciphertext);

  const key = await deriveKey(passphrase, salt);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer
      },
      key,
      ciphertext.buffer as ArrayBuffer
    );

    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decryptedBuffer);
    const parsed = JSON.parse(jsonStr) as FlowProject;

    if (!parsed.id || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      throw new Error('Decrypted payload does not contain a valid Drafo diagram structure');
    }

    return parsed;
  } catch (err) {
    throw new Error('Incorrect passphrase or corrupted diagram data');
  }
}
