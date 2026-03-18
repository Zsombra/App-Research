import { describe, it, expect } from 'vitest';
import type { OHLCVCandle } from '@terminal/types';
import { computeAnchoredVWAP, computeRollingVWAP } from '../indicators/vwap-extended.js';

function makeCandles(
  data: { high: number; low: number; close: number; volume: number }[],
  startTimestamp?: number
): OHLCVCandle[] {
  const start = startTimestamp ?? 1700000000000;
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

// ---------------------------------------------------------------------------
// computeAnchoredVWAP
// ---------------------------------------------------------------------------

describe('computeAnchoredVWAP', () => {
  it('should return null data for candles before the anchor index', () => {
    // anchor = 2, so indices 0 and 1 must be null
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98,  close: 103, volume: 150 },
    ]);
    const result = computeAnchoredVWAP(candles, 2);

    expect(result[0]!.data.vwap).toBeNull();
    expect(result[0]!.data.upper).toBeNull();
    expect(result[0]!.data.lower).toBeNull();

    expect(result[1]!.data.vwap).toBeNull();
    expect(result[1]!.data.upper).toBeNull();
    expect(result[1]!.data.lower).toBeNull();
  });

  it('should preserve timestamps for candles before the anchor index', () => {
    const start = 1700000000000;
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98,  close: 103, volume: 150 },
    ], start);
    const result = computeAnchoredVWAP(candles, 2);

    expect(result[0]!.timestamp).toBe(start);
    expect(result[1]!.timestamp).toBe(start + 60000);
  });

  it('should compute VWAP from the anchor point forward', () => {
    // anchor = 1, so index 0 is null; indices 1 and 2 accumulate from index 1
    //   candle 1: tp = (115+105+110)/3 = 110,  vol = 200
    //     cumPV = 110*200 = 22000, cumV = 200 → vwap = 110
    //   candle 2: tp = (108+98+103)/3  = 103,  vol = 150
    //     cumPV = 22000 + 103*150 = 22000+15450 = 37450
    //     cumV  = 350 → vwap = 37450/350 ≈ 107
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98,  close: 103, volume: 150 },
    ]);
    const result = computeAnchoredVWAP(candles, 1);

    expect(result[0]!.data.vwap).toBeNull();
    expect(result[1]!.data.vwap).toBeCloseTo(110);
    expect(result[2]!.data.vwap).toBeCloseTo(37450 / 350, 5);
  });

  it('should include standard deviation bands after the anchor point', () => {
    // With two distinct typical prices the variance is non-zero, so bands
    // must be strictly wider than zero.
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98,  close: 103, volume: 150 },
    ]);
    const result = computeAnchoredVWAP(candles, 0);

    const last = result[2]!;
    expect(last.data.upper).not.toBeNull();
    expect(last.data.lower).not.toBeNull();
    expect(last.data.upper!).toBeGreaterThan(last.data.vwap!);
    expect(last.data.lower!).toBeLessThan(last.data.vwap!);
  });

  it('should produce symmetric bands (upper - vwap === vwap - lower)', () => {
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98,  close: 103, volume: 150 },
    ]);
    const result = computeAnchoredVWAP(candles, 0);

    const last = result[2]!;
    const { vwap, upper, lower } = last.data;
    if (vwap !== null && upper !== null && lower !== null) {
      expect(upper - vwap).toBeCloseTo(vwap - lower, 10);
    }
  });

  it('should work with anchor at index 0 (accumulates all candles, no daily reset)', () => {
    // Same two-candle scenario used in the vwap.test.ts "volume-weighted" case.
    // anchor = 0 means every candle is included from the start.
    //   candle 0: tp = (105+95+100)/3 = 100,  vol = 100
    //   candle 1: tp = (115+105+110)/3 = 110,  vol = 200
    //   After candle 1: vwap = (100*100 + 110*200) / 300 = 32000/300 ≈ 106.667
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
    ]);
    const result = computeAnchoredVWAP(candles, 0);

    expect(result[0]!.data.vwap).toBeCloseTo(100);
    expect(result[1]!.data.vwap).toBeCloseTo(106.667, 2);
  });

  it('should have zero-width bands when anchor is at index 0 with constant prices', () => {
    // All typical prices equal → variance = 0 → sd = 0 → upper = lower = vwap
    const candles = makeCandles([
      { high: 100, low: 100, close: 100, volume: 100 },
      { high: 100, low: 100, close: 100, volume: 200 },
    ]);
    const result = computeAnchoredVWAP(candles, 0);

    expect(result[1]!.data.vwap).toBeCloseTo(100);
    expect(result[1]!.data.upper).toBeCloseTo(100);
    expect(result[1]!.data.lower).toBeCloseTo(100);
  });

  it('should work with anchor at the last candle (only that candle is computed)', () => {
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98,  close: 103, volume: 150 }, // anchor here
    ]);
    const lastIndex = candles.length - 1;
    const result = computeAnchoredVWAP(candles, lastIndex);

    // Candles before the anchor are null
    expect(result[0]!.data.vwap).toBeNull();
    expect(result[1]!.data.vwap).toBeNull();

    // The anchor candle itself: only one data point → vwap = tp, sd = 0
    // tp = (108+98+103)/3 = 103
    const tp = (108 + 98 + 103) / 3;
    expect(result[lastIndex]!.data.vwap).toBeCloseTo(tp);
    expect(result[lastIndex]!.data.upper).toBeCloseTo(tp);
    expect(result[lastIndex]!.data.lower).toBeCloseTo(tp);
  });

  it('should return a result array with the same length as the input', () => {
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98,  close: 103, volume: 150 },
    ]);
    const result = computeAnchoredVWAP(candles, 1);
    expect(result).toHaveLength(candles.length);
  });
});

