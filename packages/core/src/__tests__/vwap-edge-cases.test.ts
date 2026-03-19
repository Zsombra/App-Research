import { describe, it, expect } from 'vitest';
import type { OHLCVCandle } from '@terminal/types';
import { computeVWAP } from '../indicators/vwap.js';

function makeCandles(data: Array<{ high: number; low: number; close: number; volume: number; ts?: number }>): OHLCVCandle[] {
  return data.map((d, i) => ({
    exchange: 'test',
    symbol: 'TEST/USDT',
    timeframe: '1m' as const,
    timestamp: d.ts ?? (86_400_000 + i * 60_000), // Start at day 1 boundary
    open: d.close,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume,
    buyVolume: d.volume * 0.6,
    sellVolume: d.volume * 0.4,
    tradeCount: 10,
    closed: true,
  }));
}

describe('computeVWAP edge cases', () => {
  describe('empty input', () => {
    it('should return empty array for empty candles', () => {
      expect(computeVWAP([])).toHaveLength(0);
    });
  });

  describe('zero volume handling', () => {
    it('should return null VWAP for candles with zero volume', () => {
      const candles = makeCandles([
        { high: 110, low: 90, close: 100, volume: 0 },
        { high: 115, low: 95, close: 105, volume: 0 },
      ]);
      const result = computeVWAP(candles);

      expect(result[0]!.data.vwap).toBeNull();
      expect(result[1]!.data.vwap).toBeNull();
    });

    it('should resume VWAP when volume appears after zero-volume candles', () => {
      const candles = makeCandles([
        { high: 110, low: 90, close: 100, volume: 0 },
        { high: 115, low: 95, close: 105, volume: 100 },
      ]);
      const result = computeVWAP(candles);

      expect(result[0]!.data.vwap).toBeNull();
      expect(result[1]!.data.vwap).not.toBeNull();
    });

    it('should handle near-zero volume correctly', () => {
      const candles = makeCandles([
        { high: 110, low: 90, close: 100, volume: 1e-16 },
      ]);
      const result = computeVWAP(candles);

      // Near-zero volume should produce null VWAP due to epsilon guard
      expect(result[0]!.data.vwap).toBeNull();
    });
  });

  describe('day boundary reset', () => {
    it('should reset VWAP at UTC day boundary', () => {
      const day1Start = 86_400_000; // Day 1
      const day2Start = 86_400_000 * 2; // Day 2

      const candles = makeCandles([
        { high: 110, low: 90, close: 100, volume: 100, ts: day1Start },
        { high: 115, low: 95, close: 105, volume: 200, ts: day1Start + 60_000 },
        { high: 120, low: 100, close: 110, volume: 50, ts: day2Start }, // New day
      ]);

      const result = computeVWAP(candles);

      // Day 2 VWAP should reset; it should be the typical price of the 3rd candle only
      const tp3 = (120 + 100 + 110) / 3;
      expect(result[2]!.data.vwap).toBeCloseTo(tp3);
    });
  });

  describe('VWAP properties', () => {
    it('should have upper >= vwap >= lower', () => {
      const candles = makeCandles([
        { high: 110, low: 90, close: 100, volume: 100 },
        { high: 115, low: 95, close: 105, volume: 200 },
        { high: 120, low: 80, close: 95, volume: 150 },
      ]);
      const result = computeVWAP(candles);

      for (const point of result) {
        if (point.data.vwap !== null) {
          expect(point.data.upper).toBeGreaterThanOrEqual(point.data.vwap!);
          expect(point.data.lower).toBeLessThanOrEqual(point.data.vwap!);
        }
      }
    });

    it('should converge to typical price for single candle', () => {
      const candles = makeCandles([
        { high: 110, low: 90, close: 100, volume: 100 },
      ]);
      const result = computeVWAP(candles);

      const tp = (110 + 90 + 100) / 3;
      expect(result[0]!.data.vwap).toBeCloseTo(tp);
    });

    it('should weight higher-volume candles more', () => {
      // Candle 1: tp = 100, volume = 1
      // Candle 2: tp = 200, volume = 1000
      // VWAP should be much closer to 200
      const candles = makeCandles([
        { high: 110, low: 90, close: 100, volume: 1 },
        { high: 210, low: 190, close: 200, volume: 1000 },
      ]);
      const result = computeVWAP(candles);

      const vwap = result[1]!.data.vwap!;
      const tp2 = (210 + 190 + 200) / 3;
      // VWAP should be much closer to tp2 than tp1
      expect(vwap).toBeGreaterThan(190);
      expect(Math.abs(vwap - tp2)).toBeLessThan(10);
    });

    it('should preserve timestamps', () => {
      const candles = makeCandles([
        { high: 110, low: 90, close: 100, volume: 100 },
        { high: 115, low: 95, close: 105, volume: 200 },
      ]);
      const result = computeVWAP(candles);

      expect(result[0]!.timestamp).toBe(candles[0]!.timestamp);
      expect(result[1]!.timestamp).toBe(candles[1]!.timestamp);
    });
  });

  describe('bands', () => {
    it('should have zero-width bands for single candle', () => {
      const candles = makeCandles([
        { high: 100, low: 100, close: 100, volume: 100 },
      ]);
      const result = computeVWAP(candles);

      expect(result[0]!.data.upper).toBeCloseTo(result[0]!.data.vwap!);
      expect(result[0]!.data.lower).toBeCloseTo(result[0]!.data.vwap!);
    });

    it('should widen bands with price variance', () => {
      const candles = makeCandles([
        { high: 100, low: 100, close: 100, volume: 100 },
        { high: 200, low: 200, close: 200, volume: 100 },
      ]);
      const result = computeVWAP(candles);

      const bandwidth = result[1]!.data.upper! - result[1]!.data.lower!;
      expect(bandwidth).toBeGreaterThan(0);
    });
  });
});
