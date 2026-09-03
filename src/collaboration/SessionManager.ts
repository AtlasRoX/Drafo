/**
 * Drafo Session Manager & Replay Protection
 *
 * Sits between peer authentication and encryption:
 * PeerIdentity -> SessionManager -> SessionContext -> DocumentCrypto
 *
 * Features:
 * - Session lifecycle management (creation, resumption, sequence resets).
 * - Bounded 256-bit sliding window for anti-replay defense.
 * - Key epoch tracking.
 */

export class BoundedSlidingWindow {
  private readonly windowSize = 256;
  // 256 bits stored in 8 x 32-bit unsigned integers
  private bitmap = new Uint32Array(8);
  private highest = 0;

  /**
   * Evaluate sequence number against the sliding window.
   * Returns 'ACCEPTED' if sequence is fresh and marks it,
   * 'REPLAYED' if duplicate, or 'TOO_OLD' if outside window boundary.
   */
  public checkAndRecord(sequence: number): 'ACCEPTED' | 'REPLAYED' | 'TOO_OLD' {
    if (sequence === 0) return 'TOO_OLD';

    // 1. First message seen
    if (this.highest === 0) {
      this.highest = sequence;
      this.bitmap[0] = 1;
      return 'ACCEPTED';
    }

    // 2. New highest sequence seen
    if (sequence > this.highest) {
      const diff = sequence - this.highest;
      if (diff >= this.windowSize) {
        // Advanced beyond full window: clear entire bitmap
        this.bitmap.fill(0);
      } else {
        // Shift bitmap to right by diff bits
        this.shiftBitmap(diff);
      }
      this.highest = sequence;
      this.setBit(0); // Bit 0 represents 'highest'
      return 'ACCEPTED';
    }

    // 3. Older sequence
    const diff = this.highest - sequence;
    if (diff >= this.windowSize) {
      return 'TOO_OLD';
    }

    // Check if bit is already set (duplicate/replayed)
    if (this.isBitSet(diff)) {
      return 'REPLAYED';
    }

    // Fresh in-window packet
    this.setBit(diff);
    return 'ACCEPTED';
  }

  public getHighestSequence(): number {
    return this.highest;
  }

  private setBit(offset: number): void {
    const wordIndex = Math.floor(offset / 32);
    const bitIndex = offset % 32;
    this.bitmap[wordIndex] |= 1 << bitIndex;
  }

  private isBitSet(offset: number): boolean {
    const wordIndex = Math.floor(offset / 32);
    const bitIndex = offset % 32;
    return (this.bitmap[wordIndex] & (1 << bitIndex)) !== 0;
  }

  private shiftBitmap(shift: number): void {
    const wordShift = Math.floor(shift / 32);
    const bitShift = shift % 32;

    for (let i = 7; i >= 0; i--) {
      const fromWord = i - wordShift;
      if (fromWord >= 0) {
        let val = this.bitmap[fromWord] << bitShift;
        if (bitShift > 0 && fromWord - 1 >= 0) {
          val |= this.bitmap[fromWord - 1] >>> (32 - bitShift);
        }
        this.bitmap[i] = val;
      } else {
        this.bitmap[i] = 0;
      }
    }
  }
}

export interface SessionContext {
  sessionId: string;
  peerId: string;
  documentId: string;
  keyEpoch: number;
  sendSequence: number;
  replayWindow: BoundedSlidingWindow;
  createdAt: number;
}

export class SessionManager {
  private sessions = new Map<string, SessionContext>();

  public createSession(peerId: string, documentId: string, initialEpoch: number = 1): SessionContext {
    const sessionId = `sess-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12)}`;
    const context: SessionContext = {
      sessionId,
      peerId,
      documentId,
      keyEpoch: initialEpoch,
      sendSequence: 0,
      replayWindow: new BoundedSlidingWindow(),
      createdAt: Date.now()
    };
    this.sessions.set(sessionId, context);
    return context;
  }

  public getSession(sessionId: string): SessionContext | undefined {
    return this.sessions.get(sessionId);
  }

  public nextSendSequence(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.sendSequence += 1;
    return session.sendSequence;
  }

  /**
   * Validate incoming sequence number and key epoch against anti-replay rules.
   */
  public validateIncomingMessage(
    sessionId: string,
    sequence: number,
    epoch: number
  ): 'VALID' | 'REJECTED_REPLAY' | 'REJECTED_TOO_OLD' | 'REJECTED_INVALID_EPOCH' {
    const session = this.sessions.get(sessionId);
    if (!session) return 'REJECTED_TOO_OLD';

    // 1. Verify key epoch
    if (epoch !== session.keyEpoch) {
      return 'REJECTED_INVALID_EPOCH';
    }

    // 2. Verify sequence against sliding window
    const result = session.replayWindow.checkAndRecord(sequence);
    if (result === 'REPLAYED') return 'REJECTED_REPLAY';
    if (result === 'TOO_OLD') return 'REJECTED_TOO_OLD';

    return 'VALID';
  }

  public bumpKeyEpoch(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.keyEpoch += 1;
    // Reset replay window on epoch change
    session.replayWindow = new BoundedSlidingWindow();
    return session.keyEpoch;
  }

  public terminateSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
