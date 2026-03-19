import { describe, it, expect } from 'vitest';
import type { OHLCVCandle } from '@terminal/types';
import { computeSMA } from '../indicators/sma.js';

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

describe('computeSMA', () => {
  it('should return null for first period-1 points', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = computeSMA(candles, 3);

    expect(result[0]!.data.value).toBeNull();
    expect(result[1]!.data.value).toBeNull();
    expect(result[2]!.data.value).not.toBeNull();
  });

  it('should compute correct SMA values', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = computeSMA(candles, 3);

    // SMA(3) at index 2: (10+20+30)/3 = 20
    expect(result[2]!.data.value).toBeCloseTo(20);
    // SMA(3) at index 3: (20+30+40)/3 = 30
    expect(result[3]!.data.value).toBeCloseTo(30);
    // SMA(3) at index 4: (30+40+50)/3 = 40
    expect(result[4]!.data.value).toBeCloseTo(40);
  });

  it('should handle period=1 (returns close price)', () => {
    const candles = makeCandles([100, 200, 300]);
    const result = computeSMA(candles, 1);

    expect(result[0]!.data.value).toBeCloseTo(100);
    expect(result[1]!.data.value).toBeCloseTo(200);
    expect(result[2]!.data.value).toBeCloseTo(300);
  });

  it('should preserve timestamps', () => {
    const candles = makeCandles([10, 20, 30]);
    const result = computeSMA(candles, 2);

    expect(result[0]!.timestamp).toBe(candles[0]!.timestamp);
    expect(result[1]!.timestamp).toBe(candles[1]!.timestamp);
    expect(result[2]!.timestamp).toBe(candles[2]!.timestamp);
  });

  it('should handle empty input', () => {
    const result = computeSMA([], 3);
    expect(result).toHaveLength(0);
  });

  it('should return all nulls when fewer candles than period', () => {
    const candles = makeCandles([10, 20]);
    const result = computeSMA(candles, 5);

    expect(result[0]!.data.value).toBeNull();
    expect(result[1]!.data.value).toBeNull();
  });

  it('should throw RangeError for period < 1', () => {
    const candles = makeCandles([10, 20, 30]);
    expect(() => computeSMA(candles, 0)).toThrow(RangeError);
    expect(() => computeSMA(candles, -1)).toThrow(RangeError);
  });

  it('should handle single candle with period=1', () => {
    const candles = makeCandles([42]);
    const result = computeSMA(candles, 1);
    expect(result).toHaveLength(1);
    expect(result[0]!.data.value).toBeCloseTo(42);
  });

  it('should produce correct SMA with large period equal to candle count', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = computeSMA(candles, 5);
    // Only last point should have a value: avg = 30
    for (let i = 0; i < 4; i++) {
      expect(result[i]!.data.value).toBeNull();
    }
    expect(result[4]!.data.value).toBeCloseTo(30);
  });
});
