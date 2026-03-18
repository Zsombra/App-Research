import { describe, it, expect } from 'vitest';
import {
  transformFootprintLevels,
  computeFootprintCumulativeDelta,
} from '../indicators/footprint-display.js';
import type { FootprintLevel } from '@terminal/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Build a minimal FootprintLevel.  tradeCount is irrelevant to display logic
 * so it defaults to 0.
 */
function makeLevel(
  price: number,
  buyVolume: number,
  sellVolume: number,
  tradeCount = 0,
): FootprintLevel {
  return { price, buyVolume, sellVolume, tradeCount };
}

/**
 * Three-level array with well-known values used by most tests.
 *
 * Levels:
 *   price=100  buy=300  sell=100  total=400  delta=+200   (high buy dominance)
 *   price=101  buy=500  sell=500  total=1000 delta=0      (POC, balanced)
 *   price=102  buy=100  sell=400  total=500  delta=-300   (high sell dominance)
 *
 * maxTotal = 1000 (price=101)
 */
const THREE_LEVELS: FootprintLevel[] = [
  makeLevel(100, 300, 100),
  makeLevel(101, 500, 500),
  makeLevel(102, 100, 400),
];

/**
 * Levels designed to trigger an imbalance on price=200.
 * imbalanceThreshold = 4  →  buy/sell ratio at price=200 is 400/80 = 5 ≥ 4.
 * price=201 has ratio 200/180 ≈ 1.1, well below threshold.
 */
const IMBALANCE_LEVELS: FootprintLevel[] = [
  makeLevel(200, 400, 80),   // bidAskRatio = 5   → imbalance
  makeLevel(201, 200, 180),  // bidAskRatio ≈ 1.1 → no imbalance
];

// ---------------------------------------------------------------------------
// transformFootprintLevels – mode 'bid-ask'
// ---------------------------------------------------------------------------

