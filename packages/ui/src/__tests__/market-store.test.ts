import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Worker
vi.stubGlobal('Worker', vi.fn(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null,
  onerror: null,
})));

import { useMarketStore, routeWorkerMessage } from '../stores/market-store.js';
import type { NormalizedTrade, OrderbookSnapshot, Ticker } from '@terminal/types';

function makeTrade(overrides: Partial<NormalizedTrade> = {}): NormalizedTrade {
  return {
    id: `trade-${Math.random()}`,
    exchange: 'binance',
    symbol: 'BTC/USDT',
    price: 65000,
    amount: 0.1,
    side: 'buy',
    timestamp: Date.now(),
    isMaker: false,
    cost: 6500,
    liquidation: false,
    ...overrides,
  };
}

function makeOrderbook(symbol = 'BTC/USDT'): OrderbookSnapshot {
  return {
    exchange: 'binance',
    symbol,
    timestamp: Date.now(),
    bids: [{ price: 64999, size: 1 }, { price: 64998, size: 2 }],
    asks: [{ price: 65001, size: 1 }, { price: 65002, size: 2 }],
    sequenceId: 1,
  };
}

function makeTicker(symbol = 'BTC/USDT'): Ticker {
  return {
    exchange: 'binance',
    symbol,
    timestamp: Date.now(),
    lastPrice: 65000,
    changePercent24h: 1.5,
    high24h: 66000,
    low24h: 64000,
    volume24h: 10000,
    quoteVolume24h: 650000000,
    bbo: { bidPrice: 64999, bidSize: 1, askPrice: 65001, askSize: 1 },
  };
}

describe('useMarketStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useMarketStore.setState({
      trades: new Map(),
      orderbooks: new Map(),
      tickers: new Map(),
      candles: new Map(),
      timeframes: new Map(),
      connectionStatuses: new Map(),
      subscriptions: new Set(),
    });
  });

  describe('processTradeBatch', () => {
    it('should add trades for a symbol', () => {
      const trades = [makeTrade(), makeTrade()];
      useMarketStore.getState().processTradeBatch('BTC/USDT', trades);

      const stored = useMarketStore.getState().trades.get('BTC/USDT');
      expect(stored).toHaveLength(2);
    });

    it('should prepend new trades (newest first)', () => {
      const old = makeTrade({ id: 'old' });
      useMarketStore.getState().processTradeBatch('BTC/USDT', [old]);

      const newer = makeTrade({ id: 'new' });
      useMarketStore.getState().processTradeBatch('BTC/USDT', [newer]);

      const stored = useMarketStore.getState().trades.get('BTC/USDT')!;
      expect(stored[0]!.id).toBe('new');
      expect(stored[1]!.id).toBe('old');
    });

    it('should cap at 500 trades', () => {
      const bigBatch = Array.from({ length: 600 }, (_, i) => makeTrade({ id: `t-${i}` }));
      useMarketStore.getState().processTradeBatch('BTC/USDT', bigBatch);

      const stored = useMarketStore.getState().trades.get('BTC/USDT')!;
      expect(stored.length).toBe(500);
    });
  });

  describe('processOrderbook', () => {
    it('should store orderbook snapshot', () => {
      const ob = makeOrderbook();
      useMarketStore.getState().processOrderbook('BTC/USDT', ob);

      const stored = useMarketStore.getState().orderbooks.get('BTC/USDT');
      expect(stored).toBe(ob);
    });

    it('should replace existing snapshot', () => {
      const ob1 = makeOrderbook();
      const ob2 = makeOrderbook();
      useMarketStore.getState().processOrderbook('BTC/USDT', ob1);
      useMarketStore.getState().processOrderbook('BTC/USDT', ob2);

      expect(useMarketStore.getState().orderbooks.get('BTC/USDT')).toBe(ob2);
    });
  });

  describe('processTicker', () => {
    it('should store ticker', () => {
      const ticker = makeTicker();
      useMarketStore.getState().processTicker('BTC/USDT', ticker);

      expect(useMarketStore.getState().tickers.get('BTC/USDT')).toBe(ticker);
    });
  });

  describe('processConnectionStatus', () => {
    it('should store connection status', () => {
      useMarketStore.getState().processConnectionStatus('binance', 'connected');
      expect(useMarketStore.getState().connectionStatuses.get('binance')).toBe('connected');
    });

    it('should update existing status', () => {
      useMarketStore.getState().processConnectionStatus('binance', 'connecting');
      useMarketStore.getState().processConnectionStatus('binance', 'connected');
      expect(useMarketStore.getState().connectionStatuses.get('binance')).toBe('connected');
    });
  });

  describe('unsubscribe', () => {
    it('should clear data for unsubscribed symbol', () => {
      useMarketStore.getState().processTradeBatch('BTC/USDT', [makeTrade()]);
      useMarketStore.getState().processOrderbook('BTC/USDT', makeOrderbook());
      useMarketStore.getState().processTicker('BTC/USDT', makeTicker());

      useMarketStore.getState().unsubscribe('BTC/USDT');

      const state = useMarketStore.getState();
      expect(state.trades.has('BTC/USDT')).toBe(false);
      expect(state.orderbooks.has('BTC/USDT')).toBe(false);
      expect(state.tickers.has('BTC/USDT')).toBe(false);
    });
  });
});

describe('routeWorkerMessage', () => {
  beforeEach(() => {
    useMarketStore.setState({
      trades: new Map(),
      orderbooks: new Map(),
      tickers: new Map(),
      candles: new Map(),
      timeframes: new Map(),
      connectionStatuses: new Map(),
      subscriptions: new Set(),
    });
  });

  it('should route trade-batch messages', () => {
    const trades = [makeTrade()];
    routeWorkerMessage({ type: 'trade-batch', symbol: 'BTC/USDT', trades });
    expect(useMarketStore.getState().trades.get('BTC/USDT')).toHaveLength(1);
  });

  it('should route orderbook messages', () => {
    const snapshot = makeOrderbook();
    routeWorkerMessage({ type: 'orderbook', symbol: 'BTC/USDT', snapshot });
    expect(useMarketStore.getState().orderbooks.get('BTC/USDT')).toBe(snapshot);
  });

  it('should route ticker messages', () => {
    const ticker = makeTicker();
    routeWorkerMessage({ type: 'ticker', symbol: 'BTC/USDT', ticker });
    expect(useMarketStore.getState().tickers.get('BTC/USDT')).toBe(ticker);
  });

  it('should route connection-status messages', () => {
    routeWorkerMessage({ type: 'connection-status', exchange: 'binance', status: 'connected' });
    expect(useMarketStore.getState().connectionStatuses.get('binance')).toBe('connected');
  });

  it('should handle error messages without throwing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => routeWorkerMessage({ type: 'error', code: 'TEST', message: 'test error' })).not.toThrow();
    consoleSpy.mockRestore();
  });
});
