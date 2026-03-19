import { describe, it, expect } from 'vitest';
import type { OHLCVCandle } from '@terminal/types';
import { computeBollinger } from '../indicators/bollinger.js';

function makeCandles(closes: number[]): OHLCVCandle[] {
  return closes.map((close, i) => ({
    exchange: 'test',
    symbol: 'TEST/USDT',
    timeframe: '1m',
    timestamp: 1000 + i * 60000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
    buyVolume: 50,
    sellVolume: 50,
    tradeCount: 10,
    closed: true,
  }));
}

describe('computeBollinger edge cases', () => {
  describe('period validation', () => {
    it('should throw RangeError for period = 0', () => {
      const candles = makeCandles([10, 20, 30]);
      expect(() => computeBollinger(candles, 0, 2)).toThrow(RangeError);
    });

    it('should throw RangeError for negative period', () => {
      const candles = makeCandles([10, 20, 30]);
      expect(() => computeBollinger(candles, -5, 2)).toThrow(RangeError);
    });

    it('should include period value in error message', () => {
      const candles = makeCandles([10, 20, 30]);
      try {
        computeBollinger(candles, -3, 2);
      } catch (e) {
        expect((e as Error).message).toContain('-3');
      }
    });

    it('should accept period = 1', () => {
      const candles = makeCandles([10, 20, 30]);
      expect(() => computeBollinger(candles, 1, 2)).not.toThrow();
    });
  });

  describe('stdDev multiplier', () => {
    it('should handle stdDev = 0 (bands collapse to SMA)', () => {
      const candles = makeCandles([10, 20, 30, 40, 50]);
      const result = computeBollinger(candles, 3, 0);

      for (const point of result) {
        if (point.data.middle !== null) {
          expect(point.data.upper).toBe(point.data.middle);
          expect(point.data.lower).toBe(point.data.middle);
        }
      }
    });

    it('should handle negative stdDev (inverted bands)', () => {
      const candles = makeCandles([10, 20, 30, 40, 50]);
      const result = computeBollinger(candles, 3, -2);

      // With negative stdDev, upper < middle < lower
      for (const point of result) {
        if (point.data.upper !== null && point.data.middle !== null) {
          // Bands should be inverted relative to positive stdDev
          const positiveResult = computeBollinger(candles, 3, 2);
          const posPoint = positiveResult[result.indexOf(point)]!;
          if (posPoint.data.upper !== null) {
            // Negative stdDev flips the bands
            expect(point.data.upper).toBeCloseTo(posPoint.data.lower!);
            expect(point.data.lower).toBeCloseTo(posPoint.data.upper!);
          }
        }
      }
    });

    it('should scale bandwidth linearly with stdDev', () => {
      const candles = makeCandles([10, 20, 30, 40, 50]);
      const result1 = computeBollinger(candles, 3, 1);
      const result3 = computeBollinger(candles, 3, 3);

      const bw1 = result1[2]!.data.upper! - result1[2]!.data.middle!;
      const bw3 = result3[2]!.data.upper! - result3[2]!.data.middle!;

      expect(bw3).toBeCloseTo(bw1 * 3);
    });
  });

  describe('large datasets', () => {
    it('should handle 1000 candles without error', () => {
      const closes = Array.from({ length: 1000 }, (_, i) => 100 + Math.sin(i / 20) * 50);
      const candles = makeCandles(closes);
      const result = computeBollinger(candles, 20, 2);

      expect(result).toHaveLength(1000);
      // First 19 should be null, rest should have values
      for (let i = 0; i < 19; i++) {
        expect(result[i]!.data.middle).toBeNull();
      }
      for (let i = 19; i < 1000; i++) {
        expect(result[i]!.data.middle).not.toBeNull();
        expect(result[i]!.data.upper).not.toBeNull();
        expect(result[i]!.data.lower).not.toBeNull();
      }
    });
  });
});
