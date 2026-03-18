import { describe, it, expect } from 'vitest';
import type { OHLCVCandle } from '@terminal/types';
import type {
  EstimatedPosition,
  SwingPoint,
  SLTPCluster,
  SLTPConfig,
} from '@terminal/types';
import { DEFAULT_SLTP_CONFIG } from '@terminal/types';
import {
  computeLiquidationLevels,
  detectSwingPoints,
  clusterSwingPoints,
  computeATR,
  computeRoundNumberLevels,
  detectHistoricalSweeps,
  dbscanCluster,
  dbscanSLTPClusters,
  computeCompositeScores,
  computeSLTPHeatmap,
} from '../indicators/sl-tp-engine.js';

// ─── Candle / Position Helpers ────────────────────────────────────────

/**
 * Build a single OHLCVCandle.  high/low/open default to close when omitted,
 * giving a doji-style candle that is convenient for TR-free ATR tests.
 */
function makeCandle(
  close: number,
  high?: number,
  low?: number,
  open?: number,
  timestamp: number = 1_000_000,
  volume: number = 100,
): OHLCVCandle {
  return {
    exchange: 'simulated',
    symbol: 'BTC/USDT',
    timeframe: '1h',
    timestamp,
    open: open ?? close,
    high: high ?? close,
    low: low ?? close,
    close,
    volume,
    buyVolume: volume / 2,
    sellVolume: volume / 2,
    tradeCount: 10,
    closed: true,
  };
}

/**
 * Build a sequential candle series.  Each entry specifies close and optionally
 * high / low.  Timestamps are spaced 1 hour apart from baseTimestamp.
 */
function makeCandles(
  prices: Array<{ close: number; high?: number; low?: number }>,
  baseTimestamp: number = 1_000_000,
): OHLCVCandle[] {
  return prices.map((p, i) =>
    makeCandle(
      p.close,
      p.high ?? p.close,
      p.low ?? p.close,
      p.close,
      baseTimestamp + i * 3_600_000,
    ),
  );
}

/** Build a candle series that contains recognisable swing highs and lows. */
function makeZigzagCandles(baseTimestamp: number = 1_000_000): OHLCVCandle[] {
  // strength=2: we need 2 lower-high candles on each side of a peak.
  // Index 3 has the tallest high → swing high; index 7 has the deepest low → swing low.
  return makeCandles(
    [
      { close: 100, high: 101, low:  99 }, // 0
      { close: 103, high: 105, low: 102 }, // 1
      { close: 107, high: 110, low: 106 }, // 2
      { close: 112, high: 120, low: 111 }, // 3  ← swing HIGH (high=120)
      { close: 109, high: 113, low: 108 }, // 4
      { close: 106, high: 108, low: 105 }, // 5
      { close: 102, high: 104, low:  98 }, // 6
      { close:  96, high:  99, low:  90 }, // 7  ← swing LOW (low=90)
      { close:  99, high: 102, low:  97 }, // 8
      { close: 103, high: 106, low: 101 }, // 9
    ],
    baseTimestamp,
  );
}

function makePosition(
  entryPrice: number,
  side: 'long' | 'short',
  leverage: number = 1,
  size: number = 1,
): EstimatedPosition {
  return { entryPrice, side, leverage, size };
}

function makeSwing(
  price: number,
  type: 'high' | 'low',
  timestamp: number = 0,
): SwingPoint {
  return { price, type, timestamp, strength: 2 };
}

/** A minimal valid SLTPConfig with explicit priceBucketSize for determinism. */
const testConfig: SLTPConfig = {
  ...DEFAULT_SLTP_CONFIG,
  algorithms: ['liquidation-math', 'swing-cluster', 'round-number', 'historical-sweep', 'dbscan', 'composite'],
  leverageLevels: [10, 25, 100],
  swingStrength: 2,
  priceBucketSize: 100,
  roundNumberInterval: 1_000,
};

// ─── 1. computeLiquidationLevels ─────────────────────────────────────

