import { describe, it, expect } from 'vitest';
import type { OHLCVCandle } from '@terminal/types';
import { computeMACD } from '../indicators/macd.js';

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

describe('computeMACD edge cases', () => {
  // -------------------------------------------------------------------------
  // Period validation
  // -------------------------------------------------------------------------
  describe('period validation', () => {
    it('should throw RangeError when fastPeriod < 1', () => {
      const candles = makeCandles([10, 20, 30]);
      expect(() => computeMACD(candles, 0, 26, 9)).toThrow(RangeError);
    });

    it('should throw RangeError when slowPeriod < 1', () => {
      const candles = makeCandles([10, 20, 30]);
      expect(() => computeMACD(candles, 12, 0, 9)).toThrow(RangeError);
    });

    it('should throw RangeError when signalPeriod < 1', () => {
      const candles = makeCandles([10, 20, 30]);
      expect(() => computeMACD(candles, 12, 26, 0)).toThrow(RangeError);
    });

    it('should throw RangeError when all periods are negative', () => {
      const candles = makeCandles([10, 20, 30]);
      expect(() => computeMACD(candles, -1, -1, -1)).toThrow(RangeError);
    });

    it('should accept period = 1', () => {
      const candles = makeCandles([10, 20, 30]);
      expect(() => computeMACD(candles, 1, 1, 1)).not.toThrow();
    });

    it('should include period values in error message', () => {
      const candles = makeCandles([10, 20, 30]);
      try {
        computeMACD(candles, 0, 26, 9);
      } catch (e) {
        expect((e as Error).message).toContain('fast=0');
        expect((e as Error).message).toContain('slow=26');
        expect((e as Error).message).toContain('signal=9');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Empty and minimal inputs
  // -------------------------------------------------------------------------
  describe('empty and minimal inputs', () => {
    it('should handle empty candles array', () => {
      const result = computeMACD([], 12, 26, 9);
      expect(result).toHaveLength(0);
    });

    it('should return all nulls when fewer candles than slowPeriod', () => {
      const candles = makeCandles([10, 20, 30, 40, 50]);
      const result = computeMACD(candles, 12, 26, 9);

      for (const point of result) {
        expect(point.data.macd).toBeNull();
        expect(point.data.signal).toBeNull();
        expect(point.data.histogram).toBeNull();
      }
    });

    it('should produce non-null macd after slowPeriod candles', () => {
      const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
      const candles = makeCandles(closes);
      const result = computeMACD(candles, 12, 26, 9);

      // After slowPeriod (26) candles, macd line should be available
      expect(result[25]!.data.macd).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // MACD properties
  // -------------------------------------------------------------------------
  describe('MACD properties', () => {
    it('should have histogram = macd - signal when both are available', () => {
      const closes = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 10);
      const candles = makeCandles(closes);
      const result = computeMACD(candles, 12, 26, 9);

      for (const point of result) {
        if (point.data.macd !== null && point.data.signal !== null) {
          expect(point.data.histogram).toBeCloseTo(point.data.macd - point.data.signal);
        }
      }
    });

    it('should preserve timestamps', () => {
      const closes = Array.from({ length: 40 }, (_, i) => 100 + i);
      const candles = makeCandles(closes);
      const result = computeMACD(candles, 12, 26, 9);

      for (let i = 0; i < candles.length; i++) {
        expect(result[i]!.timestamp).toBe(candles[i]!.timestamp);
      }
    });

    it('should produce zero macd for constant prices after convergence', () => {
      // Constant prices → fast EMA = slow EMA → MACD ≈ 0
      const closes = Array.from({ length: 50 }, () => 100);
      const candles = makeCandles(closes);
      const result = computeMACD(candles, 12, 26, 9);

      // After both EMAs have converged, MACD should be ~0
      const lastPoint = result[result.length - 1]!;
      if (lastPoint.data.macd !== null) {
        expect(lastPoint.data.macd).toBeCloseTo(0, 5);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Custom period combinations
  // -------------------------------------------------------------------------
  describe('custom period combinations', () => {
    it('should work with fast=1, slow=2, signal=1', () => {
      const candles = makeCandles([10, 20, 30, 40, 50]);
      const result = computeMACD(candles, 1, 2, 1);

      // Should produce values after slowPeriod (2) candles
      expect(result[1]!.data.macd).not.toBeNull();
    });

    it('should work when fast equals slow', () => {
      const candles = makeCandles([10, 20, 30, 40, 50]);
      const result = computeMACD(candles, 3, 3, 2);

      // When fast == slow, MACD line should be 0
      for (const point of result) {
        if (point.data.macd !== null) {
          expect(point.data.macd).toBeCloseTo(0);
        }
      }
    });
  });
});
