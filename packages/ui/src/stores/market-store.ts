import { create } from 'zustand';
import { ConnectionStatus } from '@terminal/types';
import type {
  NormalizedTrade,
  OrderbookSnapshot,
  Ticker,
  OHLCVCandle,
  ExchangeId,
  CandleTimeframe,
  SubscriptionTopic,
  WorkerOutboundMessage,
  BarType,
  CustomBarConfig,
} from '@terminal/types';
import { getWorkerBridge } from '../worker/worker-bridge.js';
import { useHeatmapStore } from './heatmap-store.js';
import { useFootprintStore } from './footprint-store.js';
import { useLiquidationHeatmapStore } from './liquidation-heatmap-store.js';
import { useSLTPHeatmapStore } from './sl-tp-heatmap-store.js';
import { aggregateTrade } from './candle-aggregator.js';
import { buildTickBars, buildVolumeBars, buildRangeBars } from '@terminal/core';
import { useIndicatorStore } from './indicator-store.js';

/** Maximum recent trades kept per symbol to bound memory usage. */
const MAX_TRADES = 500;
const DEFAULT_TIMEFRAME: CandleTimeframe = '1m';

export interface MarketState {
  /** Recent trades per symbol, newest first */
  trades: Map<string, NormalizedTrade[]>;
  /** Latest orderbook snapshot per symbol */
  orderbooks: Map<string, OrderbookSnapshot>;
  /** Latest ticker per symbol */
  tickers: Map<string, Ticker>;
  /** OHLCV candles per symbol (oldest first) */
  candles: Map<string, OHLCVCandle[]>;
  /** Active timeframe per symbol */
  timeframes: Map<string, CandleTimeframe>;
  /** Active bar type per symbol ('time' uses standard candle aggregator) */
  barTypes: Map<string, BarType>;
  /** Custom bar config per symbol (for tick/volume/range bars) */
  customBarConfigs: Map<string, CustomBarConfig>;
  /** Connection status per exchange */
  connectionStatuses: Map<ExchangeId, ConnectionStatus>;
  /** Currently subscribed symbols */
  subscriptions: Set<string>;

  // Actions
  processTradeBatch: (symbol: string, newTrades: NormalizedTrade[]) => void;
  processOrderbook: (symbol: string, snapshot: OrderbookSnapshot) => void;
  processTicker: (symbol: string, ticker: Ticker) => void;
  processConnectionStatus: (exchange: ExchangeId, status: ConnectionStatus) => void;
  setTimeframe: (symbol: string, timeframe: CandleTimeframe) => void;
  setBarType: (symbol: string, barType: BarType, config?: CustomBarConfig) => void;
  subscribe: (symbol: string, exchanges: ExchangeId[], topics: SubscriptionTopic[]) => void;
  unsubscribe: (symbol: string) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  trades: new Map(),
  orderbooks: new Map(),
  tickers: new Map(),
  candles: new Map(),
  timeframes: new Map(),
  barTypes: new Map(),
  customBarConfigs: new Map(),
  connectionStatuses: new Map(),
  subscriptions: new Set(),

  processTradeBatch: (symbol, newTrades) => {
    set((state) => {
      const trades = new Map(state.trades);
      const existing = trades.get(symbol) ?? [];
      const merged = [...newTrades, ...existing].slice(0, MAX_TRADES);
      trades.set(symbol, merged);

      // Aggregate trades into candles
      const candles = new Map(state.candles);
      const barType = state.barTypes.get(symbol) ?? 'time';

      let candleArray: OHLCVCandle[];
      if (barType !== 'time') {
        // Custom bar types: rebuild from all trades
        const config = state.customBarConfigs.get(symbol);
        const chronological = [...merged].reverse();
        if (config?.type === 'tick') {
          candleArray = buildTickBars(chronological, config);
        } else if (config?.type === 'volume') {
          candleArray = buildVolumeBars(chronological, config);
        } else if (config?.type === 'range') {
          candleArray = buildRangeBars(chronological, config);
        } else {
          candleArray = [...(candles.get(symbol) ?? [])];
        }
      } else {
        const timeframe = state.timeframes.get(symbol) ?? DEFAULT_TIMEFRAME;
        candleArray = [...(candles.get(symbol) ?? [])];
        for (const trade of newTrades) {
          aggregateTrade(candleArray, trade, timeframe);
        }
      }
      candles.set(symbol, candleArray);

      // Trigger indicator recomputation
      const indicatorStore = useIndicatorStore.getState();
      if (indicatorStore.indicators.size > 0) {
        indicatorStore.recompute(symbol, candleArray);
      }

      // Trigger footprint recomputation
      const footprintStore = useFootprintStore.getState();
      if (footprintStore.enabled) {
        footprintStore.recompute(symbol, candleArray);
      }

      return { trades, candles };
    });
  },