describe("transformFootprintLevels – mode 'bid-ask'", () => {
  it('returns one cell per input level', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'bid-ask', 3);
    expect(cells).toHaveLength(3);
  });

  it('returns an empty array when given no levels', () => {
    expect(transformFootprintLevels([], 'bid-ask', 3)).toEqual([]);
  });

  it('sets leftValue = sellVolume (sell side on the left)', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'bid-ask', 3);
    expect(cells[0]!.leftValue).toBe(100);  // price=100 sellVolume
    expect(cells[1]!.leftValue).toBe(500);  // price=101 sellVolume
    expect(cells[2]!.leftValue).toBe(400);  // price=102 sellVolume
  });

  it('sets rightValue = buyVolume (buy side on the right)', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'bid-ask', 3);
    expect(cells[0]!.rightValue).toBe(300);  // price=100 buyVolume
    expect(cells[1]!.rightValue).toBe(500);  // price=101 buyVolume
    expect(cells[2]!.rightValue).toBe(100);  // price=102 buyVolume
  });

  it('preserves the price on every cell', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'bid-ask', 3);
    expect(cells[0]!.price).toBe(100);
    expect(cells[1]!.price).toBe(101);
    expect(cells[2]!.price).toBe(102);
  });

  it('marks the highest total-volume level as POC', () => {
    // price=101 has total=1000, the highest
    const cells = transformFootprintLevels(THREE_LEVELS, 'bid-ask', 3);
    expect(cells[0]!.isPOC).toBe(false);
    expect(cells[1]!.isPOC).toBe(true);
    expect(cells[2]!.isPOC).toBe(false);
  });

  it('marks POC correctly when it is the first level', () => {
    const levels = [makeLevel(50, 900, 200), makeLevel(51, 100, 50)];
    const cells = transformFootprintLevels(levels, 'bid-ask', 3);
    expect(cells[0]!.isPOC).toBe(true);
    expect(cells[1]!.isPOC).toBe(false);
  });

  it('marks POC correctly when it is the last level', () => {
    const levels = [makeLevel(50, 100, 50), makeLevel(51, 900, 200)];
    const cells = transformFootprintLevels(levels, 'bid-ask', 3);
    expect(cells[0]!.isPOC).toBe(false);
    expect(cells[1]!.isPOC).toBe(true);
  });

  it('marks a level as imbalance when buy/sell ratio meets the threshold', () => {
    // threshold=4, price=200 has ratio 5 → imbalance; price=201 has ratio ~1.1 → none
    const cells = transformFootprintLevels(IMBALANCE_LEVELS, 'bid-ask', 4);
    expect(cells[0]!.isImbalance).toBe(true);
    expect(cells[1]!.isImbalance).toBe(false);
  });

  it('marks a level as imbalance when sell/buy ratio meets the threshold', () => {
    const levels = [makeLevel(300, 50, 300)];  // askBidRatio = 6
    const cells = transformFootprintLevels(levels, 'bid-ask', 4);
    expect(cells[0]!.isImbalance).toBe(true);
  });

  it('does not flag an imbalance when ratios are below the threshold', () => {
    const levels = [makeLevel(300, 110, 100)];  // ratio = 1.1, threshold = 4
    const cells = transformFootprintLevels(levels, 'bid-ask', 4);
    expect(cells[0]!.isImbalance).toBe(false);
  });

  it('treats a level with zero sell volume and nonzero buy volume as an imbalance', () => {
    const levels = [makeLevel(400, 100, 0)];
    const cells = transformFootprintLevels(levels, 'bid-ask', 2);
    expect(cells[0]!.isImbalance).toBe(true);
  });

  it('treats a level with zero buy and zero sell volume as no imbalance', () => {
    const levels = [makeLevel(400, 0, 0)];
    const cells = transformFootprintLevels(levels, 'bid-ask', 2);
    expect(cells[0]!.isImbalance).toBe(false);
  });

  it('computes colorIntensity as delta / maxTotal', () => {
    // maxTotal = 1000 (price=101)
    // price=100: delta = 300-100 = 200  → 200/1000 = 0.2
    // price=101: delta = 500-500 = 0    → 0/1000 = 0
    // price=102: delta = 100-400 = -300 → -300/1000 = -0.3
    const cells = transformFootprintLevels(THREE_LEVELS, 'bid-ask', 3);
    expect(cells[0]!.colorIntensity).toBeCloseTo(0.2);
    expect(cells[1]!.colorIntensity).toBeCloseTo(0);
    expect(cells[2]!.colorIntensity).toBeCloseTo(-0.3);
  });

  it('produces colorIntensity of 0 for a single zero-volume level', () => {
    const cells = transformFootprintLevels([makeLevel(100, 0, 0)], 'bid-ask', 3);
    expect(cells[0]!.colorIntensity).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// transformFootprintLevels – mode 'delta'
// ---------------------------------------------------------------------------

describe("transformFootprintLevels – mode 'delta'", () => {
  it('sets leftValue to net delta (buyVolume - sellVolume)', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'delta', 3);
    expect(cells[0]!.leftValue).toBe(200);   // 300-100
    expect(cells[1]!.leftValue).toBe(0);     // 500-500
    expect(cells[2]!.leftValue).toBe(-300);  // 100-400
  });

  it('sets rightValue to 0 for all levels', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'delta', 3);
    for (const cell of cells) {
      expect(cell.rightValue).toBe(0);
    }
  });

  it('sets rightLabel to empty string for all levels', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'delta', 3);
    for (const cell of cells) {
      expect(cell.rightLabel).toBe('');
    }
  });

  it('shows positive delta with a leading "+" in leftLabel', () => {
    const cells = transformFootprintLevels([makeLevel(100, 300, 100)], 'delta', 3);
    expect(cells[0]!.leftLabel).toMatch(/^\+/);
  });

  it('shows negative delta without a leading "+" in leftLabel', () => {
    const cells = transformFootprintLevels([makeLevel(100, 100, 400)], 'delta', 3);
    expect(cells[0]!.leftLabel).not.toMatch(/^\+/);
    expect(cells[0]!.leftLabel).toMatch(/-/);
  });

  it('shows zero delta with a "+" prefix in leftLabel', () => {
    const cells = transformFootprintLevels([makeLevel(100, 500, 500)], 'delta', 3);
    expect(cells[0]!.leftLabel).toBe('+0');
  });

  it('uses positive leftValue for buy-dominant levels', () => {
    const cells = transformFootprintLevels([makeLevel(100, 400, 150)], 'delta', 3);
    expect(cells[0]!.leftValue).toBeGreaterThan(0);
  });

  it('uses negative leftValue for sell-dominant levels', () => {
    const cells = transformFootprintLevels([makeLevel(100, 150, 400)], 'delta', 3);
    expect(cells[0]!.leftValue).toBeLessThan(0);
  });

  it('still identifies POC correctly', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'delta', 3);
    expect(cells[1]!.isPOC).toBe(true);  // price=101 has maxTotal
  });

  it('colorIntensity matches delta / maxTotal', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'delta', 3);
    expect(cells[0]!.colorIntensity).toBeCloseTo(0.2);
    expect(cells[2]!.colorIntensity).toBeCloseTo(-0.3);
  });
});

// ---------------------------------------------------------------------------
// transformFootprintLevels – mode 'total-volume'
// ---------------------------------------------------------------------------

