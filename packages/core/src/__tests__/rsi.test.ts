import { describe, it, expect } from 'vitest';
import type { OHLCVCandle } from '@terminal/types';
import { computeRSI } from '../indicators/rsi.js';

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

describe('computeRSI', () => {
  it('should return null for first period points', () => {
    const closes = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
      45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64];
    const candles = makeCandles(closes);
    const result = computeRSI(candles, 14);

    // First 14 points (indices 0-13) should be null
    for (let i = 0; i < 14; i++) {
      expect(result[i]!.data.value).toBeNull();
    }
    // Index 14 should have a value
    expect(result[14]!.data.value).not.toBeNull();
  });

  it('should return values between 0 and 100', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i * 0.5) * 10);
    const candles = makeCandles(closes);
    const result = computeRSI(candles, 14);

    for (const point of result) {
      if (point.data.value !== null) {
        expect(point.data.value).toBeGreaterThanOrEqual(0);
        expect(point.data.value).toBeLessThanOrEqual(100);
      }
    }
  });

  it('should return 100 when all moves are up', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const candles = makeCandles(closes);
    const result = computeRSI(candles, 14);

    // When all gains, RSI = 100
    expect(result[14]!.data.value).toBeCloseTo(100);
  });

  it('should return low RSI when all moves are down', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 - i);
    const candles = makeCandles(closes);
    const result = computeRSI(candles, 14);

    // When all losses, RSI approaches 0
    expect(result[14]!.data.value!).toBeLessThan(1);
  });

  it('should handle empty input', () => {
    const result = computeRSI([], 14);
    expect(result).toHaveLength(0);
  });

  it('should handle fewer candles than period', () => {
    const candles = makeCandles([10, 20, 30]);
    const result = computeRSI(candles, 14);

    expect(result).toHaveLength(3);
    expect(result[0]!.data.value).toBeNull();
    expect(result[1]!.data.value).toBeNull();
    expect(result[2]!.data.value).toBeNull();
  });
});
