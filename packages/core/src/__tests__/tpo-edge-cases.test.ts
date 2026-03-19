import { describe, it, expect } from 'vitest';
import type { OHLCVCandle } from '@terminal/types';
import { computeMarketProfile } from '../indicators/tpo.js';

function makeCandles(count: number, base: number = 100, tickSize: number = 1): OHLCVCandle[] {
  return Array.from({ length: count }, (_, i) => ({
    exchange: 'test',
    symbol: 'TEST/USDT',
    timeframe: '1m' as const,
    timestamp: 1000 + i * 60_000,
    open: base + i,
    high: base + i + 2,
    low: base + i - 1,
    close: base + i + 1,
    volume: 100,
    buyVolume: 60,
    sellVolume: 40,
    tradeCount: 10,
    closed: true,
  }));
}

describe('computeMarketProfile edge cases', () => {
  describe('tickSize validation', () => {
    it('should throw RangeError for tickSize = 0', () => {
      const candles = makeCandles(5);
      expect(() => computeMarketProfile(candles, 0)).toThrow(RangeError);
    });

    it('should throw RangeError for negative tickSize', () => {
      const candles = makeCandles(5);
      expect(() => computeMarketProfile(candles, -1)).toThrow(RangeError);
    });

    it('should include tickSize value in error message', () => {
      const candles = makeCandles(5);
      try {
        computeMarketProfile(candles, -5);
      } catch (e) {
        expect((e as Error).message).toContain('-5');
      }
    });

    it('should accept small positive tickSize', () => {
      const candles = makeCandles(3);
      expect(() => computeMarketProfile(candles, 0.01)).not.toThrow();
    });
  });

  describe('empty candles', () => {
    it('should return empty profile for empty candle array', () => {
      const result = computeMarketProfile([], 1);
      expect(result.rows).toHaveLength(0);
      expect(result.sessionStart).toBe(0);
      expect(result.sessionEnd).toBe(0);
    });
  });

  describe('single candle', () => {
    it('should produce valid profile from single candle', () => {
      const candles = makeCandles(1, 100, 1);
      const result = computeMarketProfile(candles, 1);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.poc).toBeGreaterThan(0);
      expect(result.sessionStart).toBe(candles[0]!.timestamp);
      expect(result.sessionEnd).toBe(candles[0]!.timestamp);
    });
  });

  describe('value area', () => {
    it('should compute POC as the level with highest TPO count', () => {
      const candles = makeCandles(20, 100, 1);
      const result = computeMarketProfile(candles, 1);

      // POC should be within the price range
      expect(result.poc).toBeGreaterThanOrEqual(result.low);
      expect(result.poc).toBeLessThanOrEqual(result.high);
    });

    it('should compute VAH >= POC >= VAL', () => {
      const candles = makeCandles(20, 100, 1);
      const result = computeMarketProfile(candles, 1);

      expect(result.vah).toBeGreaterThanOrEqual(result.poc);
      expect(result.poc).toBeGreaterThanOrEqual(result.val);
    });

    it('should respect custom valueAreaPercent', () => {
      const candles = makeCandles(20, 100, 1);
      const narrow = computeMarketProfile(candles, 1, 0.3);
      const wide = computeMarketProfile(candles, 1, 0.9);

      // Wider value area should have >= range
      const narrowRange = narrow.vah - narrow.val;
      const wideRange = wide.vah - wide.val;
      expect(wideRange).toBeGreaterThanOrEqual(narrowRange);
    });
  });

  describe('initial balance', () => {
    it('should compute IB within first ibPeriodMinutes', () => {
      const candles = makeCandles(120, 100); // 120 1-minute candles
      const result = computeMarketProfile(candles, 1, 0.7, 60);

      // IB should be within global range
      expect(result.ibHigh).toBeLessThanOrEqual(result.high);
      expect(result.ibLow).toBeGreaterThanOrEqual(result.low);
    });

    it('should handle ibPeriodMinutes=0 (no IB candles)', () => {
      const candles = makeCandles(10, 100);
      const result = computeMarketProfile(candles, 1, 0.7, 0);

      // When no candles are in IB period, IB should default to global range
      expect(result.ibHigh).toBe(result.high);
      expect(result.ibLow).toBe(result.low);
    });
  });

  describe('large tickSize', () => {
    it('should produce fewer rows with larger tickSize', () => {
      const candles = makeCandles(10, 100);
      const small = computeMarketProfile(candles, 0.5);
      const large = computeMarketProfile(candles, 5);

      expect(large.rows.length).toBeLessThanOrEqual(small.rows.length);
    });
  });
});
