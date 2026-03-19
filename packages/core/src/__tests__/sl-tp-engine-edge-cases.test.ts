import { describe, it, expect } from 'vitest';
import {
  computeLiquidationLevels,
  detectSwingPoints,
  clusterSwingPoints,
  computeATR,
  computeRoundNumberLevels,
  dbscanCluster,
} from '../indicators/sl-tp-engine.js';
import type { OHLCVCandle } from '@terminal/types';

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

describe('computeLiquidationLevels', () => {
  it('skips leverage <= 0', () => {
    const result = computeLiquidationLevels(
      [{ entryPrice: 100, side: 'long', leverage: 1, size: 1 }],
      [0, -5],
    );
    expect(result).toHaveLength(0);
  });

  it('computes long liquidation correctly', () => {
    const result = computeLiquidationLevels(
      [{ entryPrice: 100, side: 'long', leverage: 10, size: 1 }],
      [],
    );
    expect(result).toHaveLength(1);
    // long liq = 100 * (1 - 1/10) = 90
    expect(result[0]!.price).toBeCloseTo(90);
    expect(result[0]!.type).toBe('stop-loss');
    expect(result[0]!.side).toBe('long');
  });

  it('computes short liquidation correctly', () => {
    const result = computeLiquidationLevels(
      [{ entryPrice: 100, side: 'short', leverage: 10, size: 1 }],
      [],
    );
    expect(result).toHaveLength(1);
    // short liq = 100 * (1 + 1/10) = 110
    expect(result[0]!.price).toBeCloseTo(110);
    expect(result[0]!.type).toBe('stop-loss');
    expect(result[0]!.side).toBe('short');
  });

  it('returns empty for empty positions', () => {
    expect(computeLiquidationLevels([], [5, 10, 25])).toHaveLength(0);
  });
});

describe('detectSwingPoints', () => {
  it('returns empty for insufficient candles', () => {
    const candles = [makeCandle(1, 100, 110, 90, 105)];
    expect(detectSwingPoints(candles, 2)).toHaveLength(0);
  });

  it('detects a swing high', () => {
    // candle 2 has highest high
    const candles = [
      makeCandle(1, 100, 105, 95, 100),
      makeCandle(2, 100, 104, 96, 100),
      makeCandle(3, 100, 115, 95, 100), // swing high
      makeCandle(4, 100, 104, 96, 100),
      makeCandle(5, 100, 103, 97, 100),
    ];
    const swings = detectSwingPoints(candles, 2);
    const highs = swings.filter((s) => s.type === 'high');
    expect(highs.length).toBeGreaterThanOrEqual(1);
    expect(highs[0]!.price).toBe(115);
  });

  it('detects a swing low', () => {
    const candles = [
      makeCandle(1, 100, 110, 95, 100),
      makeCandle(2, 100, 110, 96, 100),
      makeCandle(3, 100, 110, 80, 100), // swing low
      makeCandle(4, 100, 110, 96, 100),
      makeCandle(5, 100, 110, 97, 100),
    ];
    const swings = detectSwingPoints(candles, 2);
    const lows = swings.filter((s) => s.type === 'low');
    expect(lows.length).toBeGreaterThanOrEqual(1);
    expect(lows[0]!.price).toBe(80);
  });
});

describe('clusterSwingPoints — zero-price guard', () => {
  it('does not divide by zero when swing price is 0', () => {
    const swings = [
      { price: 0, timestamp: 1, type: 'low' as const, strength: 2 },
      { price: 100, timestamp: 2, type: 'high' as const, strength: 2 },
    ];
    // Should not throw
    const result = clusterSwingPoints(swings, 0.01);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty for empty swings', () => {
    expect(clusterSwingPoints([], 0.01)).toHaveLength(0);
  });

  it('clusters nearby swing points together', () => {
    const swings = [
      { price: 100, timestamp: 1, type: 'high' as const, strength: 2 },
      { price: 100.5, timestamp: 2, type: 'high' as const, strength: 2 },
      { price: 101, timestamp: 3, type: 'high' as const, strength: 2 },
    ];
    // eps = 0.02 means 2% — all within range
    const result = clusterSwingPoints(swings, 0.02);
    // Should produce clusters (each cluster generates 2 entries: SL + TP)
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe('computeATR', () => {
  it('returns 0 for fewer than 2 candles', () => {
    expect(computeATR([], 14)).toBe(0);
    expect(computeATR([makeCandle(1, 100, 110, 90, 105)], 14)).toBe(0);
  });

  it('computes ATR for known data', () => {
    const candles = [
      makeCandle(1, 100, 110, 90, 105),
      makeCandle(2, 105, 115, 95, 110),
    ];
    const atr = computeATR(candles, 14);
    // TR = max(115-95, |115-105|, |95-105|) = max(20, 10, 10) = 20
    expect(atr).toBeCloseTo(20);
  });
});

describe('computeRoundNumberLevels', () => {
  it('produces levels within range', () => {
    const result = computeRoundNumberLevels(1050, 100, 10, 1, 500);
    // Range: 800..1300, round levels: 800, 900, 1000, 1100, 1200, 1300
    // 1050 is not a round number so it won't be skipped
    expect(result.length).toBeGreaterThan(0);
    for (const c of result) {
      expect(c.price % 100).toBe(0);
    }
  });

  it('skips levels too close to current price', () => {
    // currentPrice=1000, roundInterval=1000, range=500
    // Only level=1000 is in range, but it's < 0.1% from currentPrice → skipped
    const result = computeRoundNumberLevels(1000, 1000, 10, 1, 500);
    expect(result).toHaveLength(0);
  });
});

describe('dbscanCluster — zero-price guard', () => {
  it('does not divide by zero when a price is 0', () => {
    const prices = [0, 100, 101, 102];
    // Should not throw
    const result = dbscanCluster(prices, 0.05, 2);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty for empty input', () => {
    expect(dbscanCluster([], 0.05, 2)).toHaveLength(0);
  });

  it('clusters nearby prices', () => {
    const prices = [100, 101, 102, 200, 201, 202];
    const result = dbscanCluster(prices, 0.03, 2);
    expect(result.length).toBe(2);
  });

  it('respects minPoints threshold', () => {
    const prices = [100, 200];
    // minPoints=3 → no cluster can form with only 2 points
    const result = dbscanCluster(prices, 0.05, 3);
    expect(result).toHaveLength(0);
  });
});
