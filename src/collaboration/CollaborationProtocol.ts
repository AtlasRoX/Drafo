/**
 * Drafo Collaboration Protocol Framing & Serialization
 *
 * Implements versioned binary message encoding and decoding across logical streams:
 * CONTROL, DOCUMENT, AWARENESS, ASSET.
 * Strict byte boundaries ensure immunity to buffer-overflow and memory-exhaustion attacks.
 */

export const PROTOCOL_MAGIC = 0x44524146; // "DRAF" in ASCII
export const PROTOCOL_VERSION = 1;

export const MAX_MESSAGE_SIZE = 15 * 1024 * 1024; // 15 MB maximum envelope size
export const MAX_ID_LENGTH = 128; // Maximum characters for peerId, roomId, sessionId

export type LogicalStream = 'CONTROL' | 'DOCUMENT' | 'AWARENESS' | 'ASSET';

export const StreamCode: Record<LogicalStream, number> = {
  CONTROL: 0x01,
  DOCUMENT: 0x02,
  AWARENESS: 0x03,
  ASSET: 0x04
};

export const CodeToStream: Record<number, LogicalStream> = {
  0x01: 'CONTROL',
  0x02: 'DOCUMENT',
  0x03: 'AWARENESS',
  0x04: 'ASSET'
};

export type MessageType =
  | 'hello'
  | 'auth'
  | 'state-vector'
  | 'sync-step-1'
  | 'sync-step-2'
  | 'update'
  | 'encrypted-update'
  | 'awareness'
  | 'asset-request'
  | 'asset-response'
  | 'ping'
  | 'pong'
  | 'goodbye';

export const TypeCode: Record<MessageType, number> = {
  hello: 0x01,
  auth: 0x02,
  'state-vector': 0x03,
  'sync-step-1': 0x04,
  'sync-step-2': 0x05,
  update: 0x06,
  'encrypted-update': 0x07,
  awareness: 0x08,
  'asset-request': 0x09,
  'asset-response': 0x0a,
  ping: 0x0b,
  pong: 0x0c,
  goodbye: 0x0d
};

export const CodeToType: Record<number, MessageType> = {
  0x01: 'hello',
  0x02: 'auth',
  0x03: 'state-vector',
  0x04: 'sync-step-1',
  0x05: 'sync-step-2',
  0x06: 'update',
  0x07: 'encrypted-update',
  0x08: 'awareness',
  0x09: 'asset-request',
  0x0a: 'asset-response',
  0x0b: 'ping',
  0x0c: 'pong',
  0x0d: 'goodbye'
};

export interface CollaborationEnvelope {
  version: number;
  stream: LogicalStream;
  type: MessageType;
  roomId: string;
  sessionId: string;
  senderPeerId: string;
  sequence: number;
  epoch: number;
  timestamp: number;
  iv?: Uint8Array;
  payload: Uint8Array;
}

export class ProtocolError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ProtocolError';
    this.code = code;
  }
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

/**
 * Encode a collaboration envelope into a compact binary frame
 */
export function encodeCollaborationMessage(msg: CollaborationEnvelope): Uint8Array {
  if (msg.roomId.length > MAX_ID_LENGTH) {
    throw new ProtocolError('roomId exceeds maximum length', 'ERR_INVALID_ID_LENGTH');
  }
  if (msg.sessionId.length > MAX_ID_LENGTH) {
    throw new ProtocolError('sessionId exceeds maximum length', 'ERR_INVALID_ID_LENGTH');
  }
  if (msg.senderPeerId.length > MAX_ID_LENGTH) {
    throw new ProtocolError('senderPeerId exceeds maximum length', 'ERR_INVALID_ID_LENGTH');
  }

  const roomBytes = textEncoder.encode(msg.roomId);
  const sessionBytes = textEncoder.encode(msg.sessionId);
  const peerBytes = textEncoder.encode(msg.senderPeerId);
  const ivBytes = msg.iv || new Uint8Array(0);

  // Header layout:
  // 4B Magic + 1B Version + 1B Stream + 1B Type + 4B Sequence + 2B Epoch + 8B Timestamp
  // + 1B RoomLen + RoomBytes + 1B SessLen + SessBytes + 1B PeerLen + PeerBytes
  // + 1B IvLen + IvBytes + 4B PayloadLen + PayloadBytes
  const headerFixedSize = 4 + 1 + 1 + 1 + 4 + 2 + 8 + 1 + 1 + 1 + 1 + 4;
  const totalLength =
    headerFixedSize +
    roomBytes.length +
    sessionBytes.length +
    peerBytes.length +
    ivBytes.length +
    msg.payload.length;

  if (totalLength > MAX_MESSAGE_SIZE) {
    throw new ProtocolError('Message exceeds maximum allowed size', 'ERR_MESSAGE_TOO_LARGE');
  }

  const buffer = new Uint8Array(totalLength);
  const view = new DataView(buffer.buffer);
  let offset = 0;

  // 1. Magic & Version
  view.setUint32(offset, PROTOCOL_MAGIC, false);
  offset += 4;
  buffer[offset++] = PROTOCOL_VERSION;

  // 2. Stream & Type codes
  buffer[offset++] = StreamCode[msg.stream] || 0x01;
  buffer[offset++] = TypeCode[msg.type] || 0x01;

  // 3. Sequence (uint32)
  view.setUint32(offset, msg.sequence, false);
  offset += 4;

  // 4. Epoch (uint16)
  view.setUint16(offset, msg.epoch, false);
  offset += 2;

  // 5. Timestamp (float64)
  view.setFloat64(offset, msg.timestamp, false);
  offset += 8;

  // 6. Strings & IV with explicit length prefixes
  buffer[offset++] = roomBytes.length;
  buffer.set(roomBytes, offset);
  offset += roomBytes.length;

  buffer[offset++] = sessionBytes.length;
  buffer.set(sessionBytes, offset);
  offset += sessionBytes.length;

  buffer[offset++] = peerBytes.length;
  buffer.set(peerBytes, offset);
  offset += peerBytes.length;

  buffer[offset++] = ivBytes.length;
  if (ivBytes.length > 0) {
    buffer.set(ivBytes, offset);
    offset += ivBytes.length;
  }

  // 7. Payload length & Payload
  view.setUint32(offset, msg.payload.length, false);
  offset += 4;
  buffer.set(msg.payload, offset);

  return buffer;
}

