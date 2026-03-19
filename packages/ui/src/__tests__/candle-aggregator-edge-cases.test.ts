import { describe, it, expect } from 'vitest';
import type { NormalizedTrade, OHLCVCandle, CandleTimeframe } from '@terminal/types';
import { aggregateTrade, floorToCandle, timeframeToMs } from '../stores/candle-aggregator.js';

function makeTrade(overrides: Partial<NormalizedTrade> = {}): NormalizedTrade {
  return {
    id: 'test-1',
    exchange: 'binance',
    symbol: 'BTC/USDT',
    price: 50000,
    amount: 1.0,
    side: 'buy',
    timestamp: 1700000060000,
    isMaker: false,
    cost: 50000,
    liquidation: false,
    ...overrides,
  };
}

describe('aggregateTrade edge cases', () => {
  describe('maxCandles validation', () => {
    it('should throw RangeError for maxCandles = 0', () => {
      expect(() => aggregateTrade([], makeTrade(), '1m', 0)).toThrow(RangeError);
    });

    it('should throw RangeError for negative maxCandles', () => {
      expect(() => aggregateTrade([], makeTrade(), '1m', -5)).toThrow(RangeError);
    });

    it('should include maxCandles value in error message', () => {
      try {
        aggregateTrade([], makeTrade(), '1m', -3);
      } catch (e) {
        expect((e as Error).message).toContain('-3');
      }
    });

    it('should accept maxCandles = 1', () => {
      const result = aggregateTrade([], makeTrade(), '1m', 1);
      expect(result).toHaveLength(1);
    });
  });

  describe('empty candles array', () => {
    it('should create first candle from trade', () => {
      const trade = makeTrade({ price: 50000, amount: 1.5, side: 'buy' });
      const result = aggregateTrade([], trade, '1m');

      expect(result).toHaveLength(1);
      expect(result[0]!.open).toBe(50000);
      expect(result[0]!.high).toBe(50000);
      expect(result[0]!.low).toBe(50000);
      expect(result[0]!.close).toBe(50000);
      expect(result[0]!.volume).toBe(1.5);
      expect(result[0]!.buyVolume).toBe(1.5);
      expect(result[0]!.sellVolume).toBe(0);
      expect(result[0]!.tradeCount).toBe(1);
      expect(result[0]!.closed).toBe(false);
    });
  });

  describe('update existing candle', () => {
    it('should update high when trade price is higher', () => {
      const candles: OHLCVCandle[] = [];
      const ts = 1700000060000;
      aggregateTrade(candles, makeTrade({ price: 100, timestamp: ts }), '1m');
      aggregateTrade(candles, makeTrade({ price: 200, timestamp: ts + 1000 }), '1m');

      expect(candles[0]!.high).toBe(200);
      expect(candles[0]!.close).toBe(200);
    });

    it('should update low when trade price is lower', () => {
      const candles: OHLCVCandle[] = [];
      const ts = 1700000060000;
      aggregateTrade(candles, makeTrade({ price: 200, timestamp: ts }), '1m');
      aggregateTrade(candles, makeTrade({ price: 50, timestamp: ts + 1000 }), '1m');

      expect(candles[0]!.low).toBe(50);
    });

    it('should accumulate volume', () => {
      const candles: OHLCVCandle[] = [];
      const ts = 1700000060000;
      aggregateTrade(candles, makeTrade({ amount: 1.0, timestamp: ts }), '1m');
      aggregateTrade(candles, makeTrade({ amount: 2.5, timestamp: ts + 1000 }), '1m');

      expect(candles[0]!.volume).toBeCloseTo(3.5);
      expect(candles[0]!.tradeCount).toBe(2);
    });

    it('should track buy vs sell volume', () => {
      const candles: OHLCVCandle[] = [];
      const ts = 1700000060000;
      aggregateTrade(candles, makeTrade({ amount: 1.0, side: 'buy', timestamp: ts }), '1m');
      aggregateTrade(candles, makeTrade({ amount: 2.0, side: 'sell', timestamp: ts + 1000 }), '1m');

      expect(candles[0]!.buyVolume).toBeCloseTo(1.0);
      expect(candles[0]!.sellVolume).toBeCloseTo(2.0);
    });
  });

  describe('new candle creation', () => {
    it('should create new candle when trade crosses period boundary', () => {
      const candles: OHLCVCandle[] = [];
      const ts1 = 1700000060000;
      const ts2 = ts1 + 60_000; // Next minute

      aggregateTrade(candles, makeTrade({ price: 100, timestamp: ts1 }), '1m');
      aggregateTrade(candles, makeTrade({ price: 200, timestamp: ts2 }), '1m');

      expect(candles).toHaveLength(2);
      expect(candles[0]!.closed).toBe(true); // Previous candle closed
      expect(candles[1]!.closed).toBe(false);
    });

    it('should trim old candles when exceeding maxCandles', () => {
      const candles: OHLCVCandle[] = [];
      const baseTs = 1700000060000;

      for (let i = 0; i < 10; i++) {
        aggregateTrade(
          candles,
          makeTrade({ price: 100 + i, timestamp: baseTs + i * 60_000 }),
          '1m',
          5,
        );
      }

      expect(candles).toHaveLength(5);
      // Should keep the latest candles
      expect(candles[4]!.close).toBe(109);
    });
  });
});

describe('floorToCandle', () => {
  it('should floor to 1m boundary', () => {
    const ts = 1700000099999;
    const floored = floorToCandle(ts, 60_000);
    expect(floored % 60_000).toBe(0);
    expect(floored).toBeLessThanOrEqual(ts);
    expect(ts - floored).toBeLessThan(60_000);
  });

  it('should return same value when already aligned', () => {
    const ts = 1700000040000; // Must be divisible by 60000
    expect(1700000040000 % 60_000).toBe(0); // sanity check
    expect(floorToCandle(ts, 60_000)).toBe(ts);
  });
});

describe('timeframeToMs', () => {
  it('should return correct ms for all timeframes', () => {
    expect(timeframeToMs('1s')).toBe(1_000);
    expect(timeframeToMs('1m')).toBe(60_000);
    expect(timeframeToMs('5m')).toBe(300_000);
    expect(timeframeToMs('1h')).toBe(3_600_000);
    expect(timeframeToMs('1d')).toBe(86_400_000);
    expect(timeframeToMs('1w')).toBe(604_800_000);
  });
});
