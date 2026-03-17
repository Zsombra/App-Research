import type {
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from '@terminal/types';

type MessageListener = (message: WorkerOutboundMessage) => void;
type ErrorListener = (error: ErrorEvent) => void;

/**
 * Typed bridge between the main thread and the DataWorker Web Worker.
 * Wraps postMessage/onmessage with type-safe send/receive.
 */
export class WorkerBridge {
  private worker: Worker | null = null;
  private messageListeners = new Set<MessageListener>();
  private errorListeners = new Set<ErrorListener>();
  private disposed = false;

  /**
   * Spawns the Web Worker. Safe to call multiple times (no-op if already running).
   */
  start(): void {
    if (this.worker || this.disposed) return;

    this.worker = new Worker(
      new URL('./data-worker-entry.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
      for (const listener of this.messageListeners) {
        listener(event.data);
      }
    };

    this.worker.onerror = (event: ErrorEvent) => {
      for (const listener of this.errorListeners) {
        listener(event);
      }
    };
  }

  /**
   * Sends a typed message to the worker.
   */
  send(message: WorkerInboundMessage): void {
    if (!this.worker) {
      throw new Error('WorkerBridge: worker not started');
    }
    this.worker.postMessage(message);
  }

  /**
   * Registers a listener for outbound worker messages.
   */
  onMessage(listener: MessageListener): void {
    this.messageListeners.add(listener);
  }

  /**
   * Removes a message listener.
   */
  offMessage(listener: MessageListener): void {
    this.messageListeners.delete(listener);
  }

  /**
   * Registers a listener for worker errors.
   */
  onError(listener: ErrorListener): void {
    this.errorListeners.add(listener);
  }

  /**
   * Removes an error listener.
   */
  offError(listener: ErrorListener): void {
    this.errorListeners.delete(listener);
  }

  /**
   * Terminates the worker and cleans up all listeners.
   */
  terminate(): void {
    this.disposed = true;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.messageListeners.clear();
    this.errorListeners.clear();
  }

  /**
   * Whether the worker is currently running.
   */
  get isRunning(): boolean {
    return this.worker !== null && !this.disposed;
  }
}

let singleton: WorkerBridge | null = null;

/**
 * Returns the singleton WorkerBridge instance.
 * Creates and starts it on first call.
 */
export function getWorkerBridge(): WorkerBridge {
  if (!singleton) {
    singleton = new WorkerBridge();
    singleton.start();
  }
  return singleton;
}

/**
 * Resets the singleton (for testing).
 */
export function resetWorkerBridge(): void {
  if (singleton) {
    singleton.terminate();
    singleton = null;
  }
}