// ---------------------------------------------------------------------------
// computeRollingVWAP
// ---------------------------------------------------------------------------

describe('computeRollingVWAP', () => {
  it('should compute VWAP over a sliding window', () => {
    // window = 2: each output uses only the current and previous candle.
    //   candle 0: window [0]     tp0=100, vol=100 → vwap = 100
    //   candle 1: window [0,1]   tp0=100,vol=100; tp1=110,vol=200
    //     vwap = (100*100 + 110*200) / 300 = 32000/300 ≈ 106.667
    //   candle 2: window [1,2]   tp1=110,vol=200; tp2=103,vol=150
    //     vwap = (110*200 + 103*150) / 350 = (22000+15450)/350 = 37450/350 ≈ 107
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98,  close: 103, volume: 150 },
    ]);
    const result = computeRollingVWAP(candles, 2);

    expect(result[0]!.data.vwap).toBeCloseTo(100);
    expect(result[1]!.data.vwap).toBeCloseTo(106.667, 2);
    expect(result[2]!.data.vwap).toBeCloseTo(37450 / 350, 5);
  });

  it('should equal the typical price for a window of 1', () => {
    // window = 1: each output is the single candle's tp (sd = 0)
    //   tp0 = (105+95+100)/3  = 100
    //   tp1 = (115+105+110)/3 = 110
    //   tp2 = (108+98+103)/3  = 103
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98,  close: 103, volume: 150 },
    ]);
    const result = computeRollingVWAP(candles, 1);

    expect(result[0]!.data.vwap).toBeCloseTo(100);
    expect(result[1]!.data.vwap).toBeCloseTo(110);
    expect(result[2]!.data.vwap).toBeCloseTo(103);
  });

  it('should have zero-width bands for a window of 1 (single price, no variance)', () => {
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
    ]);
    const result = computeRollingVWAP(candles, 1);

    for (const point of result) {
      expect(point.data.upper).toBeCloseTo(point.data.vwap!);
      expect(point.data.lower).toBeCloseTo(point.data.vwap!);
    }
  });

  it('should use all candles when window is larger than the dataset', () => {
    // window = 99 with only 2 candles → same as accumulating both candles:
    //   vwap = (100*100 + 110*200) / 300 = 32000/300 ≈ 106.667
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
    ]);
    const result = computeRollingVWAP(candles, 99);

    expect(result[0]!.data.vwap).toBeCloseTo(100);
    expect(result[1]!.data.vwap).toBeCloseTo(106.667, 2);
  });

  it('should include non-zero deviation bands when window spans distinct prices', () => {
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98,  close: 103, volume: 150 },
    ]);
    // window = 3: at index 2 all three candles are in scope; prices differ
    const result = computeRollingVWAP(candles, 3);

    const last = result[2]!;
    expect(last.data.upper).not.toBeNull();
    expect(last.data.lower).not.toBeNull();
    expect(last.data.upper!).toBeGreaterThan(last.data.vwap!);
    expect(last.data.lower!).toBeLessThan(last.data.vwap!);
  });

  it('should produce symmetric bands', () => {
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98,  close: 103, volume: 150 },
    ]);
    const result = computeRollingVWAP(candles, 3);

    const last = result[2]!;
    const { vwap, upper, lower } = last.data;
    if (vwap !== null && upper !== null && lower !== null) {
      expect(upper - vwap).toBeCloseTo(vwap - lower, 10);
    }
  });

  it('should return null for a candle with zero volume', () => {
    const candles = makeCandles([
      { high: 100, low: 100, close: 100, volume: 0 },
    ]);
    const result = computeRollingVWAP(candles, 3);

    expect(result[0]!.data.vwap).toBeNull();
    expect(result[0]!.data.upper).toBeNull();
    expect(result[0]!.data.lower).toBeNull();
  });

  it('should recover to a valid VWAP after a zero-volume candle leaves the window', () => {
    // window = 1: each candle is its own window, so the zero-volume candle
    // at index 0 is isolated; index 1 has positive volume and must be valid.
    const candles = makeCandles([
      { high: 100, low: 100, close: 100, volume: 0   },
      { high: 115, low: 105, close: 110, volume: 200 },
    ]);
    const result = computeRollingVWAP(candles, 1);

    expect(result[0]!.data.vwap).toBeNull();
    expect(result[1]!.data.vwap).toBeCloseTo(110);
  });

  it('should return null for every candle when all volumes in a window are zero', () => {
    const candles = makeCandles([
      { high: 100, low: 100, close: 100, volume: 0 },
      { high: 110, low: 100, close: 105, volume: 0 },
    ]);
    const result = computeRollingVWAP(candles, 2);

    expect(result[0]!.data.vwap).toBeNull();
    expect(result[1]!.data.vwap).toBeNull();
  });

  it('should preserve timestamps from the input candles', () => {
    const start = 1700000000000;
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
    ], start);
    const result = computeRollingVWAP(candles, 2);

    expect(result[0]!.timestamp).toBe(start);
    expect(result[1]!.timestamp).toBe(start + 60000);
  });

  it('should return a result array with the same length as the input', () => {
    const candles = makeCandles([
      { high: 105, low: 95,  close: 100, volume: 100 },
      { high: 115, low: 105, close: 110, volume: 200 },
      { high: 108, low: 98,  close: 103, volume: 150 },
    ]);
    const result = computeRollingVWAP(candles, 2);
    expect(result).toHaveLength(candles.length);
  });
});