describe('computeLiquidationLevels', () => {
  it('returns an empty array when given no positions', () => {
    expect(computeLiquidationLevels([], [10, 25, 100])).toHaveLength(0);
  });

  it('calculates long liquidation price: entry × (1 − 1/L)', () => {
    const entry = 50_000;
    const lev = 10;
    const result = computeLiquidationLevels([makePosition(entry, 'long', lev)], [lev]);

    expect(result).toHaveLength(1);
    expect(result[0]!.price).toBeCloseTo(entry * (1 - 1 / lev), 5); // 45 000
    expect(result[0]!.type).toBe('stop-loss');
    expect(result[0]!.side).toBe('long');
    expect(result[0]!.sources).toContain('liquidation-math');
  });

  it('calculates short liquidation price: entry × (1 + 1/L)', () => {
    const entry = 50_000;
    const lev = 10;
    const result = computeLiquidationLevels([makePosition(entry, 'short', lev)], [lev]);

    expect(result).toHaveLength(1);
    expect(result[0]!.price).toBeCloseTo(entry * (1 + 1 / lev), 5); // 55 000
    expect(result[0]!.type).toBe('stop-loss');
    expect(result[0]!.side).toBe('short');
  });

  it('uses the position-level leverage when pos.leverage > 1 (ignores leverageLevels list)', () => {
    const entry = 40_000;
    const posLev = 20;
    const result = computeLiquidationLevels(
      [makePosition(entry, 'long', posLev)],
      [5, 10, 25, 100], // these should all be ignored
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.price).toBeCloseTo(entry * (1 - 1 / posLev), 5);
  });

  it('fans out over leverageLevels when pos.leverage === 1', () => {
    const entry = 30_000;
    const levels = [5, 10, 25];
    const result = computeLiquidationLevels(
      [makePosition(entry, 'long', 1)],
      levels,
    );

    expect(result).toHaveLength(levels.length);
    // Sorted ascending: lowest leverage produces the furthest-below-entry price (prices[0])
    const prices = result.map((c) => c.price).sort((a, b) => a - b);
    expect(prices[0]).toBeCloseTo(entry * (1 - 1 / 5), 5);   // 5× is furthest below entry
    expect(prices[2]).toBeCloseTo(entry * (1 - 1 / 25), 5);  // 25× is closest to entry
  });

  it('skips leverage levels that are zero or negative', () => {
    const result = computeLiquidationLevels(
      [makePosition(50_000, 'long', 1)],
      [0, -5, 10],
    );
    // Only the 10× level is valid
    expect(result).toHaveLength(1);
    expect(result[0]!.price).toBeCloseTo(50_000 * 0.9, 5);
  });

  it('excludes the result when the long liquidation price is not positive', () => {
    // 1× long: liqPrice = entry × (1 − 1/1) = 0; the guard (liqPrice > 0) must skip it
    const result = computeLiquidationLevels(
      [makePosition(50_000, 'long', 1)],
      [1],
    );
    expect(result).toHaveLength(0);
  });

  it('liquidation price for longs is lower at higher leverage', () => {
    const entry = 50_000;
    const result = computeLiquidationLevels(
      [makePosition(entry, 'long', 1)],
      [5, 10, 25, 100],
    );
    // Sorted ascending: lowest price at index 0 (lowest leverage = biggest gap below entry)
    const sorted = result.map((c) => c.price).sort((a, b) => a - b);
    // 5× → furthest below entry (lowest price)
    expect(sorted[0]).toBeCloseTo(entry * (1 - 1 / 5), 4);
    // 100× → closest to entry on the downside (highest price among liq levels)
    expect(sorted[3]).toBeCloseTo(entry * (1 - 1 / 100), 4);
  });

  it('zone width equals 0.2% of the entry price', () => {
    const entry = 50_000;
    const result = computeLiquidationLevels(
      [makePosition(entry, 'long', 10)],
      [10],
    );
    expect(result[0]!.width).toBeCloseTo(entry * 0.002, 5);
  });

  it('intensity = size / max(1, leverage)', () => {
    const size = 200;
    const lev = 20;
    const result = computeLiquidationLevels(
      [makePosition(50_000, 'long', lev, size)],
      [lev],
    );
    expect(result[0]!.intensity).toBeCloseTo(size / lev, 5);
  });

  it('handles multiple positions and multiple leverage levels', () => {
    const positions = [
      makePosition(40_000, 'long', 1),
      makePosition(42_000, 'short', 1),
    ];
    const result = computeLiquidationLevels(positions, [10, 25]);
    // 2 positions × 2 levels = 4 clusters
    expect(result).toHaveLength(4);
    expect(result.filter((c) => c.side === 'long')).toHaveLength(2);
    expect(result.filter((c) => c.side === 'short')).toHaveLength(2);
  });

  it('all returned clusters have type stop-loss', () => {
    const positions = [
      makePosition(50_000, 'long', 1),
      makePosition(50_000, 'short', 1),
    ];
    const result = computeLiquidationLevels(positions, [10, 25]);
    expect(result.every((c) => c.type === 'stop-loss')).toBe(true);
  });
});

// ─── 2. detectSwingPoints ─────────────────────────────────────────────

describe('detectSwingPoints', () => {
  it('returns an empty array when the series is too short for the strength window', () => {
    // strength=2 needs at least 2+1+2 = 5 candles; give only 3
    const candles = makeCandles([
      { close: 100, high: 101, low: 99 },
      { close: 105, high: 110, low: 104 },
      { close: 102, high: 103, low: 101 },
    ]);
    expect(detectSwingPoints(candles, 2)).toHaveLength(0);
  });

  it('returns an empty array for an empty candle array', () => {
    expect(detectSwingPoints([], 1)).toHaveLength(0);
  });

  it('detects a swing high when the centre candle has the highest high on both sides', () => {
    const candles = makeCandles([
      { close: 100, high: 101, low: 99 },
      { close: 108, high: 120, low: 107 }, // peak
      { close: 103, high: 105, low: 102 },
    ]);
    const swings = detectSwingPoints(candles, 1);
    const highs = swings.filter((s) => s.type === 'high');
    expect(highs).toHaveLength(1);
    expect(highs[0]!.price).toBe(120);
  });

  it('detects a swing low when the centre candle has the lowest low on both sides', () => {
    const candles = makeCandles([
      { close: 105, high: 107, low: 104 },
      { close:  98, high: 100, low:  90 }, // trough
      { close: 104, high: 106, low: 103 },
    ]);
    const swings = detectSwingPoints(candles, 1);
    const lows = swings.filter((s) => s.type === 'low');
    expect(lows).toHaveLength(1);
    expect(lows[0]!.price).toBe(90);
  });

  it('does NOT flag a swing high when a neighbouring candle has an equal high (strict inequality)', () => {
    const candles = makeCandles([
      { close: 100, high: 120, low: 99 }, // same high as centre
      { close: 108, high: 120, low: 107 },
      { close: 103, high: 105, low: 102 },
    ]);
    expect(detectSwingPoints(candles, 1).filter((s) => s.type === 'high')).toHaveLength(0);
  });

  it('does NOT flag a swing low when a neighbouring candle has an equal low', () => {
    const candles = makeCandles([
      { close: 100, high: 105, low: 90 }, // same low as centre
      { close:  98, high: 100, low: 90 },
      { close: 104, high: 106, low: 103 },
    ]);
    expect(detectSwingPoints(candles, 1).filter((s) => s.type === 'low')).toHaveLength(0);
  });

  it('detects the correct swing high price in the zigzag series', () => {
    const candles = makeZigzagCandles();
    const swings = detectSwingPoints(candles, 2);
    expect(swings.filter((s) => s.type === 'high').some((s) => s.price === 120)).toBe(true);
  });

  it('detects the correct swing low price in the zigzag series', () => {
    const candles = makeZigzagCandles();
    const swings = detectSwingPoints(candles, 2);
    expect(swings.filter((s) => s.type === 'low').some((s) => s.price === 90)).toBe(true);
  });

  it('higher strength yields fewer or equal swings than lower strength', () => {
    const candles = makeZigzagCandles();
    const weak   = detectSwingPoints(candles, 1);
    const strong = detectSwingPoints(candles, 3);
    expect(weak.length).toBeGreaterThanOrEqual(strong.length);
  });

  it('records the timestamp from the source candle (index × 3 600 000 ms offset)', () => {
    const base = 5_000_000;
    const candles = makeCandles([
      { close: 100, high: 101, low: 99 },
      { close: 108, high: 118, low: 107 },
      { close: 103, high: 105, low: 102 },
    ], base);

    const swings = detectSwingPoints(candles, 1);
    const high = swings.find((s) => s.type === 'high')!;
    expect(high.timestamp).toBe(base + 3_600_000); // index 1
  });

  it('sets the strength property on every detected swing', () => {
    const candles = makeZigzagCandles();
    const strength = 2;
    expect(detectSwingPoints(candles, strength).every((s) => s.strength === strength)).toBe(true);
  });

  it('does not detect any swing lows in a monotonically increasing series', () => {
    const candles = makeCandles(
      Array.from({ length: 10 }, (_, i) => ({ close: 100 + i, high: 101 + i, low: 99 + i })),
    );
    expect(detectSwingPoints(candles, 1).filter((s) => s.type === 'low')).toHaveLength(0);
  });

  it('does not detect any swing highs in a monotonically decreasing series', () => {
    const candles = makeCandles(
      Array.from({ length: 10 }, (_, i) => ({ close: 200 - i, high: 201 - i, low: 199 - i })),
    );
    expect(detectSwingPoints(candles, 1).filter((s) => s.type === 'high')).toHaveLength(0);
  });
});

