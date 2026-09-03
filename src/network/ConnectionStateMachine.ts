/**
 * Drafo Connection State Machine
 *
 * Implements deterministic peer connection lifecycle states:
 * idle -> discovering -> signaling -> connecting -> connected -> degraded -> reconnecting -> failed -> offline
 *
 * Includes exponential backoff with random jitter and signaling survivability.
 */

export type ConnectionState =
  | 'idle'
  | 'discovering'
  | 'signaling'
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'reconnecting'
  | 'failed'
  | 'offline';

export interface StateTransitionEvent {
  from: ConnectionState;
  to: ConnectionState;
  reason?: string;
  attempt?: number;
  timestamp: number;
}

export class ConnectionStateMachine {
  private state: ConnectionState = 'idle';
  private reconnectAttempt = 0;
  private readonly maxReconnectAttempts: number;
  private listeners = new Set<(event: StateTransitionEvent) => void>();

  constructor(maxReconnectAttempts: number = 5) {
    this.maxReconnectAttempts = maxReconnectAttempts;
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public getReconnectAttempt(): number {
    return this.reconnectAttempt;
  }

  public transitionTo(next: ConnectionState, reason?: string): void {
    if (this.state === next && next !== 'reconnecting') return;

    const prev = this.state;
    this.state = next;

    if (next === 'connected') {
      this.reconnectAttempt = 0;
    } else if (next === 'reconnecting') {
      this.reconnectAttempt += 1;
    }

    const event: StateTransitionEvent = {
      from: prev,
      to: next,
      reason,
      attempt: this.reconnectAttempt,
      timestamp: Date.now()
    };

    this.listeners.forEach((cb) => cb(event));
  }

  /**
   * Calculate exponential backoff delay with random jitter (0-25%)
   */
  public getBackoffDelay(baseMs: number = 500, maxMs: number = 15000): number {
    const exponent = Math.min(this.reconnectAttempt, 8);
    const exponential = Math.min(maxMs, baseMs * Math.pow(2, exponent));
    const jitter = exponential * (0.1 + Math.random() * 0.15);
    return Math.round(exponential + jitter);
  }

  public canRetry(): boolean {
    return this.reconnectAttempt < this.maxReconnectAttempts;
  }

  public reset(): void {
    this.state = 'idle';
    this.reconnectAttempt = 0;
  }

  public subscribe(listener: (event: StateTransitionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
