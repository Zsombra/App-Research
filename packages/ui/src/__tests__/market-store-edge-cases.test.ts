import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.stubGlobal('Worker', vi.fn(() => ({
  postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null,
})));

vi.mock('../worker/worker-bridge.js', () => ({
  getWorkerBridge: () => ({ send: vi.fn(), onMessage: vi.fn(), offMessage: vi.fn() }),
  resetWorkerBridge: vi.fn(),
}));

import { useMarketStore, routeWorkerMessage } from '../stores/market-store.js';
import type { NormalizedTrade, Ticker, WorkerOutboundMessage } from '@terminal/types';

function makeTrade(overrides: Partial<NormalizedTrade> = {}): NormalizedTrade {
  return {
    id: `trade-${Math.random()}`,
    exchange: 'binance', symbol: 'BTC/USDT', price: 65000, amount: 0.1,
    side: 'buy', timestamp: Date.now(), isMaker: false, cost: 6500, liquidation: false,
    ...overrides,
  };
}

function makeTicker(symbol = 'BTC/USDT'): Ticker {
  return {
    exchange: 'binance', symbol, timestamp: Date.now(),
    lastPrice: 65000, changePercent24h: 1.5, high24h: 66000, low24h: 64000,
    volume24h: 10000, quoteVolume24h: 650000000,
    bbo: { bidPrice: 64999, bidSize: 1, askPrice: 65001, askSize: 1 },
  };
}

function resetStore() {
  useMarketStore.setState({
    trades: new Map(), orderbooks: new Map(), tickers: new Map(),
    candles: new Map(), timeframes: new Map(), barTypes: new Map(),
    customBarConfigs: new Map(), connectionStatuses: new Map(), subscriptions: new Set(),
  });
}

beforeEach(resetStore);