// ─── 3. clusterSwingPoints ────────────────────────────────────────────

describe('clusterSwingPoints', () => {
  it('returns an empty array for an empty swing list', () => {
    expect(clusterSwingPoints([], 0.005)).toHaveLength(0);
  });

  it('produces exactly two output clusters for a single swing high', () => {
    expect(clusterSwingPoints([makeSwing(50_000, 'high')], 0.005)).toHaveLength(2);
  });

  it('swing high → stop-loss for shorts and take-profit for longs', () => {
    const clusters = clusterSwingPoints([makeSwing(50_000, 'high')], 0.005);
    const sl = clusters.find((c) => c.type === 'stop-loss')!;
    const tp = clusters.find((c) => c.type === 'take-profit')!;
    expect(sl.side).toBe('short');
    expect(tp.side).toBe('long');
  });

  it('swing low → stop-loss for longs and take-profit for shorts', () => {
    const clusters = clusterSwingPoints([makeSwing(45_000, 'low')], 0.005);
    const sl = clusters.find((c) => c.type === 'stop-loss')!;
    const tp = clusters.find((c) => c.type === 'take-profit')!;
    expect(sl.side).toBe('long');
    expect(tp.side).toBe('short');
  });

  it('groups multiple swings within eps into a single price group (2 output clusters)', () => {
    const base = 50_000;
    const swings = [
      makeSwing(base,          'high'),
      makeSwing(base * 1.002,  'high'),
      makeSwing(base * 1.004,  'high'),
    ];
    expect(clusterSwingPoints(swings, 0.005)).toHaveLength(2);
  });

  it('does not group swings further apart than eps', () => {
    const swings = [
      makeSwing(50_000, 'high'),
      makeSwing(52_000, 'high'), // ~4% apart, outside 0.5% eps
    ];
    expect(clusterSwingPoints(swings, 0.005)).toHaveLength(4);
  });

  it('cluster price equals the arithmetic mean of the grouped swing prices', () => {
    const p1 = 50_000;
    const p2 = 50_100;
    const clusters = clusterSwingPoints(
      [makeSwing(p1, 'high'), makeSwing(p2, 'high')],
      0.005,
    );
    const expectedAvg = (p1 + p2) / 2;
    for (const c of clusters) {
      expect(c.price).toBeCloseTo(expectedAvg, 3);
    }
  });

  it('intensity = min(1, groupSize / 10) — 10-point group reaches 1', () => {
    const swings = Array.from({ length: 10 }, (_, i) =>
      makeSwing(50_000 + i * 5, 'high'),
    );
    expect(clusterSwingPoints(swings, 0.005)[0]!.intensity).toBeCloseTo(1, 5);
  });

  it('single-point cluster gets a default width of 0.1% of its price', () => {
    const price = 50_000;
    for (const c of clusterSwingPoints([makeSwing(price, 'low')], 0.005)) {
      expect(c.width).toBeCloseTo(price * 0.001, 5);
    }
  });

  it('multi-point cluster width equals the price range (max − min of the group)', () => {
    const p1 = 50_000;
    const p2 = 50_500;
    for (const c of clusterSwingPoints([makeSwing(p1, 'high'), makeSwing(p2, 'high')], 0.02)) {
      expect(c.width).toBeCloseTo(p2 - p1, 3);
    }
  });

  it('all output clusters carry the swing-cluster source tag', () => {
    const clusters = clusterSwingPoints(
      [makeSwing(48_000, 'low'), makeSwing(52_000, 'high')],
      0.005,
    );
    expect(clusters.every((c) => c.sources.includes('swing-cluster'))).toBe(true);
  });

  it('majority-type rule: mixed group dominated by highs produces SL-short / TP-long', () => {
    // 2 highs vs 1 low → majority = high
    const swings = [
      makeSwing(50_000, 'high'),
      makeSwing(50_050, 'high'),
      makeSwing(50_020, 'low'),
    ];
    const clusters = clusterSwingPoints(swings, 0.005);
    expect(clusters.find((c) => c.type === 'stop-loss')!.side).toBe('short');
  });
});

// ─── 4. computeATR ───────────────────────────────────────────────────

