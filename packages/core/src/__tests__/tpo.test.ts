import { describe, it, expect } from 'vitest';
import { computeMarketProfile } from '../indicators/tpo.js';
import type { OHLCVCandle } from '@terminal/types';

function makeCandle(overrides: Partial<OHLCVCandle> = {}): OHLCVCandle {
  return {
    exchange: 'simulated',
    symbol: 'BTC/USDT',
    timeframe: '1m',
    timestamp: 1700000000000,
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 10,
    buyVolume: 6,
    sellVolume: 4,
    tradeCount: 20,
    closed: true,
    ...overrides,
  };
}

describe('computeMarketProfile', () => {
  it('should return empty profile for empty candles', () => {
    const profile = computeMarketProfile([], 1);
    expect(profile.rows).toHaveLength(0);
    expect(profile.poc).toBe(0);
  });

  it('should compute TPO rows from single candle', () => {
    const candle = makeCandle({ high: 105, low: 95 });
    const profile = computeMarketProfile([candle], 1);

    expect(profile.rows.length).toBeGreaterThan(0);
    expect(profile.high).toBe(105);
    expect(profile.low).toBe(95);
  });

  it('should find POC at most-visited price level', () => {
    // Multiple candles overlapping at 100
    const candles = [
      makeCandle({ timestamp: 1000, high: 105, low: 95 }), // covers 95-105
      makeCandle({ timestamp: 2000, high: 103, low: 97 }), // covers 97-103
      makeCandle({ timestamp: 3000, high: 102, low: 98 }), // covers 98-102
    ];
    const profile = computeMarketProfile(candles, 1);

    // POC should be around 100 (most overlap)
    expect(profile.poc).toBeGreaterThanOrEqual(98);
    expect(profile.poc).toBeLessThanOrEqual(102);
  });

  it('should compute value area around POC', () => {
    const candles = [
      makeCandle({ timestamp: 1000, high: 110, low: 90, volume: 10 }),
      makeCandle({ timestamp: 2000, high: 105, low: 95, volume: 20 }),
      makeCandle({ timestamp: 3000, high: 103, low: 97, volume: 30 }),
    ];
    const profile = computeMarketProfile(candles, 1, 0.70);

    // Value area should be narrower than the full range
    expect(profile.val).toBeGreaterThanOrEqual(90);
    expect(profile.vah).toBeLessThanOrEqual(110);
    expect(profile.vah).toBeGreaterThan(profile.val);
  });

  it('should compute initial balance from first hour', () => {
    const base = 1700000000000;
    const candles = [
      makeCandle({ timestamp: base, high: 102, low: 98 }), // within IB
      makeCandle({ timestamp: base + 30 * 60_000, high: 104, low: 96 }), // within IB
      makeCandle({ timestamp: base + 90 * 60_000, high: 115, low: 85 }), // outside IB
    ];
    const profile = computeMarketProfile(candles, 1, 0.70, 60);

    expect(profile.ibHigh).toBe(104);
    expect(profile.ibLow).toBe(96);
  });

  it('should sort rows by price ascending', () => {
    const candles = [makeCandle({ high: 110, low: 90 })];
    const profile = computeMarketProfile(candles, 1);

    for (let i = 1; i < profile.rows.length; i++) {
      expect(profile.rows[i]!.price).toBeGreaterThanOrEqual(profile.rows[i - 1]!.price);
    }
  });

  it('should handle different tick sizes', () => {
    const candles = [makeCandle({ high: 110, low: 90 })];
    const p1 = computeMarketProfile(candles, 1);
    const p5 = computeMarketProfile(candles, 5);

    // Larger tick size = fewer rows
    expect(p5.rows.length).toBeLessThan(p1.rows.length);
  });

  it('should include buy/sell volume in rows', () => {
    const candles = [makeCandle({ buyVolume: 6, sellVolume: 4 })];
    const profile = computeMarketProfile(candles, 1);

    const totalBuy = profile.rows.reduce((sum, r) => sum + r.buyVolume, 0);
    const totalSell = profile.rows.reduce((sum, r) => sum + r.sellVolume, 0);

    expect(totalBuy).toBeCloseTo(6, 1);
    expect(totalSell).toBeCloseTo(4, 1);
  });
});