describe('market-store edge cases', () => {
  // -------------------------------------------------------------------------
  // Trade batch edge cases
  // -------------------------------------------------------------------------
  describe('processTradeBatch edge cases', () => {
    it('empty batch does not crash', () => {
      expect(() => {
        useMarketStore.getState().processTradeBatch('BTC/USDT', []);
      }).not.toThrow();

      // Should create an empty entry or no entry
      const trades = useMarketStore.getState().trades.get('BTC/USDT');
      expect(!trades || trades.length === 0).toBe(true);
    });

    it('multiple symbols stored independently', () => {
      useMarketStore.getState().processTradeBatch('BTC/USDT', [makeTrade({ symbol: 'BTC/USDT' })]);
      useMarketStore.getState().processTradeBatch('ETH/USDT', [makeTrade({ symbol: 'ETH/USDT' })]);

      expect(useMarketStore.getState().trades.get('BTC/USDT')).toHaveLength(1);
      expect(useMarketStore.getState().trades.get('ETH/USDT')).toHaveLength(1);
    });

    it('caps trades at 500 even across multiple batches', () => {
      // Add 300 trades
      const batch1 = Array.from({ length: 300 }, () => makeTrade());
      useMarketStore.getState().processTradeBatch('BTC/USDT', batch1);

      // Add 300 more
      const batch2 = Array.from({ length: 300 }, () => makeTrade());
      useMarketStore.getState().processTradeBatch('BTC/USDT', batch2);

      expect(useMarketStore.getState().trades.get('BTC/USDT')!.length).toBe(500);
    });

    it('newest trades are first after merge', () => {
      const oldTrade = makeTrade({ id: 'old', timestamp: 1000 });
      useMarketStore.getState().processTradeBatch('BTC/USDT', [oldTrade]);

      const newTrade = makeTrade({ id: 'new', timestamp: 2000 });
      useMarketStore.getState().processTradeBatch('BTC/USDT', [newTrade]);

      const stored = useMarketStore.getState().trades.get('BTC/USDT')!;
      expect(stored[0]!.id).toBe('new');
      expect(stored[1]!.id).toBe('old');
    });
  });

  // -------------------------------------------------------------------------
  // Unsubscribe edge cases
  // -------------------------------------------------------------------------
  describe('unsubscribe edge cases', () => {
    it('unsubscribing nonexistent symbol does not crash', () => {
      expect(() => {
        useMarketStore.getState().unsubscribe('NONEXISTENT/PAIR');
      }).not.toThrow();
    });

    it('unsubscribe clears candles too', () => {
      useMarketStore.getState().processTradeBatch('BTC/USDT', [makeTrade()]);
      useMarketStore.getState().unsubscribe('BTC/USDT');

      expect(useMarketStore.getState().candles.has('BTC/USDT')).toBe(false);
    });

    it('unsubscribe for one symbol does not affect others', () => {
      useMarketStore.getState().processTradeBatch('BTC/USDT', [makeTrade({ symbol: 'BTC/USDT' })]);
      useMarketStore.getState().processTradeBatch('ETH/USDT', [makeTrade({ symbol: 'ETH/USDT' })]);
      useMarketStore.getState().processTicker('ETH/USDT', makeTicker('ETH/USDT'));

      useMarketStore.getState().unsubscribe('BTC/USDT');

      expect(useMarketStore.getState().trades.has('BTC/USDT')).toBe(false);
      expect(useMarketStore.getState().trades.has('ETH/USDT')).toBe(true);
      expect(useMarketStore.getState().tickers.has('ETH/USDT')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // routeWorkerMessage edge cases
  // -------------------------------------------------------------------------
  describe('routeWorkerMessage edge cases', () => {
    it('candle-update message is handled without error', () => {
      expect(() => {
        routeWorkerMessage({
          type: 'candle-update',
          symbol: 'BTC/USDT',
          candle: {} as any,
        } as unknown as WorkerOutboundMessage);
      }).not.toThrow();
    });

    it('indicator-update message is handled without error', () => {
      expect(() => {
        routeWorkerMessage({
          type: 'indicator-update',
        } as unknown as WorkerOutboundMessage);
      }).not.toThrow();
    });

    it('error message logs to console.error', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      routeWorkerMessage({
        type: 'error',
        code: 'WS_FAIL',
        message: 'Connection lost',
      });
      expect(spy).toHaveBeenCalledWith('[DataWorker] WS_FAIL: Connection lost');
      spy.mockRestore();
    });

    it('rapid sequential messages do not corrupt state', () => {
      for (let i = 0; i < 50; i++) {
        routeWorkerMessage({
          type: 'ticker',
          symbol: 'BTC/USDT',
          ticker: makeTicker(),
        });
      }

      // Should only have latest ticker, not 50
      const ticker = useMarketStore.getState().tickers.get('BTC/USDT');
      expect(ticker).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // setTimeframe edge cases
  // -------------------------------------------------------------------------
  describe('setTimeframe', () => {
    it('re-aggregates existing trades when timeframe changes', () => {
      const trades = Array.from({ length: 10 }, (_, i) =>
        makeTrade({ timestamp: 1700000000000 + i * 30000, price: 65000 + i })
      );
      useMarketStore.getState().processTradeBatch('BTC/USDT', trades);

      const candlesBefore = useMarketStore.getState().candles.get('BTC/USDT')!;
      const countBefore = candlesBefore.length;

      useMarketStore.getState().setTimeframe('BTC/USDT', '5m');

      const candlesAfter = useMarketStore.getState().candles.get('BTC/USDT')!;
      // With 5m timeframe, there should be fewer or equal candles
      expect(candlesAfter.length).toBeLessThanOrEqual(countBefore);
    });

    it('setTimeframe on symbol with no trades does not crash', () => {
      expect(() => {
        useMarketStore.getState().setTimeframe('UNKNOWN/PAIR', '15m');
      }).not.toThrow();

      expect(useMarketStore.getState().timeframes.get('UNKNOWN/PAIR')).toBe('15m');
    });
  });

  // -------------------------------------------------------------------------
  // Ticker overwrite
  // -------------------------------------------------------------------------
  describe('processTicker', () => {
    it('overwrites previous ticker for same symbol', () => {
      useMarketStore.getState().processTicker('BTC/USDT', makeTicker());
      useMarketStore.getState().processTicker('BTC/USDT', {
        ...makeTicker(), lastPrice: 70000,
      });

      expect(useMarketStore.getState().tickers.get('BTC/USDT')!.lastPrice).toBe(70000);
    });
  });
});
