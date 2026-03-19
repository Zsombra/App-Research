import { describe, it, expect } from 'vitest';
import {
  bucketPrice,
  autoTickSize,
  buildFootprintFromTrades,
  buildFootprintFromCandles,
} from '../indicators/footprint.js';
import type { OHLCVCandle, NormalizedTrade } from '@terminal/types';

function makeCandle(
  ts: number,
  o: number,
  h: number,
  l: number,
  c: number,
): OHLCVCandle {
  return {
    timestamp: ts,
    open: o,
    high: h,
    low: l,
    close: c,
    volume: 100,
    buyVolume: 50,
    sellVolume: 50,
    tradeCount: 10,
  };
}

function makeTrade(
  ts: number,
  price: number,
  amount: number,
  side: 'buy' | 'sell',
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

describe('bucketPrice', () => {
  it('returns price unchanged when tickSize <= 0', () => {
    expect(bucketPrice(123.456, 0)).toBe(123.456);
    expect(bucketPrice(123.456, -1)).toBe(123.456);
  });

  it('buckets correctly with positive tickSize', () => {
    expect(bucketPrice(123.456, 1)).toBe(123);
    expect(bucketPrice(123.456, 5)).toBe(120);
    expect(bucketPrice(123.456, 10)).toBe(120);
    expect(bucketPrice(100, 10)).toBe(100);
  });
});

describe('autoTickSize', () => {
  it('returns 1 for empty candles', () => {
    expect(autoTickSize([])).toBe(1);
  });

  it('returns 1 for flat candles (zero range)', () => {
    const candles = [makeCandle(1, 100, 100, 100, 100)];
    expect(autoTickSize(candles)).toBe(1);
  });

  it('returns a positive tick size for normal candles', () => {
    const candles = [
      makeCandle(1, 100, 110, 90, 105),
      makeCandle(2, 105, 115, 95, 110),
    ];
    const tick = autoTickSize(candles);
    expect(tick).toBeGreaterThan(0);
  });

  it('returns 1 when avgRange/30 would be zero (Math.log10 guard)', () => {
    // All candles with high === low → totalRange = 0 → raw = 0
    // Without the guard, Math.log10(0) = -Infinity
    const candles = [
      makeCandle(1, 100, 100, 100, 100),
      makeCandle(2, 100, 100, 100, 100),
    ];
    const tick = autoTickSize(candles);
    expect(tick).toBe(1);
    expect(Number.isFinite(tick)).toBe(true);
  });
});

describe('buildFootprintFromTrades', () => {
  it('returns empty for empty candles', () => {
    const trades = [makeTrade(1000, 100, 1, 'buy')];
    expect(buildFootprintFromTrades([], trades, 1)).toHaveLength(0);
  });

  it('returns empty-level footprints for tickSize <= 0', () => {
    const candles = [makeCandle(1000, 100, 110, 90, 105)];
    const trades = [makeTrade(1010, 100, 1, 'buy')];
    const result = buildFootprintFromTrades(candles, trades, 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.levels).toHaveLength(0);
    expect(result[0]!.tickSize).toBe(1);
  });

  it('returns empty-level footprints for negative tickSize', () => {
    const candles = [makeCandle(1000, 100, 110, 90, 105)];
    const result = buildFootprintFromTrades(candles, [], -5);
    expect(result).toHaveLength(1);
    expect(result[0]!.levels).toHaveLength(0);
  });

  it('aggregates buy and sell volume at price levels', () => {
    const candles = [makeCandle(1000, 100, 110, 90, 105)];
    const trades = [
      makeTrade(1010, 101, 5, 'buy'),
      makeTrade(1020, 101, 3, 'sell'),
      makeTrade(1030, 105, 2, 'buy'),
    ];
    const result = buildFootprintFromTrades(candles, trades, 1);
    expect(result).toHaveLength(1);
    expect(result[0]!.levels.length).toBeGreaterThan(0);

    const level101 = result[0]!.levels.find((l) => l.price === 101);
    expect(level101).toBeDefined();
    expect(level101!.buyVolume).toBe(5);
    expect(level101!.sellVolume).toBe(3);
  });

  it('sorts levels by price ascending', () => {
    const candles = [makeCandle(1000, 100, 120, 80, 100)];
    const trades = [
      makeTrade(1010, 110, 1, 'buy'),
      makeTrade(1020, 90, 1, 'sell'),
      makeTrade(1030, 100, 1, 'buy'),
    ];
    const result = buildFootprintFromTrades(candles, trades, 1);
    const levels = result[0]!.levels;
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]!.price).toBeGreaterThanOrEqual(levels[i - 1]!.price);
    }
  });
});

describe('buildFootprintFromCandles', () => {
  it('creates synthetic levels from candle data', () => {
    const candles = [makeCandle(1000, 100, 110, 90, 105)];
    const result = buildFootprintFromCandles(candles, 5);
    expect(result).toHaveLength(1);
    expect(result[0]!.levels.length).toBeGreaterThan(0);
    expect(result[0]!.tickSize).toBe(5);
  });

  it('handles flat candles (high == low)', () => {
    const candles = [makeCandle(1000, 100, 100, 100, 100)];
    const result = buildFootprintFromCandles(candles, 1);
    expect(result).toHaveLength(1);
    expect(result[0]!.levels.length).toBeGreaterThanOrEqual(1);
  });
});
