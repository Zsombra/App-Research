import { describe, it, expect } from 'vitest';
import {
  computeATR,
  detectSwingPoints,
  computeRoundNumberLevels,
  computeCompositeScores,
} from '../indicators/sl-tp-engine.js';
import type { OHLCVCandle, SLTPCluster } from '@terminal/types';

function makeCandle(
  ts: number,
  o: number,
  h: number,
  l: number,
  c: number,
): OHLCVCandle {
  return {
    timestamp: ts,
    open: o,
    high: h,
    low: l,
    close: c,
    volume: 100,
    buyVolume: 50,
    sellVolume: 50,
    tradeCount: 10,
  };
}

describe('computeATR — period validation', () => {
  it('throws RangeError for period < 1', () => {
    const candles = [makeCandle(1, 100, 110, 90, 105), makeCandle(2, 105, 115, 95, 110)];
    expect(() => computeATR(candles, 0)).toThrow(RangeError);
    expect(() => computeATR(candles, -5)).toThrow(RangeError);
  });

  it('includes period value in error message', () => {
    const candles = [makeCandle(1, 100, 110, 90, 105), makeCandle(2, 105, 115, 95, 110)];
    expect(() => computeATR(candles, -3)).toThrow('-3');
  });

  it('accepts period = 1', () => {
    const candles = [makeCandle(1, 100, 110, 90, 105), makeCandle(2, 105, 115, 95, 110)];
    expect(computeATR(candles, 1)).toBeGreaterThan(0);
  });
});

describe('detectSwingPoints — strength validation', () => {
  it('throws RangeError for strength < 1', () => {
    const candles = [makeCandle(1, 100, 110, 90, 105)];
    expect(() => detectSwingPoints(candles, 0)).toThrow(RangeError);
    expect(() => detectSwingPoints(candles, -1)).toThrow(RangeError);
  });

  it('includes strength value in error message', () => {
    expect(() => detectSwingPoints([], -2)).toThrow('-2');
  });

  it('accepts strength = 1', () => {
    const candles = [
      makeCandle(1, 100, 105, 95, 100),
      makeCandle(2, 100, 115, 95, 100),
      makeCandle(3, 100, 103, 97, 100),
    ];
    const result = detectSwingPoints(candles, 1);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('computeRoundNumberLevels — roundInterval guard', () => {
  it('returns empty for roundInterval <= 0', () => {
    expect(computeRoundNumberLevels(1000, 0, 10, 1, 500)).toHaveLength(0);
    expect(computeRoundNumberLevels(1000, -100, 10, 1, 500)).toHaveLength(0);
  });
});

describe('computeCompositeScores — bucketSize guard', () => {
  it('returns clusters unmodified for bucketSize <= 0', () => {
    const clusters: SLTPCluster[] = [
      {
        price: 100,
        width: 1,
        intensity: 0.5,
        sources: ['swing-cluster'],
        type: 'stop-loss',
        side: 'long',
      },
    ];
    const weights = {
      'liquidation-math': 0.3,
      'swing-cluster': 0.3,
      'round-number': 0.15,
      'historical-sweep': 0.15,
      'dbscan': 0.05,
      'composite': 0.05,
    };
    const result = computeCompositeScores(clusters, weights, 0);
    expect(result).toEqual(clusters);
  });

  it('returns empty for empty clusters regardless of bucketSize', () => {
    const weights = {
      'liquidation-math': 0.3,
      'swing-cluster': 0.3,
      'round-number': 0.15,
      'historical-sweep': 0.15,
      'dbscan': 0.05,
      'composite': 0.05,
    };
    expect(computeCompositeScores([], weights, 0)).toHaveLength(0);
  });
});
