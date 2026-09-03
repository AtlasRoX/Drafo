/**
 * Drafo Backpressure Manager
 *
 * Implements bounded, multi-tier priority send queues with intelligent coalescing
 * and congestion response.
 *
 * Invariant: Durable structural document mutations are NEVER dropped.
 */

import type { LogicalStream } from './CollaborationProtocol.ts';
import type { OperationClass } from './OperationPolicy.ts';

export interface QueuedMessage<T = unknown> {
  id: string;
  stream: LogicalStream;
  opClass: OperationClass;
  entityKey?: string; // e.g. "node-123" for coalescing transient movements
  payload: T;
  timestamp: number;
}

export interface BackpressureStats {
  queuedCount: number;
  droppedEphemeralCount: number;
  coalescedCount: number;
  deliveredCount: number;
  isCongested: boolean;
}

export class BackpressureManager<T = unknown> {
  private queue: QueuedMessage<T>[] = [];
  private readonly maxQueueCapacity: number;
  private readonly congestionThreshold: number;
  private droppedEphemeralCount = 0;
  private coalescedCount = 0;
  private deliveredCount = 0;

  constructor(maxQueueCapacity: number = 250, congestionThreshold: number = 100) {
    this.maxQueueCapacity = maxQueueCapacity;
    this.congestionThreshold = congestionThreshold;
  }

  /**
   * Enqueue an outgoing message with respect to operation policy and backpressure rules.
   */
  public enqueue(msg: QueuedMessage<T>): boolean {
    // 1. If message is coalescible and entityKey matches an existing queued item, replace in-place!
    if (msg.opClass === 'COALESCIBLE' && msg.entityKey) {
      const existingIdx = this.queue.findIndex(
        (m) => m.opClass === 'COALESCIBLE' && m.entityKey === msg.entityKey
      );
      if (existingIdx !== -1) {
        // Coalesce: update to latest state without extending queue length
        this.queue[existingIdx] = msg;
        this.coalescedCount++;
        return true;
      }
    }

    // 2. Congestion check: If queue is congested and new message is ephemeral, drop it!
    if (this.isCongested() && msg.opClass === 'EPHEMERAL') {
      this.droppedEphemeralCount++;
      return false; // Dropped safely
    }

    // 3. Queue capacity limit: If buffer reaches max capacity, purge older ephemeral messages first
    if (this.queue.length >= this.maxQueueCapacity) {
      const firstEphemeralIdx = this.queue.findIndex((m) => m.opClass === 'EPHEMERAL');
      if (firstEphemeralIdx !== -1) {
        this.queue.splice(firstEphemeralIdx, 1);
        this.droppedEphemeralCount++;
      } else if (msg.opClass === 'EPHEMERAL') {
        this.droppedEphemeralCount++;
        return false;
      }
      // Note: Durable messages are ALWAYS accepted
    }

    this.queue.push(msg);
    return true;
  }

  /**
   * Dequeue next prioritized message for transmission.
   * Priority: CONTROL > DOCUMENT > AWARENESS > ASSET
   */
  public dequeue(): QueuedMessage<T> | null {
    if (this.queue.length === 0) return null;

    // Prioritized search
    const priorityOrder: LogicalStream[] = ['CONTROL', 'DOCUMENT', 'AWARENESS', 'ASSET'];

    for (const stream of priorityOrder) {
      const idx = this.queue.findIndex((m) => m.stream === stream);
      if (idx !== -1) {
        const [item] = this.queue.splice(idx, 1);
        this.deliveredCount++;
        return item;
      }
    }

    const item = this.queue.shift() || null;
    if (item) this.deliveredCount++;
    return item;
  }

  public isCongested(): boolean {
    return this.queue.length >= this.congestionThreshold;
  }

  public getStats(): BackpressureStats {
    return {
      queuedCount: this.queue.length,
      droppedEphemeralCount: this.droppedEphemeralCount,
      coalescedCount: this.coalescedCount,
      deliveredCount: this.deliveredCount,
      isCongested: this.isCongested()
    };
  }

  public clear(): void {
    this.queue = [];
  }
}
