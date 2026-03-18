import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Worker
vi.stubGlobal('Worker', vi.fn(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null,
  onerror: null,
})));

import { useMarketStore } from '../stores/market-store.js';
import type { NormalizedTrade } from '@terminal/types';

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

function makeSequentialTrades(count: number, basePrice = 65000): NormalizedTrade[] {
  const base = Date.now();
  return Array.from({ length: count }, (_, i) =>
    makeTrade({
      id: `t-${i}`,
      price: basePrice + i * 10,
      amount: 1,
      cost: basePrice + i * 10,
      timestamp: base + i * 1000,
    })
  );
}

describe('market-store custom bar types', () => {
  beforeEach(() => {
    useMarketStore.setState({
      trades: new Map(),
      orderbooks: new Map(),
      tickers: new Map(),
      candles: new Map(),
      timeframes: new Map(),
      barTypes: new Map(),
      customBarConfigs: new Map(),
      connectionStatuses: new Map(),
      subscriptions: new Set(),
    });
  });

  it('should default to time bar type', () => {
    expect(useMarketStore.getState().barTypes.get('BTC/USDT')).toBeUndefined();
    // processTradeBatch should use time-based aggregation by default
    useMarketStore.getState().processTradeBatch('BTC/USDT', makeSequentialTrades(5));
    expect(useMarketStore.getState().candles.get('BTC/USDT')?.length).toBeGreaterThan(0);
  });

  it('should switch to tick bars and rebuild candles', () => {
    const trades = makeSequentialTrades(10);
    useMarketStore.getState().processTradeBatch('BTC/USDT', trades);

    // Switch to tick bars with 5 trades per bar
    useMarketStore.getState().setBarType('BTC/USDT', 'tick', { type: 'tick', tickCount: 5 });

    const state = useMarketStore.getState();
    expect(state.barTypes.get('BTC/USDT')).toBe('tick');
    expect(state.customBarConfigs.get('BTC/USDT')?.type).toBe('tick');

    const candles = state.candles.get('BTC/USDT');
    expect(candles).toBeDefined();
    // 10 trades with tickCount=5 → 2 bars
    expect(candles!.length).toBe(2);
  });

  it('should switch to volume bars and rebuild candles', () => {
    // Each trade has amount=1, so volumeThreshold=3 → bars every 3 trades
    const trades = makeSequentialTrades(9);
    useMarketStore.getState().processTradeBatch('BTC/USDT', trades);

    useMarketStore.getState().setBarType('BTC/USDT', 'volume', { type: 'volume', volumeThreshold: 3 });

    const candles = useMarketStore.getState().candles.get('BTC/USDT');
    expect(candles).toBeDefined();
    // 9 trades, 3 per bar → 3 bars
    expect(candles!.length).toBe(3);
  });

  it('should switch to range bars and rebuild candles', () => {
    // Prices: 65000, 65010, 65020, ...65090 (range = 90 total)
    const trades = makeSequentialTrades(10);
    useMarketStore.getState().processTradeBatch('BTC/USDT', trades);

    useMarketStore.getState().setBarType('BTC/USDT', 'range', { type: 'range', rangeSize: 50 });

    const candles = useMarketStore.getState().candles.get('BTC/USDT');
    expect(candles).toBeDefined();
    expect(candles!.length).toBeGreaterThanOrEqual(1);
  });

  it('should switch back to time bars', () => {
    const trades = makeSequentialTrades(10);
    useMarketStore.getState().processTradeBatch('BTC/USDT', trades);

    // Switch to tick, then back to time
    useMarketStore.getState().setBarType('BTC/USDT', 'tick', { type: 'tick', tickCount: 5 });
    useMarketStore.getState().setBarType('BTC/USDT', 'time');

    const state = useMarketStore.getState();
    expect(state.barTypes.get('BTC/USDT')).toBe('time');
    expect(state.customBarConfigs.has('BTC/USDT')).toBe(false);

    // Should have time-based candles rebuilt
    const candles = state.candles.get('BTC/USDT');
    expect(candles).toBeDefined();
    expect(candles!.length).toBeGreaterThan(0);
  });

  it('should use custom bar builders in processTradeBatch when bar type is set', () => {
    // Set tick bar type first
    useMarketStore.getState().setBarType('BTC/USDT', 'tick', { type: 'tick', tickCount: 3 });

    // Now process trades - should use tick bar builder
    const trades = makeSequentialTrades(6);
    useMarketStore.getState().processTradeBatch('BTC/USDT', trades);

    const candles = useMarketStore.getState().candles.get('BTC/USDT');
    expect(candles).toBeDefined();
    // 6 trades with tickCount=3 → 2 bars
    expect(candles!.length).toBe(2);
  });

  it('should preserve bar type across processTradeBatch calls', () => {
    useMarketStore.getState().setBarType('BTC/USDT', 'tick', { type: 'tick', tickCount: 5 });

    // First batch
    useMarketStore.getState().processTradeBatch('BTC/USDT', makeSequentialTrades(3));
    // Second batch
    useMarketStore.getState().processTradeBatch('BTC/USDT', makeSequentialTrades(3));

    const state = useMarketStore.getState();
    expect(state.barTypes.get('BTC/USDT')).toBe('tick');
    const candles = state.candles.get('BTC/USDT');
    expect(candles).toBeDefined();
  });
});
