import { create } from 'zustand';
import type {
  NormalizedTrade,
  OrderbookSnapshot,
  Ticker,
  ExchangeId,
  ConnectionStatus,
  SubscriptionTopic,
  WorkerOutboundMessage,
} from '@terminal/types';
import { getWorkerBridge } from '../worker/worker-bridge.js';

const MAX_TRADES = 500;

export interface MarketState {
  /** Recent trades per symbol, newest first */
  trades: Map<string, NormalizedTrade[]>;
  /** Latest orderbook snapshot per symbol */
  orderbooks: Map<string, OrderbookSnapshot>;
  /** Latest ticker per symbol */
  tickers: Map<string, Ticker>;
  /** Connection status per exchange */
  connectionStatuses: Map<ExchangeId, ConnectionStatus>;
  /** Currently subscribed symbols */
  subscriptions: Set<string>;

  // Actions
  processTradeBatch: (symbol: string, newTrades: NormalizedTrade[]) => void;
  processOrderbook: (symbol: string, snapshot: OrderbookSnapshot) => void;
  processTicker: (symbol: string, ticker: Ticker) => void;
  processConnectionStatus: (exchange: ExchangeId, status: ConnectionStatus) => void;
  subscribe: (symbol: string, exchanges: ExchangeId[], topics: SubscriptionTopic[]) => void;
  unsubscribe: (symbol: string) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  trades: new Map(),
  orderbooks: new Map(),
  tickers: new Map(),
  connectionStatuses: new Map(),
  subscriptions: new Set(),

  processTradeBatch: (symbol, newTrades) => {
    set((state) => {
      const trades = new Map(state.trades);
      const existing = trades.get(symbol) ?? [];
      const merged = [...newTrades, ...existing].slice(0, MAX_TRADES);
      trades.set(symbol, merged);
      return { trades };
    });
  },

  processOrderbook: (symbol, snapshot) => {
    set((state) => {
      const orderbooks = new Map(state.orderbooks);
      orderbooks.set(symbol, snapshot);
      return { orderbooks };
    });
  },

  processTicker: (symbol, ticker) => {
    set((state) => {
      const tickers = new Map(state.tickers);
      tickers.set(symbol, ticker);
      return { tickers };
    });
  },

  processConnectionStatus: (exchange, status) => {
    set((state) => {
      const connectionStatuses = new Map(state.connectionStatuses);
      connectionStatuses.set(exchange, status);
      return { connectionStatuses };
    });
  },

  subscribe: (symbol, exchanges, topics) => {
    const bridge = getWorkerBridge();
    bridge.send({ type: 'subscribe', symbol, exchanges, topics });
    set((state) => {
      const subscriptions = new Set(state.subscriptions);
      subscriptions.add(symbol);
      return { subscriptions };
    });
  },

  unsubscribe: (symbol) => {
    const bridge = getWorkerBridge();
    bridge.send({ type: 'unsubscribe', symbol });
    set((state) => {
      const subscriptions = new Set(state.subscriptions);
      subscriptions.delete(symbol);
      const trades = new Map(state.trades);
      trades.delete(symbol);
      const orderbooks = new Map(state.orderbooks);
      orderbooks.delete(symbol);
      const tickers = new Map(state.tickers);
      tickers.delete(symbol);
      return { subscriptions, trades, orderbooks, tickers };
    });
  },
}));

/**
 * Routes a WorkerOutboundMessage to the appropriate store action.
 */
export function routeWorkerMessage(message: WorkerOutboundMessage): void {
  const store = useMarketStore.getState();

  switch (message.type) {
    case 'trade-batch':
      store.processTradeBatch(message.symbol, message.trades);
      break;
    case 'orderbook':
      store.processOrderbook(message.symbol, message.snapshot);
      break;
    case 'ticker':
      store.processTicker(message.symbol, message.ticker);
      break;
    case 'connection-status':
      store.processConnectionStatus(message.exchange, message.status);
      break;
    case 'error':
      console.error(`[DataWorker] ${message.code}: ${message.message}`);
      break;
    case 'candle-update':
      // Future phase
      break;
  }
}

// --- Selectors ---

export function useTrades(symbol: string): NormalizedTrade[] {
  return useMarketStore((state) => state.trades.get(symbol) ?? []);
}

export function useOrderbook(symbol: string): OrderbookSnapshot | undefined {
  return useMarketStore((state) => state.orderbooks.get(symbol));
}

export function useTicker(symbol: string): Ticker | undefined {
  return useMarketStore((state) => state.tickers.get(symbol));
}

export function useConnectionStatus(exchange: ExchangeId): ConnectionStatus {
  return useMarketStore(
    (state) => state.connectionStatuses.get(exchange) ?? 'disconnected'
  );
}