describe('computeATR', () => {
  it('returns 0 for an empty candle array', () => {
    expect(computeATR([], 14)).toBe(0);
  });

  it('returns 0 for a single candle (need at least 2 to compute a true range)', () => {
    expect(computeATR([makeCandle(100, 110, 90)], 14)).toBe(0);
  });

  it('equals high − low when there is no overnight gap', () => {
    const candles = makeCandles([
      { close: 100, high: 100, low: 100 },
      { close: 100, high: 110, low:  90 }, // TR = max(20, 10, 10) = 20
    ]);
    expect(computeATR(candles, 1)).toBeCloseTo(20, 5);
  });

  it('accounts for gap-up (prev close below current low)', () => {
    // prev.close=100; candle high=125, low=115 → TR = max(10, 25, 15) = 25
    const candles = makeCandles([
      { close: 100, high: 101, low:  99 },
      { close: 120, high: 125, low: 115 },
    ]);
    expect(computeATR(candles, 1)).toBeCloseTo(25, 5);
  });

  it('accounts for gap-down (prev close above current high)', () => {
    // prev.close=120; candle high=105, low=95 → TR = max(10, 15, 25) = 25
    const candles = makeCandles([
      { close: 120, high: 121, low: 119 },
      { close: 100, high: 105, low:  95 },
    ]);
    expect(computeATR(candles, 1)).toBeCloseTo(25, 5);
  });

  it('averages correctly over a multi-candle window', () => {
    // TR[1]=10, TR[2]=20 → mean of last 2 = 15
    const candles = makeCandles([
      { close: 100, high: 105, low:  95 },
      { close: 105, high: 110, low: 100 }, // TR = max(10, 10, 0) = 10
      { close: 115, high: 125, low: 105 }, // TR = max(20, 20, 0) = 20
    ]);
    expect(computeATR(candles, 2)).toBeCloseTo(15, 4);
  });

  it('uses only the last `period` candles when the series is longer', () => {
    const huge = makeCandle(100, 10_000, 1, 100, 1_000_000);
    const rest = Array.from({ length: 10 }, (_, i) =>
      makeCandle(100, 110, 90, 100, 1_000_000 + (i + 1) * 3_600_000),
    );
    // The huge outlier is outside the period-5 window — ATR should stay near 20
    expect(computeATR([huge, ...rest], 5)).toBeCloseTo(20, 3);
  });

  it('returns a positive value for a standard OHLCV series', () => {
    const candles = makeCandles(
      Array.from({ length: 20 }, (_, i) => ({ close: 100 + i, high: 105 + i, low: 95 + i })),
    );
    expect(computeATR(candles, 14)).toBeGreaterThan(0);
  });
});

// ─── 5. computeRoundNumberLevels ──────────────────────────────────────

describe('computeRoundNumberLevels', () => {
  it('returns an empty array when range is zero', () => {
    expect(computeRoundNumberLevels(50_000, 1_000, 100, 1.5, 0)).toHaveLength(0);
  });

  it('generates paired clusters — one long and one short per round-number level', () => {
    const result = computeRoundNumberLevels(50_250, 1_000, 50, 1.5, 4_000);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length % 2).toBe(0);
  });

  it('skips levels within 0.1% of the current price', () => {
    // roundInterval=1 guarantees a level at 50 000 itself
    const result = computeRoundNumberLevels(50_000, 1, 1, 1, 100);
    expect(result.filter((c) => Math.abs(c.price - 50_000) / 50_000 < 0.001)).toHaveLength(0);
  });

  it('levels below current price → SL for longs, TP for shorts', () => {
    const price = 50_250;
    const result = computeRoundNumberLevels(price, 1_000, 50, 1.5, 4_000);
    const below = result.filter((c) => c.price < price);
    expect(below.filter((c) => c.type === 'stop-loss'  && c.side === 'long').length).toBeGreaterThan(0);
    expect(below.filter((c) => c.type === 'take-profit' && c.side === 'short').length).toBeGreaterThan(0);
  });

  it('levels above current price → TP for longs, SL for shorts', () => {
    const price = 50_250;
    const result = computeRoundNumberLevels(price, 1_000, 50, 1.5, 4_000);
    const above = result.filter((c) => c.price > price);
    expect(above.filter((c) => c.type === 'take-profit' && c.side === 'long').length).toBeGreaterThan(0);
    expect(above.filter((c) => c.type === 'stop-loss'   && c.side === 'short').length).toBeGreaterThan(0);
  });

  it('zone width equals atr × atrMultiplier', () => {
    const atr = 200;
    const mult = 1.5;
    for (const c of computeRoundNumberLevels(50_000, 1_000, atr, mult, 4_000)) {
      expect(c.width).toBeCloseTo(atr * mult, 5);
    }
  });

  it('all clusters have the Osler intensity constant of 0.15', () => {
    const result = computeRoundNumberLevels(50_000, 1_000, 100, 1.5, 4_000);
    expect(result.every((c) => c.intensity === 0.15)).toBe(true);
  });

  it('all clusters carry the round-number source tag', () => {
    const result = computeRoundNumberLevels(50_000, 1_000, 100, 1.5, 4_000);
    expect(result.every((c) => c.sources.includes('round-number'))).toBe(true);
  });

  it('every generated level is an integer multiple of roundInterval', () => {
    const interval = 1_000;
    for (const c of computeRoundNumberLevels(50_000, interval, 100, 1.5, 6_000)) {
      expect(c.price % interval).toBeCloseTo(0, 4);
    }
  });

  it('detects the well-known 50 000 level when current price is 50 250', () => {
    const result = computeRoundNumberLevels(50_250, 1_000, 50, 1.5, 4_000);
    expect(result.some((c) => c.price === 50_000)).toBe(true);
  });
});

// ─── 6. detectHistoricalSweeps ────────────────────────────────────────

