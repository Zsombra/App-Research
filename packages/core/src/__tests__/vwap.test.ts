import { describe, it, expect } from 'vitest';
import type { OHLCVCandle } from '@terminal/types';
import { computeVWAP } from '../indicators/vwap.js';

function makeCandles(
  data: { high: number; low: number; close: number; volume: number }[],
  startTimestamp?: number
): OHLCVCandle[] {
  const start = startTimestamp ?? 1700000000000; // Fixed date within a single day
  return data.map((d, i) => ({
    exchange: 'test',
    symbol: 'TEST/USDT',
    timeframe: '1m',
    timestamp: start + i * 60000,
    open: d.close,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume,
    buyVolume: d.volume / 2,
    sellVolume: d.volume / 2,
    tradeCount: 10,
    closed: true,
  }));
}

describe('computeVWAP', () => {
  it('should compute VWAP as volume-weighted typical price', () => {
    const candles = makeCandles([
      { high: 105, low: 95, close: 100, volume: 100 }, // tp = (105+95+100)/3 = 100
      { high: 115, low: 105, close: 110, volume: 200 }, // tp = (115+105+110)/3 = 110
    ]);
    const result = computeVWAP(candles);

    // After candle 0: VWAP = 100*100/100 = 100
    expect(result[0]!.data.vwap).toBeCloseTo(100);

    // After candle 1: VWAP = (100*100 + 110*200) / (100+200) = 32000/300 = 106.67
    expect(result[1]!.data.vwap).toBeCloseTo(106.667, 2);
  });

  it('should have upper > vwap > lower', () => {
    const candles = makeCandles([
      { high: 105, low: 95, close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98, close: 103, volume: 150 },
    ]);
    const result = computeVWAP(candles);

    // After multiple candles with different prices, bands should exist
    const last = result[2]!;
    expect(last.data.upper).not.toBeNull();
    expect(last.data.lower).not.toBeNull();
    expect(last.data.upper!).toBeGreaterThanOrEqual(last.data.vwap!);
    expect(last.data.lower!).toBeLessThanOrEqual(last.data.vwap!);
  });

  it('should have zero-width bands for constant prices', () => {
    const candles = makeCandles([
      { high: 100, low: 100, close: 100, volume: 100 },
      { high: 100, low: 100, close: 100, volume: 200 },
    ]);
    const result = computeVWAP(candles);

    expect(result[1]!.data.vwap).toBeCloseTo(100);
    expect(result[1]!.data.upper).toBeCloseTo(100);
    expect(result[1]!.data.lower).toBeCloseTo(100);
  });

  it('should reset at day boundary (UTC)', () => {
    // Create candles spanning midnight UTC
    const dayStart = 1700006400000; // Some UTC midnight
    const candles = makeCandles(
      [
        { high: 105, low: 95, close: 100, volume: 100 },
        { high: 115, low: 105, close: 110, volume: 200 },
      ],
      dayStart - 60000 // Start 1 minute before midnight
    );

    const result = computeVWAP(candles);

    // Second candle should have its own fresh VWAP (reset at day boundary)
    const tp1 = (candles[1]!.high + candles[1]!.low + candles[1]!.close) / 3;
    expect(result[1]!.data.vwap).toBeCloseTo(tp1);
  });

  it('should handle zero-volume candles', () => {
    const candles = makeCandles([
      { high: 100, low: 100, close: 100, volume: 0 },
    ]);
    const result = computeVWAP(candles);
    expect(result[0]!.data.vwap).toBeNull();
  });

  it('should handle empty input', () => {
    const result = computeVWAP([]);
    expect(result).toHaveLength(0);
  });

  it('should produce symmetric bands', () => {
    const candles = makeCandles([
      { high: 105, low: 95, close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98, close: 103, volume: 150 },
    ]);
    const result = computeVWAP(candles);
    const last = result[2]!;

    if (last.data.upper !== null && last.data.lower !== null && last.data.vwap !== null) {
      const upperDist = last.data.upper - last.data.vwap;
      const lowerDist = last.data.vwap - last.data.lower;
      expect(upperDist).toBeCloseTo(lowerDist);
    }
  });
});
