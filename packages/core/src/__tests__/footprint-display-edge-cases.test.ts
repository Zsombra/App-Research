import { describe, it, expect } from 'vitest';
import { transformFootprintLevels, computeFootprintCumulativeDelta } from '../indicators/footprint-display.js';
import type { FootprintLevel } from '@terminal/types';

function makeLevel(buy: number, sell: number, price: number = 100): FootprintLevel {
  return { price, buyVolume: buy, sellVolume: sell };
}

describe('transformFootprintLevels — imbalance Infinity guard', () => {
  it('returns empty for empty levels', () => {
    expect(transformFootprintLevels([], 'bid-ask', 3)).toHaveLength(0);
  });

  it('does not produce Infinity in bidAskRatio when sellVolume is 0', () => {
    const levels = [makeLevel(10, 0, 100)];
    const result = transformFootprintLevels(levels, 'bid-ask', 3);
    expect(result).toHaveLength(1);
    // With threshold=3, buyVolume=10 and sellVolume=0 should trigger imbalance
    expect(result[0]!.isImbalance).toBe(true);
  });

  it('does not produce Infinity in askBidRatio when buyVolume is 0', () => {
    const levels = [makeLevel(0, 10, 100)];
    const result = transformFootprintLevels(levels, 'bid-ask', 3);
    expect(result).toHaveLength(1);
    expect(result[0]!.isImbalance).toBe(true);
  });

  it('no imbalance when both volumes are zero', () => {
    const levels = [makeLevel(0, 0, 100)];
    const result = transformFootprintLevels(levels, 'bid-ask', 3);
    expect(result).toHaveLength(1);
    expect(result[0]!.isImbalance).toBe(false);
  });

  it('detects imbalance when ratio exceeds threshold', () => {
    // buyVolume/sellVolume = 10/2 = 5 >= 3
    const levels = [makeLevel(10, 2, 100)];
    const result = transformFootprintLevels(levels, 'bid-ask', 3);
    expect(result[0]!.isImbalance).toBe(true);
  });

  it('no imbalance when ratio is below threshold', () => {
    // buyVolume/sellVolume = 3/2 = 1.5 < 3
    const levels = [makeLevel(3, 2, 100)];
    const result = transformFootprintLevels(levels, 'bid-ask', 3);
    expect(result[0]!.isImbalance).toBe(false);
  });

  it('identifies POC correctly', () => {
    const levels = [
      makeLevel(5, 5, 100),
      makeLevel(10, 10, 101), // highest total
      makeLevel(3, 3, 102),
    ];
    const result = transformFootprintLevels(levels, 'bid-ask', 3);
    expect(result[1]!.isPOC).toBe(true);
    expect(result[0]!.isPOC).toBe(false);
  });

  it('delta mode produces correct delta values', () => {
    const levels = [makeLevel(7, 3, 100)]; // delta = 7-3 = 4
    const result = transformFootprintLevels(levels, 'delta', 3);
    expect(result[0]!.leftValue).toBe(4);
    expect(result[0]!.leftLabel).toContain('+');
  });

  it('total-volume mode sums buy and sell', () => {
    const levels = [makeLevel(7, 3, 100)]; // total = 10
    const result = transformFootprintLevels(levels, 'total-volume', 3);
    expect(result[0]!.leftValue).toBe(10);
  });

  it('bid-ask-delta mode shows bid/ask values with delta coloring', () => {
    const levels = [makeLevel(7, 3, 100)];
    const result = transformFootprintLevels(levels, 'bid-ask-delta', 3);
    expect(result[0]!.leftValue).toBe(3); // sell
    expect(result[0]!.rightValue).toBe(7); // buy
  });
});

describe('computeFootprintCumulativeDelta', () => {
  it('returns 0 for empty levels', () => {
    expect(computeFootprintCumulativeDelta([])).toBe(0);
  });

  it('computes cumulative delta correctly', () => {
    const levels = [
      makeLevel(10, 5, 100),  // delta +5
      makeLevel(3, 7, 101),   // delta -4
    ];
    expect(computeFootprintCumulativeDelta(levels)).toBe(1); // 5 + (-4) = 1
  });
});
