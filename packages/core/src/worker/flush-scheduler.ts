import type { WorkerOutboundMessage } from '@terminal/types';

const DEFAULT_FLUSH_INTERVAL_MS = 100;
const DEFAULT_MAX_BUFFER_SIZE = 1000;

/**
 * Configuration for the FlushScheduler.
 */
export interface FlushSchedulerConfig {
  /** Interval in ms between automatic flushes. Default 100. */
  flushInterval?: number;
  /** Maximum buffer size before forcing a flush. Default 1000. */
  maxBufferSize?: number;
  /** Callback invoked with accumulated messages on each flush. */
  onFlush: (messages: WorkerOutboundMessage[]) => void;
}

/**
 * Batches WorkerOutboundMessages and flushes them at configurable intervals.
 * Reduces the number of postMessage calls from the worker to the main thread.
 *
 * Messages are accumulated in a buffer and flushed either:
 * - On a regular interval (default 100ms)
 * - When the buffer exceeds a size threshold
 */
export class FlushScheduler {
  private readonly flushInterval: number;
  private readonly maxBufferSize: number;
  private readonly onFlush: (messages: WorkerOutboundMessage[]) => void;

  private buffer: WorkerOutboundMessage[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: FlushSchedulerConfig) {
    this.flushInterval = config.flushInterval ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.maxBufferSize = config.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE;
    this.onFlush = config.onFlush;
  }

  /**
   * Adds a message to the buffer. If the buffer exceeds the
   * maximum size, an immediate flush is triggered.
   */
  enqueue(message: WorkerOutboundMessage): void {
    this.buffer.push(message);
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Starts the periodic flush timer.
   */
  start(): void {
    if (this.flushTimer !== null) {
      return;
    }
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Stops the periodic flush timer and performs a final flush
   * of any remaining buffered messages.
   */
  stop(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    // Flush remaining messages
    if (this.buffer.length > 0) {
      this.flush();
    }
  }

  /**
   * Immediately flushes all buffered messages via the onFlush callback.
   */
  private flush(): void {
    if (this.buffer.length === 0) {
      return;
    }
    const messages = this.buffer;
    this.buffer = [];
    this.onFlush(messages);
  }
}
