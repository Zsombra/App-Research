import { describe, it, expect } from 'vitest';
import { bucketPrice, autoTickSize, buildFootprintFromCandles, buildFootprintFromTrades } from '../indicators/footprint.js';
import type { OHLCVCandle, NormalizedTrade } from '@terminal/types';

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

function makeTrade(overrides: Partial<NormalizedTrade> = {}): NormalizedTrade {
  return {
    id: '1',
    exchange: 'simulated',
    symbol: 'BTC/USDT',
    price: 100,
    amount: 1,
    side: 'buy',
    timestamp: 1700000000000,
    isMaker: false,
    cost: 100,
    liquidation: false,
    ...overrides,
  };
}

describe('bucketPrice', () => {
  it('should bucket price to tick size', () => {
    expect(bucketPrice(105.7, 1)).toBe(105);
    expect(bucketPrice(105.7, 0.5)).toBe(105.5);
    expect(bucketPrice(105.7, 10)).toBe(100);
    expect(bucketPrice(99.9, 1)).toBe(99);
  });

  it('should handle exact boundaries', () => {
    expect(bucketPrice(100, 1)).toBe(100);
    expect(bucketPrice(100, 10)).toBe(100);
  });
});

describe('autoTickSize', () => {
  it('should return 1 for empty candles', () => {
    expect(autoTickSize([])).toBe(1);
  });

  it('should auto-detect reasonable tick size', () => {
    const candles = [
      makeCandle({ high: 110, low: 90 }), // range = 20
      makeCandle({ high: 115, low: 95 }), // range = 20
    ];
    const tick = autoTickSize(candles);
    // avg range = 20, target ~30 levels => ~0.67 => rounds to 0.5 or 1
    expect(tick).toBeGreaterThan(0);
    expect(tick).toBeLessThanOrEqual(2);
  });

  it('should handle large price ranges', () => {
    const candles = [
      makeCandle({ high: 50000, low: 49000 }), // range = 1000
    ];
    const tick = autoTickSize(candles);
    // range = 1000, target ~30 => ~33 => rounds to 50
    expect(tick).toBeGreaterThanOrEqual(10);
    expect(tick).toBeLessThanOrEqual(100);
  });
});

describe('buildFootprintFromCandles', () => {
  it('should create footprint candles with levels', () => {
    const candles = [makeCandle({ high: 105, low: 95, buyVolume: 6, sellVolume: 4 })];
    const result = buildFootprintFromCandles(candles, 1);

    expect(result).toHaveLength(1);
    expect(result[0]!.levels.length).toBeGreaterThan(0);
    expect(result[0]!.tickSize).toBe(1);
  });

  it('should preserve OHLC data', () => {
    const candle = makeCandle({ open: 100, high: 110, low: 90, close: 105 });
    const result = buildFootprintFromCandles([candle], 1);

    expect(result[0]!.open).toBe(100);
    expect(result[0]!.high).toBe(110);
    expect(result[0]!.low).toBe(90);
    expect(result[0]!.close).toBe(105);
  });

  it('should compute maxLevelVolume', () => {
    const candles = [makeCandle({ volume: 10, buyVolume: 6, sellVolume: 4 })];
    const result = buildFootprintFromCandles(candles, 1);

    expect(result[0]!.maxLevelVolume).toBeGreaterThan(0);
  });

  it('should sort levels by price ascending', () => {
    const candles = [makeCandle({ high: 110, low: 90 })];
    const result = buildFootprintFromCandles(candles, 1);

    const levels = result[0]!.levels;
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]!.price).toBeGreaterThanOrEqual(levels[i - 1]!.price);
    }
  });
});

describe('buildFootprintFromTrades', () => {
  it('should aggregate trades into price levels', () => {
    const candles = [makeCandle({ timestamp: 1700000000000 })];
    const trades = [
      makeTrade({ price: 100.5, amount: 1, side: 'buy', timestamp: 1700000000100 }),
      makeTrade({ price: 100.5, amount: 2, side: 'sell', timestamp: 1700000000200 }),
      makeTrade({ price: 101.5, amount: 3, side: 'buy', timestamp: 1700000000300 }),
    ];

    const result = buildFootprintFromTrades(candles, trades, 1);

    expect(result).toHaveLength(1);
    expect(result[0]!.levels.length).toBeGreaterThan(0);

    // Find the level at price 100
    const level100 = result[0]!.levels.find((l) => l.price === 100);
    expect(level100).toBeDefined();
    expect(level100!.buyVolume).toBe(1);
    expect(level100!.sellVolume).toBe(2);
  });

  it('should skip trades outside candle boundaries', () => {
    const candles = [makeCandle({ timestamp: 1700000000000 })];
    const trades = [
      makeTrade({ price: 100, amount: 1, timestamp: 1700000090000 }), // outside 60s candle
    ];

    const result = buildFootprintFromTrades(candles, trades, 1);
    // The trade at 90s is outside the first candle (0-60s), should be skipped
    expect(result[0]!.levels.length).toBe(0);
  });

  it('should handle multiple candles', () => {
    const candles = [
      makeCandle({ timestamp: 1700000000000 }),
      makeCandle({ timestamp: 1700000060000 }),
    ];
    const trades = [
      makeTrade({ price: 100, amount: 1, timestamp: 1700000000100 }),
      makeTrade({ price: 100, amount: 2, timestamp: 1700000060100 }),
    ];

    const result = buildFootprintFromTrades(candles, trades, 1);
    expect(result).toHaveLength(2);
  });
});
