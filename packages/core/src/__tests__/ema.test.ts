import { describe, it, expect } from 'vitest';
import type { OHLCVCandle } from '@terminal/types';
import { computeEMA } from '../indicators/ema.js';

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

describe('computeEMA', () => {
  it('should return null for first period-1 points', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = computeEMA(candles, 3);

    expect(result[0]!.data.value).toBeNull();
    expect(result[1]!.data.value).toBeNull();
    expect(result[2]!.data.value).not.toBeNull();
  });

  it('should seed with SMA for first valid value', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = computeEMA(candles, 3);

    // EMA seed = SMA(3) = (10+20+30)/3 = 20
    expect(result[2]!.data.value).toBeCloseTo(20);
  });

  it('should apply EMA formula after seed', () => {
    const candles = makeCandles([10, 20, 30, 40, 50]);
    const result = computeEMA(candles, 3);
    const mult = 2 / (3 + 1); // 0.5

    // EMA at index 2: SMA = 20
    const ema2 = 20;
    // EMA at index 3: (40 - 20) * 0.5 + 20 = 30
    const ema3 = (40 - ema2) * mult + ema2;
    expect(result[3]!.data.value).toBeCloseTo(ema3);

    // EMA at index 4: (50 - 30) * 0.5 + 30 = 40
    const ema4 = (50 - ema3) * mult + ema3;
    expect(result[4]!.data.value).toBeCloseTo(ema4);
  });

  it('should handle period=1 (returns close price)', () => {
    const candles = makeCandles([100, 200, 300]);
    const result = computeEMA(candles, 1);

    expect(result[0]!.data.value).toBeCloseTo(100);
    // EMA(1) with multiplier=1: always equals current close
    expect(result[1]!.data.value).toBeCloseTo(200);
    expect(result[2]!.data.value).toBeCloseTo(300);
  });

  it('should handle empty input', () => {
    const result = computeEMA([], 3);
    expect(result).toHaveLength(0);
  });
});
