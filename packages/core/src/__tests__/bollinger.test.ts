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

describe('computeBollinger', () => {
  it('should return null for first period-1 points', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = computeBollinger(candles, 3, 2);

    expect(result[0]!.data.upper).toBeNull();
    expect(result[0]!.data.middle).toBeNull();
    expect(result[0]!.data.lower).toBeNull();
    expect(result[1]!.data.upper).toBeNull();
    expect(result[2]!.data.upper).not.toBeNull();
  });

  it('should have middle band equal to SMA', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = computeBollinger(candles, 3, 2);

    // Middle at index 2: SMA(3) = (10+20+30)/3 = 20
    expect(result[2]!.data.middle).toBeCloseTo(20);
    // Middle at index 3: SMA(3) = (20+30+40)/3 = 30
    expect(result[3]!.data.middle).toBeCloseTo(30);
    // Middle at index 4: SMA(3) = (30+40+50)/3 = 40
    expect(result[4]!.data.middle).toBeCloseTo(40);
  });

  it('should have upper > middle > lower', () => {
    const candles = makeCandles([10, 20, 30, 40, 50, 35, 45, 25]);
    const result = computeBollinger(candles, 3, 2);

    for (const point of result) {
      if (point.data.upper !== null) {
        expect(point.data.upper).toBeGreaterThan(point.data.middle!);
        expect(point.data.middle!).toBeGreaterThan(point.data.lower!);
      }
    }
  });

  it('should have symmetric bands around middle', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = computeBollinger(candles, 3, 2);

    for (const point of result) {
      if (point.data.upper !== null) {
        const upperDist = point.data.upper - point.data.middle!;
        const lowerDist = point.data.middle! - point.data.lower!;
        expect(upperDist).toBeCloseTo(lowerDist);
      }
    }
  });

  it('should have zero-width bands for constant prices', () => {
    const candles = makeCandles([100, 100, 100, 100, 100]);
    const result = computeBollinger(candles, 3, 2);

    // Constant prices → stddev = 0 → upper = middle = lower
    expect(result[2]!.data.upper).toBeCloseTo(100);
    expect(result[2]!.data.middle).toBeCloseTo(100);
    expect(result[2]!.data.lower).toBeCloseTo(100);
  });

  it('should handle empty input', () => {
    const result = computeBollinger([], 20, 2);
    expect(result).toHaveLength(0);
  });

  it('should respect stdDev multiplier', () => {
    const candles = makeCandles([10, 20, 30]);
    const result1 = computeBollinger(candles, 3, 1);
    const result2 = computeBollinger(candles, 3, 2);

    const bandwidth1 = result1[2]!.data.upper! - result1[2]!.data.middle!;
    const bandwidth2 = result2[2]!.data.upper! - result2[2]!.data.middle!;

    // 2x stdDev should give 2x bandwidth
    expect(bandwidth2).toBeCloseTo(bandwidth1 * 2);
  });

  it('should widen bands during high volatility', () => {
    const stable = makeCandles([100, 100, 100, 100, 100]);
    const volatile = makeCandles([80, 120, 80, 120, 80]);
    const stableResult = computeBollinger(stable, 3, 2);
    const volatileResult = computeBollinger(volatile, 3, 2);

    const stableBW = stableResult[2]!.data.upper! - stableResult[2]!.data.lower!;
    const volatileBW = volatileResult[2]!.data.upper! - volatileResult[2]!.data.lower!;
    expect(volatileBW).toBeGreaterThan(stableBW);
  });

  it('should handle period=1 (bands collapse to price)', () => {
    const candles = makeCandles([100, 200, 300]);
    const result = computeBollinger(candles, 1, 2);
    // With period=1, SMA=close, stddev=0
    expect(result[0]!.data.middle).toBeCloseTo(100);
    expect(result[0]!.data.upper).toBeCloseTo(100);
    expect(result[0]!.data.lower).toBeCloseTo(100);
  });
});
