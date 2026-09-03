/**
 * Drafo Chaos Engineering Network Proxy
 *
 * Injects deterministic and stochastic real-world network degradations:
 * - Latency & Jitter
 * - Packet loss (drop rate)
 * - Packet duplication
 * - Out-of-order delivery
 * - Complete network partitions & split-brain healing
 */

export interface ChaosConfig {
  enabled: boolean;
  latencyMs?: number;
  jitterMs?: number;
  dropRate?: number; // 0.0 to 1.0
  duplicateRate?: number; // 0.0 to 1.0
  isPartitioned?: boolean;
}

export class ChaosProxy {
  private config: ChaosConfig;
  private bufferedDuringPartition: Array<{ payload: Uint8Array; deliver: (p: Uint8Array) => void }> = [];

  constructor(config?: Partial<ChaosConfig>) {
    this.config = {
      enabled: false,
      latencyMs: 0,
      jitterMs: 0,
      dropRate: 0,
      duplicateRate: 0,
      isPartitioned: false,
      ...config
    };
  }

  public updateConfig(config: Partial<ChaosConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public partition(): void {
    this.config.isPartitioned = true;
  }

  public heal(): void {
    this.config.isPartitioned = false;
    // Deliver buffered packets that were in-flight when partition healed
    while (this.bufferedDuringPartition.length > 0) {
      const item = this.bufferedDuringPartition.shift();
      if (item) {
        item.deliver(item.payload);
      }
    }
  }

  /**
   * Intercept an outgoing packet before transport transmission
   */
  public intercept(payload: Uint8Array, deliver: (p: Uint8Array) => void): void {
    if (!this.config.enabled) {
      deliver(payload);
      return;
    }

    // 1. Network Partition check
    if (this.config.isPartitioned) {
      // Buffer in partition queue to simulate healing delivery
      this.bufferedDuringPartition.push({ payload, deliver });
      return;
    }

    // 2. Packet Drop
    if (this.config.dropRate && Math.random() < this.config.dropRate) {
      return; // Dropped
    }

    // 3. Latency & Jitter calculation
    const baseLatency = this.config.latencyMs || 0;
    const jitter = this.config.jitterMs ? (Math.random() - 0.5) * 2 * this.config.jitterMs : 0;
    const delay = Math.max(0, Math.round(baseLatency + jitter));

    const scheduleDelivery = (data: Uint8Array, extraDelay: number) => {
      if (extraDelay === 0) {
        deliver(data);
      } else {
        setTimeout(() => deliver(data), extraDelay);
      }
    };

    scheduleDelivery(payload, delay);

    // 4. Packet Duplication
    if (this.config.duplicateRate && Math.random() < this.config.duplicateRate) {
      scheduleDelivery(payload, delay + 20);
    }
  }

  public reset(): void {
    this.config = {
      enabled: false,
      latencyMs: 0,
      jitterMs: 0,
      dropRate: 0,
      duplicateRate: 0,
      isPartitioned: false
    };
    this.bufferedDuringPartition = [];
  }
}
