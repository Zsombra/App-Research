import { describe, it, expect } from 'vitest';
import { buildTickBars, buildVolumeBars, buildRangeBars } from '../indicators/custom-bars.js';
import type { NormalizedTrade } from '@terminal/types';

function makeTrade(
  ts: number,
  price: number,
  amount: number,
  side: 'buy' | 'sell' = 'buy',
): NormalizedTrade {
  return {
    timestamp: ts,
    price,
    amount,
    side,
    symbol: 'BTC/USDT',
    exchange: 'test',
  };
}

describe('buildBarFromTrades — Infinity-free initialization', () => {
  it('single-trade bar has finite high and low (no -Infinity/Infinity)', () => {
    const trades = [makeTrade(1000, 50000, 1)];
    const bars = buildTickBars(trades, { type: 'tick', tickCount: 1 });
    expect(bars).toHaveLength(1);
    expect(Number.isFinite(bars[0]!.high)).toBe(true);
    expect(Number.isFinite(bars[0]!.low)).toBe(true);
    expect(bars[0]!.high).toBe(50000);
    expect(bars[0]!.low).toBe(50000);
  });

  it('multi-trade bar correctly computes high/low', () => {
    const trades = [
      makeTrade(1000, 50000, 1),
      makeTrade(1001, 51000, 1),
      makeTrade(1002, 49000, 1),
    ];
    const bars = buildTickBars(trades, { type: 'tick', tickCount: 3 });
    expect(bars).toHaveLength(1);
    expect(bars[0]!.high).toBe(51000);
    expect(bars[0]!.low).toBe(49000);
    expect(bars[0]!.open).toBe(50000);
    expect(bars[0]!.close).toBe(49000);
  });

  it('separates buy and sell volume', () => {
    const trades = [
      makeTrade(1000, 50000, 2, 'buy'),
      makeTrade(1001, 50000, 3, 'sell'),
    ];
    const bars = buildTickBars(trades, { type: 'tick', tickCount: 5 });
    expect(bars).toHaveLength(1);
    expect(bars[0]!.buyVolume).toBe(2);
    expect(bars[0]!.sellVolume).toBe(3);
    expect(bars[0]!.volume).toBe(5);
  });
});

describe('buildTickBars edge cases', () => {
  it('returns empty for empty trades', () => {
    expect(buildTickBars([], { type: 'tick', tickCount: 5 })).toHaveLength(0);
  });

  it('returns empty for tickCount <= 0', () => {
    const trades = [makeTrade(1000, 50000, 1)];
    expect(buildTickBars(trades, { type: 'tick', tickCount: 0 })).toHaveLength(0);
    expect(buildTickBars(trades, { type: 'tick', tickCount: -1 })).toHaveLength(0);
  });

  it('creates correct number of bars', () => {
    const trades = Array.from({ length: 10 }, (_, i) => makeTrade(i, 50000 + i, 1));
    const bars = buildTickBars(trades, { type: 'tick', tickCount: 3 });
    // 10 trades / 3 per bar = 3 full bars + 1 partial = 4
    expect(bars).toHaveLength(4);
  });
});

describe('buildVolumeBars edge cases', () => {
  it('returns empty for empty trades', () => {
    expect(buildVolumeBars([], { type: 'volume', volumeThreshold: 5 })).toHaveLength(0);
  });

  it('returns empty for volumeThreshold <= 0', () => {
    const trades = [makeTrade(1000, 50000, 1)];
    expect(buildVolumeBars(trades, { type: 'volume', volumeThreshold: 0 })).toHaveLength(0);
  });

  it('last bar is marked as not closed', () => {
    const trades = [makeTrade(1, 100, 1), makeTrade(2, 101, 1)];
    const bars = buildVolumeBars(trades, { type: 'volume', volumeThreshold: 10 });
    expect(bars).toHaveLength(1);
    expect(bars[0]!.closed).toBe(false);
  });
});

describe('buildRangeBars edge cases', () => {
  it('returns empty for empty trades', () => {
    expect(buildRangeBars([], { type: 'range', rangeSize: 10 })).toHaveLength(0);
  });

  it('returns empty for rangeSize <= 0', () => {
    const trades = [makeTrade(1000, 50000, 1)];
    expect(buildRangeBars(trades, { type: 'range', rangeSize: 0 })).toHaveLength(0);
  });

  it('creates new bar when range is exceeded', () => {
    const trades = [
      makeTrade(1, 100, 1),
      makeTrade(2, 120, 1), // range = 20, exceeds 15
      makeTrade(3, 115, 1),
    ];
    const bars = buildRangeBars(trades, { type: 'range', rangeSize: 15 });
    expect(bars.length).toBeGreaterThanOrEqual(2);
  });

  it('last bar is marked as not closed', () => {
    const trades = [makeTrade(1, 100, 1)];
    const bars = buildRangeBars(trades, { type: 'range', rangeSize: 10 });
    expect(bars).toHaveLength(1);
    expect(bars[0]!.closed).toBe(false);
  });
});