/**
 * Decode a binary frame into a validated CollaborationEnvelope.
 * Guaranteed to return cleanly or throw a typed ProtocolError.
 */
export function decodeCollaborationMessage(data: Uint8Array): CollaborationEnvelope {
  if (!(data instanceof Uint8Array)) {
    throw new ProtocolError('Input must be a Uint8Array', 'ERR_INVALID_INPUT');
  }
  if (data.length < 28) {
    throw new ProtocolError('Data too short to contain minimal header', 'ERR_FRAME_TRUNCATED');
  }
  if (data.length > MAX_MESSAGE_SIZE) {
    throw new ProtocolError('Frame exceeds maximum message limit', 'ERR_MESSAGE_TOO_LARGE');
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;

  // 1. Validate Magic bytes
  const magic = view.getUint32(offset, false);
  offset += 4;
  if (magic !== PROTOCOL_MAGIC) {
    throw new ProtocolError('Invalid protocol magic bytes', 'ERR_INVALID_MAGIC');
  }

  // 2. Validate Version
  const version = data[offset++];
  if (version !== PROTOCOL_VERSION) {
    throw new ProtocolError(`Unsupported protocol version: ${version}`, 'ERR_UNSUPPORTED_VERSION');
  }

  // 3. Stream & Type
  const streamCode = data[offset++];
  const stream = CodeToStream[streamCode];
  if (!stream) {
    throw new ProtocolError(`Unknown logical stream code: ${streamCode}`, 'ERR_UNKNOWN_STREAM');
  }

  const typeCode = data[offset++];
  const type = CodeToType[typeCode];
  if (!type) {
    throw new ProtocolError(`Unknown message type code: ${typeCode}`, 'ERR_UNKNOWN_TYPE');
  }

  // 4. Sequence, Epoch, Timestamp
  const sequence = view.getUint32(offset, false);
  offset += 4;

  const epoch = view.getUint16(offset, false);
  offset += 2;

  const timestamp = view.getFloat64(offset, false);
  offset += 8;

  // 5. Room ID
  if (offset >= data.length) throw new ProtocolError('Truncated room length', 'ERR_FRAME_TRUNCATED');
  const roomLen = data[offset++];
  if (offset + roomLen > data.length) throw new ProtocolError('Truncated room bytes', 'ERR_FRAME_TRUNCATED');
  let roomId = '';
  try {
    roomId = textDecoder.decode(data.subarray(offset, offset + roomLen));
  } catch {
    throw new ProtocolError('Malformed UTF-8 in roomId', 'ERR_MALFORMED_UTF8');
  }
  offset += roomLen;

  // 6. Session ID
  if (offset >= data.length) throw new ProtocolError('Truncated session length', 'ERR_FRAME_TRUNCATED');
  const sessionLen = data[offset++];
  if (offset + sessionLen > data.length) throw new ProtocolError('Truncated session bytes', 'ERR_FRAME_TRUNCATED');
  let sessionId = '';
  try {
    sessionId = textDecoder.decode(data.subarray(offset, offset + sessionLen));
  } catch {
    throw new ProtocolError('Malformed UTF-8 in sessionId', 'ERR_MALFORMED_UTF8');
  }
  offset += sessionLen;

  // 7. Peer ID
  if (offset >= data.length) throw new ProtocolError('Truncated peer length', 'ERR_FRAME_TRUNCATED');
  const peerLen = data[offset++];
  if (offset + peerLen > data.length) throw new ProtocolError('Truncated peer bytes', 'ERR_FRAME_TRUNCATED');
  let senderPeerId = '';
  try {
    senderPeerId = textDecoder.decode(data.subarray(offset, offset + peerLen));
  } catch {
    throw new ProtocolError('Malformed UTF-8 in senderPeerId', 'ERR_MALFORMED_UTF8');
  }
  offset += peerLen;

  // 8. IV
  if (offset >= data.length) throw new ProtocolError('Truncated IV length', 'ERR_FRAME_TRUNCATED');
  const ivLen = data[offset++];
  let iv: Uint8Array | undefined;
  if (ivLen > 0) {
    if (offset + ivLen > data.length) throw new ProtocolError('Truncated IV bytes', 'ERR_FRAME_TRUNCATED');
    iv = data.slice(offset, offset + ivLen);
    offset += ivLen;
  }

  // 9. Payload Length & Payload
  if (offset + 4 > data.length) throw new ProtocolError('Truncated payload length', 'ERR_FRAME_TRUNCATED');
  const payloadLen = view.getUint32(offset, false);
  offset += 4;

  if (offset + payloadLen > data.length) {
    throw new ProtocolError('Payload length exceeds available frame buffer', 'ERR_FRAME_TRUNCATED');
  }

  const payload = data.slice(offset, offset + payloadLen);

  return {
    version,
    stream,
    type,
    roomId,
    sessionId,
    senderPeerId,
    sequence,
    epoch,
    timestamp,
    iv,
    payload
  };
}