  processOrderbook: (symbol, snapshot) => {
    set((state) => {
      const orderbooks = new Map(state.orderbooks);
      orderbooks.set(symbol, snapshot);
      return { orderbooks };
    });

    // Capture for heatmap
    const heatmapStore = useHeatmapStore.getState();
    if (heatmapStore.enabled) {
      heatmapStore.captureSnapshot(symbol, snapshot);
    }
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

  setTimeframe: (symbol, timeframe) => {
    set((state) => {
      const timeframes = new Map(state.timeframes);
      timeframes.set(symbol, timeframe);

      // Re-aggregate existing trades into candles with the new timeframe
      const candles = new Map(state.candles);
      const existingTrades = state.trades.get(symbol) ?? [];
      const candleArray: OHLCVCandle[] = [];

      // Trades are newest-first; reverse to process oldest-first
      const chronological = [...existingTrades].reverse();
      for (const trade of chronological) {
        aggregateTrade(candleArray, trade, timeframe);
      }
      candles.set(symbol, candleArray);

      // Trigger indicator recomputation
      const indicatorStore = useIndicatorStore.getState();
      if (indicatorStore.indicators.size > 0) {
        indicatorStore.recompute(symbol, candleArray);
      }

      return { timeframes, candles };
    });

    // Notify worker of timeframe change
    const bridge = getWorkerBridge();
    bridge.send({ type: 'set-timeframe', symbol, timeframe });
  },

  setBarType: (symbol, barType, config) => {
    set((state) => {
      const barTypes = new Map(state.barTypes);
      barTypes.set(symbol, barType);

      const customBarConfigs = new Map(state.customBarConfigs);
      if (config) {
        customBarConfigs.set(symbol, config);
      } else {
        customBarConfigs.delete(symbol);
      }

      // Rebuild candles from existing trades
      const candles = new Map(state.candles);
      const existingTrades = state.trades.get(symbol) ?? [];
      const chronological = [...existingTrades].reverse();

      let candleArray: OHLCVCandle[];
      if (barType === 'time') {
        candleArray = [];
        const timeframe = state.timeframes.get(symbol) ?? DEFAULT_TIMEFRAME;
        for (const trade of chronological) {
          aggregateTrade(candleArray, trade, timeframe);
        }
      } else if (config?.type === 'tick') {
        candleArray = buildTickBars(chronological, config);
      } else if (config?.type === 'volume') {
        candleArray = buildVolumeBars(chronological, config);
      } else if (config?.type === 'range') {
        candleArray = buildRangeBars(chronological, config);
      } else {
        candleArray = [];
      }
      candles.set(symbol, candleArray);

      // Trigger indicator recomputation
      const indicatorStore = useIndicatorStore.getState();
      if (indicatorStore.indicators.size > 0) {
        indicatorStore.recompute(symbol, candleArray);
      }

      return { barTypes, customBarConfigs, candles };
    });
  },

  subscribe: (symbol, exchanges, topics) => {
    const bridge = getWorkerBridge();
    bridge.send({ type: 'subscribe', symbol, exchanges, topics });
    set((state) => {
      const subscriptions = new Set(state.subscriptions);
      subscriptions.add(symbol);
      const timeframes = new Map(state.timeframes);
      if (!timeframes.has(symbol)) {
        timeframes.set(symbol, DEFAULT_TIMEFRAME);
      }
      return { subscriptions, timeframes };
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
      const candles = new Map(state.candles);
      candles.delete(symbol);
      const timeframes = new Map(state.timeframes);
      timeframes.delete(symbol);
      const barTypes = new Map(state.barTypes);
      barTypes.delete(symbol);
      const customBarConfigs = new Map(state.customBarConfigs);
      customBarConfigs.delete(symbol);
      return { subscriptions, trades, orderbooks, tickers, candles, timeframes, barTypes, customBarConfigs };
    });

    // Clean up derived data stores to prevent unbounded Map growth
    useHeatmapStore.getState().clearSymbol(symbol);
    useFootprintStore.getState().clearSymbol(symbol);
    useLiquidationHeatmapStore.getState().clearSymbol(symbol);
    useSLTPHeatmapStore.getState().clearSymbol(symbol);
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
      // Handled server-side in future; client aggregates from trades for now
      break;
    case 'indicator-update':
      // Future: worker-computed indicators
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

export function useCandles(symbol: string): OHLCVCandle[] {
  return useMarketStore((state) => state.candles.get(symbol) ?? []);
}

export function useTimeframe(symbol: string): CandleTimeframe {
  return useMarketStore((state) => state.timeframes.get(symbol) ?? DEFAULT_TIMEFRAME);
}

export function useBarType(symbol: string): BarType {
  return useMarketStore((state) => state.barTypes.get(symbol) ?? 'time');
}

export function useConnectionStatus(exchange: ExchangeId): ConnectionStatus {
  return useMarketStore(
    (state) => state.connectionStatuses.get(exchange) ?? ConnectionStatus.Disconnected
  );
}