describe('detectHistoricalSweeps', () => {
  it('returns an empty array when no swings are provided', () => {
    expect(detectHistoricalSweeps([makeCandle(100)], [], 0.001)).toHaveLength(0);
  });

  it('returns an empty array when no candle actually sweeps a swing level', () => {
    const swingTs = 1_000_000;
    const swing = makeSwing(100, 'high', swingTs);
    // candle high = 99.9 < 100.1 (the tolerance threshold) → not a sweep
    expect(
      detectHistoricalSweeps(
        [makeCandle(98, 99.9, 97, 97, swingTs + 3_600_000)],
        [swing],
        0.001,
      ),
    ).toHaveLength(0);
  });

  it('detects a high sweep: candle.high > swingPrice × (1+tol) AND candle.close < swingPrice', () => {
    const swingTs = 1_000_000;
    const swing = makeSwing(100, 'high', swingTs);
    // high=101.5 > 100.1, close=98 < 100 → valid sweep
    const result = detectHistoricalSweeps(
      [makeCandle(98, 101.5, 97, 97, swingTs + 3_600_000)],
      [swing],
      0.001,
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((c) => c.sources.includes('historical-sweep'))).toBe(true);
  });

  it('swept high produces two clusters at the swing price: SL-long and SL-short', () => {
    const swingTs = 1_000_000;
    const result = detectHistoricalSweeps(
      [makeCandle(98, 101.5, 97, 97, swingTs + 3_600_000)],
      [makeSwing(100, 'high', swingTs)],
      0.001,
    );
    const atPrice = result.filter((c) => c.price === 100);
    expect(atPrice).toHaveLength(2);
    expect(atPrice.every((c) => c.type === 'stop-loss')).toBe(true);
    expect(atPrice.some((c) => c.side === 'long')).toBe(true);
    expect(atPrice.some((c) => c.side === 'short')).toBe(true);
  });

  it('detects a low sweep: candle.low < swingPrice × (1−tol) AND candle.close > swingPrice', () => {
    const swingTs = 1_000_000;
    // low=98.5 < 99.9, close=102 > 100 → valid sweep
    const result = detectHistoricalSweeps(
      [makeCandle(102, 103, 98.5, 101, swingTs + 3_600_000)],
      [makeSwing(100, 'low', swingTs)],
      0.001,
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it('ignores candles at or before the swing timestamp', () => {
    const swingTs = 2_000_000;
    const result = detectHistoricalSweeps(
      [makeCandle(98, 102, 97, 97, swingTs)], // same timestamp → should be ignored
      [makeSwing(100, 'high', swingTs)],
      0.001,
    );
    expect(result).toHaveLength(0);
  });

  it('intensity = 1.0 for exactly 5 sweep candles', () => {
    const swingTs = 1_000_000;
    const candles = Array.from({ length: 5 }, (_, i) =>
      makeCandle(98, 101.5, 97, 97, swingTs + (i + 1) * 3_600_000),
    );
    const result = detectHistoricalSweeps(candles, [makeSwing(100, 'high', swingTs)], 0.001);
    expect(result[0]!.intensity).toBeCloseTo(1, 5);
  });

  it('intensity = 0.4 for exactly 2 sweep candles', () => {
    const swingTs = 1_000_000;
    const candles = Array.from({ length: 2 }, (_, i) =>
      makeCandle(98, 101.5, 97, 97, swingTs + (i + 1) * 3_600_000),
    );
    const result = detectHistoricalSweeps(candles, [makeSwing(100, 'high', swingTs)], 0.001);
    expect(result[0]!.intensity).toBeCloseTo(0.4, 5);
  });

  it('cluster width equals 0.2% of the swing price', () => {
    const swingPrice = 50_000;
    const swingTs = 1_000_000;
    const candle = makeCandle(50_100, 50_800, 49_800, 50_100, swingTs + 3_600_000);
    const result = detectHistoricalSweeps([candle], [makeSwing(swingPrice, 'low', swingTs)], 0.001);
    for (const c of result) {
      expect(c.width).toBeCloseTo(swingPrice * 0.002, 5);
    }
  });

  it('accumulates sweep counts across multiple swings at the same price', () => {
    const swingTs = 1_000_000;
    const swings = [
      makeSwing(100, 'high', swingTs),
      makeSwing(100, 'high', swingTs + 1_000),
    ];
    // One candle sweeps both → count accumulates to 2 → intensity = 0.4
    const result = detectHistoricalSweeps(
      [makeCandle(98, 101.5, 97, 97, swingTs + 3_600_000)],
      swings,
      0.001,
    );
    expect(result[0]!.intensity).toBeCloseTo(0.4, 5);
  });

  it('does not detect a sweep when the candle does not reverse below the swing', () => {
    const swingTs = 1_000_000;
    // high > 100.1 BUT close = 103 > 100 (did not reverse)
    const result = detectHistoricalSweeps(
      [makeCandle(103, 104, 99, 103, swingTs + 3_600_000)],
      [makeSwing(100, 'high', swingTs)],
      0.001,
    );
    expect(result).toHaveLength(0);
  });
});

// ─── 7. dbscanCluster ────────────────────────────────────────────────

describe('dbscanCluster', () => {
  it('returns an empty array for an empty price list', () => {
    expect(dbscanCluster([], 0.005, 2)).toHaveLength(0);
  });

  it('returns an empty array when no group reaches the minPoints threshold', () => {
    // All three prices are 50% apart — no pair within eps=0.001
    expect(dbscanCluster([100, 200, 300], 0.001, 3)).toHaveLength(0);
  });

  it('groups prices within eps into a single cluster', () => {
    const clusters = dbscanCluster([100, 100.2, 100.4], 0.005, 2);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(3);
  });

  it('produces two separate clusters for two well-separated groups', () => {
    const clusters = dbscanCluster([100, 100.2, 100.4, 200, 200.3, 200.5], 0.005, 2);
    expect(clusters).toHaveLength(2);
  });

  it('does not assign the same price to two clusters', () => {
    const all = dbscanCluster([100, 100.2, 100.4, 200, 200.3], 0.005, 2).flat();
    expect(all.length).toBe(new Set(all).size);
  });

  it('each cluster is sorted in ascending price order', () => {
    const clusters = dbscanCluster([100.4, 100.0, 100.3, 100.1, 100.2], 0.005, 2);
    expect(clusters).toHaveLength(1);
    const c = clusters[0]!;
    for (let i = 1; i < c.length; i++) {
      expect(c[i]).toBeGreaterThanOrEqual(c[i - 1]!);
    }
  });

  it('respects minPoints — an isolated single point is never a cluster', () => {
    const clusters = dbscanCluster([100, 100.1, 500], 0.005, 2);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).not.toContain(500);
  });

  it('eps is relative (percentage): 0.4% apart clusters, 0.6% apart does not', () => {
    expect(dbscanCluster([10, 10.04], 0.005, 2)).toHaveLength(1);  // 0.4% < 0.5%
    expect(dbscanCluster([10, 10.06], 0.005, 2)).toHaveLength(0);  // 0.6% > 0.5%
  });

  it('a single price forms a cluster when minPoints = 1', () => {
    const clusters = dbscanCluster([42], 0.005, 1);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toEqual([42]);
  });

  it('a group smaller than minPoints is excluded', () => {
    // 3 prices in range, but minPoints=4 → no cluster
    expect(dbscanCluster([100, 100.1, 100.2], 0.005, 4)).toHaveLength(0);
  });
});

// ─── 8. dbscanSLTPClusters ────────────────────────────────────────────

describe('dbscanSLTPClusters', () => {
  it('returns an empty array for an empty input', () => {
    expect(dbscanSLTPClusters([], 0.005, 2)).toHaveLength(0);
  });

  it('returns empty when no group reaches minPoints', () => {
    const input: SLTPCluster[] = [
      { price: 100, width: 1, intensity: 0.5, sources: ['swing-cluster'], type: 'stop-loss', side: 'long' },
      { price: 200, width: 1, intensity: 0.5, sources: ['swing-cluster'], type: 'stop-loss', side: 'long' },
    ];
    expect(dbscanSLTPClusters(input, 0.005, 3)).toHaveLength(0);
  });

  it('merges nearby input clusters into a single output cluster tagged with dbscan', () => {
    const base = 50_000;
    const input: SLTPCluster[] = [
      { price: base,         width: 50, intensity: 0.4, sources: ['swing-cluster'], type: 'stop-loss', side: 'long' },
      { price: base * 1.002, width: 50, intensity: 0.4, sources: ['swing-cluster'], type: 'stop-loss', side: 'long' },
      { price: base * 1.004, width: 50, intensity: 0.4, sources: ['round-number'],  type: 'stop-loss', side: 'long' },
    ];
    const result = dbscanSLTPClusters(input, 0.005, 2);
    expect(result).toHaveLength(1);
    expect(result[0]!.sources).toContain('dbscan');
  });

  it('output price equals the centroid of the merged prices', () => {
    const p = [50_000, 50_100, 50_200];
    const input: SLTPCluster[] = p.map((price) => ({
      price,
      width: 10,
      intensity: 0.4,
      sources: ['swing-cluster'] as SLTPCluster['sources'],
      type: 'stop-loss' as const,
      side: 'long' as const,
    }));
    const result = dbscanSLTPClusters(input, 0.005, 2);
    expect(result[0]!.price).toBeCloseTo((p[0]! + p[1]! + p[2]!) / 3, 2);
  });

  it('inherits the majority type from contributing clusters', () => {
    const base = 50_000;
    const input: SLTPCluster[] = [
      { price: base,         width: 10, intensity: 0.4, sources: ['swing-cluster'], type: 'stop-loss',  side: 'long' },
      { price: base * 1.001, width: 10, intensity: 0.4, sources: ['swing-cluster'], type: 'stop-loss',  side: 'long' },
      { price: base * 1.002, width: 10, intensity: 0.4, sources: ['round-number'],  type: 'take-profit', side: 'long' },
    ];
    expect(dbscanSLTPClusters(input, 0.005, 2)[0]!.type).toBe('stop-loss');
  });

  it('inherits the majority side from contributing clusters', () => {
    const base = 50_000;
    const input: SLTPCluster[] = [
      { price: base,         width: 10, intensity: 0.4, sources: ['swing-cluster'], type: 'stop-loss', side: 'long' },
      { price: base * 1.001, width: 10, intensity: 0.4, sources: ['swing-cluster'], type: 'stop-loss', side: 'long' },
      { price: base * 1.002, width: 10, intensity: 0.4, sources: ['round-number'],  type: 'stop-loss', side: 'short' },
    ];
    expect(dbscanSLTPClusters(input, 0.005, 2)[0]!.side).toBe('long');
  });

  it('intensity = min(1, clusterSize / 10) — 10-point cluster reaches 1', () => {
    const base = 50_000;
    const input: SLTPCluster[] = Array.from({ length: 10 }, (_, i) => ({
      price: base + i * 5,
      width: 5,
      intensity: 0.4,
      sources: ['swing-cluster'] as SLTPCluster['sources'],
      type: 'stop-loss' as const,
      side: 'long' as const,
    }));
    expect(dbscanSLTPClusters(input, 0.005, 2)[0]!.intensity).toBeCloseTo(1, 5);
  });

  it('keeps two well-separated groups as two distinct output clusters', () => {
    const buildGroup = (base: number): SLTPCluster[] =>
      [0, 1, 2].map((i) => ({
        price: base + i * 10,
        width: 5,
        intensity: 0.3,
        sources: ['swing-cluster'] as SLTPCluster['sources'],
        type: 'stop-loss' as const,
        side: 'long' as const,
      }));

    const result = dbscanSLTPClusters(
      [...buildGroup(50_000), ...buildGroup(55_000)],
      0.005,
      2,
    );
    expect(result).toHaveLength(2);
  });
});

// ─── 9. computeCompositeScores ────────────────────────────────────────

describe('computeCompositeScores', () => {
  it('returns an empty array for an empty input', () => {
    expect(computeCompositeScores([], DEFAULT_SLTP_CONFIG.weights, 100)).toHaveLength(0);
  });

  it('groups clusters that fall into the same price bucket', () => {
    const input: SLTPCluster[] = [
      { price: 50_050, width: 10, intensity: 0.3, sources: ['swing-cluster'],    type: 'stop-loss', side: 'long' },
      { price: 50_080, width: 10, intensity: 0.3, sources: ['liquidation-math'], type: 'stop-loss', side: 'long' },
    ];
    // bucketSize=100 → both round to 50 100 → one composite bucket
    const result = computeCompositeScores(input, DEFAULT_SLTP_CONFIG.weights, 100);
    expect(result.filter((c) => c.type === 'stop-loss' && c.side === 'long')).toHaveLength(1);
  });

  it('keeps well-separated clusters in different buckets', () => {
    const input: SLTPCluster[] = [
      { price: 50_000, width: 10, intensity: 0.3, sources: ['swing-cluster'], type: 'stop-loss', side: 'long' },
      { price: 51_000, width: 10, intensity: 0.3, sources: ['swing-cluster'], type: 'stop-loss', side: 'long' },
    ];
    expect(computeCompositeScores(input, DEFAULT_SLTP_CONFIG.weights, 100).length).toBeGreaterThanOrEqual(2);
  });

  it('composite intensity = intensity × weight for a single-source cluster', () => {
    const intensity = 0.5;
    // liquidation-math weight in DEFAULT_SLTP_CONFIG = 0.3
    const input: SLTPCluster[] = [
      { price: 50_000, width: 10, intensity, sources: ['liquidation-math'], type: 'stop-loss', side: 'long' },
    ];
    const result = computeCompositeScores(input, DEFAULT_SLTP_CONFIG.weights, 100);
    expect(result[0]!.intensity).toBeCloseTo(intensity * 0.3, 5);
  });

  it('composite intensity is capped at 1.0', () => {
    const input: SLTPCluster[] = Array.from({ length: 30 }, () => ({
      price: 50_000,
      width: 10,
      intensity: 1,
      sources: ['liquidation-math'] as SLTPCluster['sources'],
      type: 'stop-loss' as const,
      side: 'long' as const,
    }));
    expect(computeCompositeScores(input, DEFAULT_SLTP_CONFIG.weights, 100)[0]!.intensity).toBeLessThanOrEqual(1);
  });

  it('output is sorted in descending order of intensity', () => {
    const input: SLTPCluster[] = [
      { price: 50_000, width: 10, intensity: 0.1, sources: ['round-number'],     type: 'stop-loss', side: 'long' },
      { price: 51_000, width: 10, intensity: 0.9, sources: ['liquidation-math'], type: 'stop-loss', side: 'long' },
      { price: 52_000, width: 10, intensity: 0.5, sources: ['swing-cluster'],    type: 'stop-loss', side: 'long' },
    ];
    const result = computeCompositeScores(input, DEFAULT_SLTP_CONFIG.weights, 100);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.intensity).toBeLessThanOrEqual(result[i - 1]!.intensity);
    }
  });

  it('every output cluster includes the composite source tag', () => {
    const input: SLTPCluster[] = [
      { price: 50_000, width: 10, intensity: 0.5, sources: ['swing-cluster'], type: 'stop-loss', side: 'long' },
    ];
    expect(
      computeCompositeScores(input, DEFAULT_SLTP_CONFIG.weights, 100).every((c) =>
        c.sources.includes('composite'),
      ),
    ).toBe(true);
  });

  it('stop-loss and take-profit at the same bucket price are kept in separate entries', () => {
    const input: SLTPCluster[] = [
      { price: 50_000, width: 10, intensity: 0.5, sources: ['swing-cluster'], type: 'stop-loss',  side: 'long' },
      { price: 50_000, width: 10, intensity: 0.5, sources: ['swing-cluster'], type: 'take-profit', side: 'long' },
    ];
    const result = computeCompositeScores(input, DEFAULT_SLTP_CONFIG.weights, 100);
    expect(result.some((c) => c.type === 'stop-loss')).toBe(true);
    expect(result.some((c) => c.type === 'take-profit')).toBe(true);
  });

  it('bucket width equals the maximum width among contributors', () => {
    const input: SLTPCluster[] = [
      { price: 50_000, width: 20, intensity: 0.3, sources: ['swing-cluster'],    type: 'stop-loss', side: 'long' },
      { price: 50_050, width: 80, intensity: 0.3, sources: ['liquidation-math'], type: 'stop-loss', side: 'long' },
    ];
    const result = computeCompositeScores(input, DEFAULT_SLTP_CONFIG.weights, 100);
    expect(result.find((c) => c.type === 'stop-loss' && c.side === 'long')!.width).toBeCloseTo(80, 4);
  });

  it('passes through original algorithm source tags alongside composite', () => {
    // Both clusters must land in the same bucket for their sources to merge.
    // bucketSize=100: Math.round(50_000/100)*100 = 50_000 and
    //                 Math.round(50_040/100)*100 = 50_000 → same bucket.
    const input: SLTPCluster[] = [
      { price: 50_000, width: 10, intensity: 0.5, sources: ['swing-cluster'],    type: 'stop-loss', side: 'long' },
      { price: 50_040, width: 10, intensity: 0.5, sources: ['liquidation-math'], type: 'stop-loss', side: 'long' },
    ];
    const allSources = computeCompositeScores(input, DEFAULT_SLTP_CONFIG.weights, 100)
      .flatMap((c) => c.sources);
    expect(allSources).toContain('swing-cluster');
    expect(allSources).toContain('liquidation-math');
    expect(allSources).toContain('composite');
  });
});

