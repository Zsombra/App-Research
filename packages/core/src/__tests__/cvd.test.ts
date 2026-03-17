import { describe, it, expect } from 'vitest';
import type { OHLCVCandle } from '@terminal/types';
import { computeCVD } from '../indicators/cvd.js';

function makeCandles(data: { close: number; buyVol: number; sellVol: number }[]): OHLCVCandle[] {
  return data.map((d, i) => ({
    exchange: 'test',
    symbol: 'TEST/USDT',
    timeframe: '1m',
    timestamp: 1000 + i * 60000,
    open: d.close,
    high: d.close + 1,
    low: d.close - 1,
    close: d.close,
    volume: d.buyVol + d.sellVol,
    buyVolume: d.buyVol,
    sellVolume: d.sellVol,
    tradeCount: 10,
    closed: true,
  }));
}

describe('computeCVD', () => {
  it('should compute cumulative volume delta', () => {
    const candles = makeCandles([
      { close: 100, buyVol: 10, sellVol: 5 },   // delta=+5, cvd=5
      { close: 101, buyVol: 8, sellVol: 12 },    // delta=-4, cvd=1
      { close: 102, buyVol: 15, sellVol: 3 },    // delta=+12, cvd=13
    ]);
    const result = computeCVD(candles);

    expect(result).toHaveLength(3);
    expect(result[0]!.data.delta).toBeCloseTo(5);
    expect(result[0]!.data.value).toBeCloseTo(5);
    expect(result[1]!.data.delta).toBeCloseTo(-4);
    expect(result[1]!.data.value).toBeCloseTo(1);
    expect(result[2]!.data.delta).toBeCloseTo(12);
    expect(result[2]!.data.value).toBeCloseTo(13);
  });

  it('should return zero delta when buy equals sell', () => {
    const candles = makeCandles([
      { close: 100, buyVol: 10, sellVol: 10 },
      { close: 101, buyVol: 5, sellVol: 5 },
    ]);
    const result = computeCVD(candles);

    expect(result[0]!.data.delta).toBeCloseTo(0);
    expect(result[0]!.data.value).toBeCloseTo(0);
    expect(result[1]!.data.delta).toBeCloseTo(0);
    expect(result[1]!.data.value).toBeCloseTo(0);
  });

  it('should track negative cumulative correctly', () => {
    const candles = makeCandles([
      { close: 100, buyVol: 2, sellVol: 10 },   // delta=-8, cvd=-8
      { close: 99, buyVol: 3, sellVol: 8 },     // delta=-5, cvd=-13
      { close: 98, buyVol: 1, sellVol: 6 },     // delta=-5, cvd=-18
    ]);
    const result = computeCVD(candles);

    expect(result[0]!.data.value).toBeCloseTo(-8);
    expect(result[1]!.data.value).toBeCloseTo(-13);
    expect(result[2]!.data.value).toBeCloseTo(-18);
  });

  it('should preserve timestamps', () => {
    const candles = makeCandles([{ close: 100, buyVol: 10, sellVol: 5 }]);
    const result = computeCVD(candles);
    expect(result[0]!.timestamp).toBe(candles[0]!.timestamp);
  });

  it('should handle empty input', () => {
    const result = computeCVD([]);
    expect(result).toHaveLength(0);
  });
});