describe("transformFootprintLevels – mode 'total-volume'", () => {
  it('sets leftValue to the combined buy+sell volume', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'total-volume', 3);
    expect(cells[0]!.leftValue).toBe(400);   // 300+100
    expect(cells[1]!.leftValue).toBe(1000);  // 500+500
    expect(cells[2]!.leftValue).toBe(500);   // 100+400
  });

  it('sets rightValue to 0 for all levels', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'total-volume', 3);
    for (const cell of cells) {
      expect(cell.rightValue).toBe(0);
    }
  });

  it('sets rightLabel to empty string for all levels', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'total-volume', 3);
    for (const cell of cells) {
      expect(cell.rightLabel).toBe('');
    }
  });

  it('reflects the total volume for a single-level array', () => {
    const cells = transformFootprintLevels([makeLevel(100, 250, 750)], 'total-volume', 3);
    expect(cells[0]!.leftValue).toBe(1000);
  });

  it('still identifies POC correctly (level with highest total)', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'total-volume', 3);
    expect(cells[1]!.isPOC).toBe(true);
  });

  it('colorIntensity is still based on delta / maxTotal, not total volume', () => {
    // price=100: delta=200, maxTotal=1000 → 0.2
    // price=101: delta=0 → 0
    const cells = transformFootprintLevels(THREE_LEVELS, 'total-volume', 3);
    expect(cells[0]!.colorIntensity).toBeCloseTo(0.2);
    expect(cells[1]!.colorIntensity).toBeCloseTo(0);
  });
});

// ---------------------------------------------------------------------------
// transformFootprintLevels – mode 'bid-ask-delta'
// ---------------------------------------------------------------------------

describe("transformFootprintLevels – mode 'bid-ask-delta'", () => {
  it('sets leftValue = sellVolume (bid side)', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'bid-ask-delta', 3);
    expect(cells[0]!.leftValue).toBe(100);
    expect(cells[1]!.leftValue).toBe(500);
    expect(cells[2]!.leftValue).toBe(400);
  });

  it('sets rightValue = buyVolume (ask side)', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'bid-ask-delta', 3);
    expect(cells[0]!.rightValue).toBe(300);
    expect(cells[1]!.rightValue).toBe(500);
    expect(cells[2]!.rightValue).toBe(100);
  });

  it('colors by delta, not by raw volume split', () => {
    // price=100: buy-dominant → positive intensity
    // price=102: sell-dominant → negative intensity
    const cells = transformFootprintLevels(THREE_LEVELS, 'bid-ask-delta', 3);
    expect(cells[0]!.colorIntensity).toBeGreaterThan(0);
    expect(cells[2]!.colorIntensity).toBeLessThan(0);
  });

  it('colorIntensity equals delta / maxTotal (same formula as bid-ask)', () => {
    const bidAskCells = transformFootprintLevels(THREE_LEVELS, 'bid-ask', 3);
    const bidAskDeltaCells = transformFootprintLevels(THREE_LEVELS, 'bid-ask-delta', 3);
    for (let i = 0; i < THREE_LEVELS.length; i++) {
      expect(bidAskDeltaCells[i]!.colorIntensity).toBeCloseTo(
        bidAskCells[i]!.colorIntensity,
      );
    }
  });

  it('still identifies POC correctly', () => {
    const cells = transformFootprintLevels(THREE_LEVELS, 'bid-ask-delta', 3);
    expect(cells[1]!.isPOC).toBe(true);
  });

  it('detects imbalances at the given threshold', () => {
    const cells = transformFootprintLevels(IMBALANCE_LEVELS, 'bid-ask-delta', 4);
    expect(cells[0]!.isImbalance).toBe(true);
    expect(cells[1]!.isImbalance).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeFootprintCumulativeDelta
// ---------------------------------------------------------------------------

describe('computeFootprintCumulativeDelta', () => {
  it('returns 0 for an empty levels array', () => {
    expect(computeFootprintCumulativeDelta([])).toBe(0);
  });

  it('returns the correct cumulative delta for a single level', () => {
    expect(computeFootprintCumulativeDelta([makeLevel(100, 300, 100)])).toBe(200);
  });

  it('returns a negative delta when sells dominate across all levels', () => {
    const levels = [makeLevel(100, 50, 200), makeLevel(101, 30, 150)];
    // delta = (50-200) + (30-150) = -150 + -120 = -270
    expect(computeFootprintCumulativeDelta(levels)).toBe(-270);
  });

  it('correctly sums buy-sell deltas across multiple levels', () => {
    // price=100: +200, price=101: 0, price=102: -300  → total = -100
    expect(computeFootprintCumulativeDelta(THREE_LEVELS)).toBe(-100);
  });

  it('returns 0 when buys and sells are perfectly balanced overall', () => {
    const levels = [makeLevel(100, 400, 200), makeLevel(101, 100, 300)];
    // delta = 200 + (-200) = 0
    expect(computeFootprintCumulativeDelta(levels)).toBe(0);
  });

  it('handles levels where both sides are zero', () => {
    const levels = [makeLevel(100, 0, 0), makeLevel(101, 0, 0)];
    expect(computeFootprintCumulativeDelta(levels)).toBe(0);
  });

  it('handles a single level with zero volume', () => {
    expect(computeFootprintCumulativeDelta([makeLevel(100, 0, 0)])).toBe(0);
  });

  it('accumulates correctly across a large number of levels', () => {
    // 100 levels each with buy=10, sell=7 → cumDelta = 100 * 3 = 300
    const levels = Array.from({ length: 100 }, (_, i) => makeLevel(100 + i, 10, 7));
    expect(computeFootprintCumulativeDelta(levels)).toBe(300);
  });
});
