import type {
  ExchangeId,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from '@terminal/types';
import type { BaseExchangeAdapter } from '../adapters/base-adapter.js';
import { FlushScheduler } from './flush-scheduler.js';
import { BinanceAdapter } from '../adapters/binance/binance-adapter.js';
import { BybitAdapter } from '../adapters/bybit/bybit-adapter.js';
import { CoinbaseAdapter } from '../adapters/coinbase/coinbase-adapter.js';
import { SimulatedAdapter } from '../adapters/simulated/simulated-adapter.js';

/**
 * Creates an adapter instance for the given exchange ID.
 * Returns null for exchanges not yet implemented.
 */
function createAdapter(exchangeId: ExchangeId): BaseExchangeAdapter | null {
  switch (exchangeId) {
    case 'binance':
      return new BinanceAdapter();
    case 'bybit':
      return new BybitAdapter();
    case 'coinbase':
      return new CoinbaseAdapter();
    case 'simulated':
      return new SimulatedAdapter();
    default:
      return null;
  }
}

/**
 * DataWorker manages exchange adapters and routes messages between
 * the main thread and exchange WebSocket connections.
 *
 * This class can run inside a Web Worker (using self.onmessage/postMessage)
 * or be used standalone for testing.
 */
export class DataWorker {
  private adapters: Map<ExchangeId, BaseExchangeAdapter> = new Map();
  private flushScheduler: FlushScheduler;
  private postMessage: (message: WorkerOutboundMessage) => void;

  constructor(
    postMessageFn: (message: WorkerOutboundMessage) => void,
    flushInterval?: number
  ) {
    this.postMessage = postMessageFn;
    this.flushScheduler = new FlushScheduler({
      flushInterval: flushInterval ?? 100,
      maxBufferSize: 1000,
      onFlush: (messages: WorkerOutboundMessage[]) => {
        for (const msg of messages) {
          this.postMessage(msg);
        }
      },
    });
    this.flushScheduler.start();
  }

  /**
   * Handles an inbound message from the main thread.
   * Routes to the appropriate adapter or scheduler.
   */
  handleMessage(message: WorkerInboundMessage): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(message);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(message);
        break;
      case 'set-timeframe':
        // Future phase — candle aggregation
        break;
      case 'request-snapshot':
        // Future phase — force immediate flush
        break;
      case 'add-indicator':
      case 'remove-indicator':
        // Future phase — indicator engine
        break;
    }
  }

  /**
   * Shuts down all adapters and stops the flush scheduler.
   */
  async shutdown(): Promise<void> {
    this.flushScheduler.stop();
    const disconnects: Promise<void>[] = [];
    for (const adapter of this.adapters.values()) {
      disconnects.push(adapter.disconnect());
    }
    await Promise.all(disconnects);
    this.adapters.clear();
  }

  /**
   * Handles a subscribe message by ensuring adapters exist for the
   * requested exchanges and subscribing to the requested topics.
   */
  private handleSubscribe(message: {
    type: 'subscribe';
    symbol: string;
    exchanges: ExchangeId[];
    topics: Array<'trades' | 'orderbook' | 'ticker' | 'liquidations'>;
  }): void {
    for (const exchangeId of message.exchanges) {
      const adapter = this.getOrCreateAdapter(exchangeId);
      if (!adapter) continue;

      for (const topic of message.topics) {
        switch (topic) {
          case 'trades':
            adapter.subscribeTrades(message.symbol);
            break;
          case 'orderbook':
            adapter.subscribeOrderbook(message.symbol);
            break;
          case 'ticker':
            adapter.subscribeTicker(message.symbol);
            break;
          case 'liquidations':
            adapter.subscribeLiquidations(message.symbol);
            break;
        }
      }
    }
  }

  /**
   * Handles an unsubscribe message by unsubscribing from all
   * topics on all adapters for the given symbol.
   */
  private handleUnsubscribe(message: { type: 'unsubscribe'; symbol: string }): void {
    for (const adapter of this.adapters.values()) {
      adapter.unsubscribeTrades(message.symbol);
      adapter.unsubscribeOrderbook(message.symbol);
      adapter.unsubscribeTicker(message.symbol);
      adapter.unsubscribeLiquidations(message.symbol);
    }
  }

  /**
   * Gets an existing adapter or creates and wires a new one.
   */
  private getOrCreateAdapter(exchangeId: ExchangeId): BaseExchangeAdapter | null {
    const existing = this.adapters.get(exchangeId);
    if (existing) return existing;

    const adapter = createAdapter(exchangeId);
    if (!adapter) return null;

    // Wire adapter callbacks to flush scheduler
    adapter.onTrade = (trade) => {
      this.flushScheduler.enqueue({
        type: 'trade-batch',
        symbol: trade.symbol,
        trades: [trade],
      });
    };

    adapter.onOrderbookSnapshot = (snapshot) => {
      this.flushScheduler.enqueue({
        type: 'orderbook',
        symbol: snapshot.symbol,
        snapshot,
      });
    };

    adapter.onTicker = (ticker) => {
      this.flushScheduler.enqueue({
        type: 'ticker',
        symbol: ticker.symbol,
        ticker,
      });
    };

    adapter.onConnectionStatusChange = (status) => {
      // Connection status changes are sent immediately, not batched
      this.postMessage({
        type: 'connection-status',
        exchange: exchangeId,
        status,
      });
    };

    this.adapters.set(exchangeId, adapter);

    // Connect the adapter with a timeout to avoid hanging indefinitely
    const CONNECT_TIMEOUT_MS = 15_000;
    const connectWithTimeout = Promise.race([
      adapter.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out')), CONNECT_TIMEOUT_MS)
      ),
    ]);

    connectWithTimeout.catch((err: unknown) => {
      this.adapters.delete(exchangeId);
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.postMessage({
        type: 'error',
        code: 'CONNECT_FAILED',
        message: `Failed to connect to ${exchangeId}: ${errorMessage}`,
      });
    });

    return adapter;
  }
}

/** Shape of a message event in the worker context. */
interface WorkerMessageEvent {
  data: WorkerInboundMessage;
}

/**
 * Initializes the DataWorker in a Web Worker context.
 * Call this from the worker entry point file.
 */
export function initializeWorker(): DataWorker {
  const g = globalThis as unknown as {
    postMessage: (msg: WorkerOutboundMessage) => void;
    onmessage: ((event: WorkerMessageEvent) => void) | null;
  };

  const worker = new DataWorker((message: WorkerOutboundMessage) => {
    g.postMessage(message);
  });

  g.onmessage = (event: WorkerMessageEvent) => {
    worker.handleMessage(event.data);
  };

  return worker;
}