// ─── 10. computeSLTPHeatmap (full integration) ────────────────────────

describe('computeSLTPHeatmap', () => {
  it('returns a zero-intensity empty heatmap for an empty candle array', () => {
    const result = computeSLTPHeatmap([], testConfig);
    expect(result.cells).toHaveLength(0);
    expect(result.slClusters).toHaveLength(0);
    expect(result.tpClusters).toHaveLength(0);
    expect(result.maxIntensity).toBe(0);
    expect(result.priceBucketSize).toBeGreaterThan(0);
  });

  it('returns a heatmap with the correct top-level fields', () => {
    const result = computeSLTPHeatmap(makeZigzagCandles(), testConfig);
    expect(result).toHaveProperty('cells');
    expect(result).toHaveProperty('maxIntensity');
    expect(result).toHaveProperty('priceBucketSize');
    expect(result).toHaveProperty('slClusters');
    expect(result).toHaveProperty('tpClusters');
  });

  it('every slCluster has type stop-loss', () => {
    expect(
      computeSLTPHeatmap(makeZigzagCandles(), testConfig)
        .slClusters.every((c) => c.type === 'stop-loss'),
    ).toBe(true);
  });

  it('every tpCluster has type take-profit', () => {
    expect(
      computeSLTPHeatmap(makeZigzagCandles(), testConfig)
        .tpClusters.every((c) => c.type === 'take-profit'),
    ).toBe(true);
  });

  it('heatmap cells have non-negative slIntensity and tpIntensity', () => {
    for (const cell of computeSLTPHeatmap(makeZigzagCandles(), testConfig).cells) {
      expect(cell.slIntensity).toBeGreaterThanOrEqual(0);
      expect(cell.tpIntensity).toBeGreaterThanOrEqual(0);
    }
  });

  it('maxIntensity equals the actual maximum of (slIntensity + tpIntensity) across cells', () => {
    const result = computeSLTPHeatmap(makeZigzagCandles(), testConfig);
    let computed = 0;
    for (const cell of result.cells) {
      const total = cell.slIntensity + cell.tpIntensity;
      if (total > computed) computed = total;
    }
    expect(result.maxIntensity).toBeCloseTo(computed, 5);
  });

  it('every cell has all required fields', () => {
    for (const cell of computeSLTPHeatmap(makeZigzagCandles(), testConfig).cells) {
      expect(cell).toHaveProperty('price');
      expect(cell).toHaveProperty('timestamp');
      expect(cell).toHaveProperty('slIntensity');
      expect(cell).toHaveProperty('tpIntensity');
      expect(cell).toHaveProperty('dominantSide');
    }
  });

  it('auto-detects a positive priceBucketSize when config value is 0', () => {
    const config: SLTPConfig = { ...testConfig, priceBucketSize: 0 };
    expect(computeSLTPHeatmap(makeZigzagCandles(), config).priceBucketSize).toBeGreaterThan(0);
  });

  it('uses provided positions for liquidation-math and produces a cluster at the expected price', () => {
    const entry = 60_000;
    const lev = 50;
    const positions: EstimatedPosition[] = [makePosition(entry, 'long', lev, 1_000)];
    const config: SLTPConfig = { ...testConfig, algorithms: ['liquidation-math'] };
    const candles = makeCandles(Array.from({ length: 5 }, (_, i) => ({ close: 60_000 + i * 100 })));
    const result = computeSLTPHeatmap(candles, config, positions);

    // 60 000 × (1 − 1/50) = 58 800
    const expectedLiq = entry * (1 - 1 / lev);
    expect(result.slClusters.some((c) => Math.abs(c.price - expectedLiq) < 300)).toBe(true);
  });

  it('only produces round-number sources when algorithms = ["round-number"]', () => {
    // Use candles centred around 50 250 with roundNumberInterval=1 000 so that
    // levels like 49 000, 50 000, 51 000 fall inside the price range.
    const candles = makeCandles(
      Array.from({ length: 10 }, (_, i) => ({
        close: 50_250 + i * 10,
        high:  50_500 + i * 10,
        low:   49_800 + i * 10,
      })),
    );
    const config: SLTPConfig = {
      ...testConfig,
      algorithms: ['round-number'],
      roundNumberInterval: 1_000,
    };
    const result = computeSLTPHeatmap(candles, config);
    const allSources = [...result.slClusters, ...result.tpClusters].flatMap((c) => c.sources);
    expect(allSources).toContain('round-number');
    expect(allSources).not.toContain('liquidation-math');
    expect(allSources).not.toContain('swing-cluster');
  });

  it('produces both SL and TP clusters from the zigzag swing series', () => {
    const config: SLTPConfig = { ...testConfig, algorithms: ['swing-cluster'] };
    const result = computeSLTPHeatmap(makeZigzagCandles(), config);
    expect(result.slClusters.length).toBeGreaterThan(0);
    expect(result.tpClusters.length).toBeGreaterThan(0);
  });

  it('cell prices are multiples of priceBucketSize', () => {
    const config: SLTPConfig = { ...testConfig, priceBucketSize: 10 };
    for (const cell of computeSLTPHeatmap(makeZigzagCandles(), config).cells) {
      expect(Math.round(cell.price) % config.priceBucketSize).toBe(0);
    }
  });

  it('running with an empty algorithms list produces no clusters', () => {
    const config: SLTPConfig = { ...testConfig, algorithms: [] };
    const result = computeSLTPHeatmap(makeZigzagCandles(), config);
    expect(result.slClusters).toHaveLength(0);
    expect(result.tpClusters).toHaveLength(0);
  });

  it('historical-sweep algorithm detects swept levels and adds clusters', () => {
    // Zigzag has a swing high at index 3 (high=120).  Index 6 sweeps it then reverses.
    // We extend the series so the sweep candle (index 6: high=130, close=114) is present.
    const candles = makeCandles([
      { close: 100, high: 101, low:  99 }, // 0
      { close: 103, high: 105, low: 102 }, // 1
      { close: 107, high: 110, low: 106 }, // 2
      { close: 112, high: 120, low: 111 }, // 3 — swing HIGH
      { close: 109, high: 113, low: 108 }, // 4
      { close: 106, high: 108, low: 105 }, // 5
      { close: 114, high: 130, low: 113 }, // 6 — sweeps swing high (130 > 120.12, 114 < 120)
      { close: 110, high: 112, low: 109 }, // 7
      { close: 108, high: 110, low: 107 }, // 8
      { close: 106, high: 108, low: 105 }, // 9
    ]);
    const config: SLTPConfig = { ...testConfig, algorithms: ['historical-sweep'], swingStrength: 2 };
    const result = computeSLTPHeatmap(candles, config);
    const sweepSources = [...result.slClusters, ...result.tpClusters]
      .flatMap((c) => c.sources)
      .filter((s) => s === 'historical-sweep');
    expect(sweepSources.length).toBeGreaterThan(0);
  });

  it('composite algorithm produces composite-tagged clusters', () => {
    const config: SLTPConfig = { ...testConfig, algorithms: ['swing-cluster', 'composite'] };
    const result = computeSLTPHeatmap(makeZigzagCandles(), config);
    const allSources = [...result.slClusters, ...result.tpClusters].flatMap((c) => c.sources);
    expect(allSources).toContain('composite');
  });

  it('full pipeline with all algorithms produces non-empty SL and TP clusters with positive maxIntensity', () => {
    const candles = makeCandles(
      Array.from({ length: 20 }, (_, i) => ({
        close: 50_000 + (i % 4 < 2 ? i * 200 : -i * 100),
        high:  50_200 + (i % 4 < 2 ? i * 200 : -i * 100),
        low:   49_800 + (i % 4 < 2 ? i * 200 : -i * 100),
      })),
    );
    const result = computeSLTPHeatmap(candles, DEFAULT_SLTP_CONFIG);
    expect(result.slClusters.length).toBeGreaterThan(0);
    expect(result.tpClusters.length).toBeGreaterThan(0);
    expect(result.maxIntensity).toBeGreaterThan(0);
  });
});
