import { describe, it, expect } from 'vitest';
import type { OHLCVCandle, EstimatedPosition, SLTPConfig } from '@terminal/types';
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

function makeCandle(
  ts: number,
  o: number,
  h: number,
  l: number,
  c: number,
  vol = 100,
): OHLCVCandle {
  return {
    exchange: 'simulated',
    symbol: 'BTC/USDT',
    timeframe: '1h',
    timestamp: ts,
    open: o,
    high: h,
    low: l,
    close: c,
    volume: vol,
    buyVolume: vol * 0.5,
    sellVolume: vol * 0.5,
    tradeCount: 10,
    closed: true,
  };
}

function makeSwingCandles(): OHLCVCandle[] {
  // Create pattern: uptrend → swing high → downtrend → swing low → uptrend
  const base = 50000;
  return [
    makeCandle(1000, base, base + 50, base - 50, base + 30),       // 0
    makeCandle(2000, base + 30, base + 80, base - 10, base + 70),  // 1
    makeCandle(3000, base + 70, base + 120, base + 40, base + 100), // 2
    makeCandle(4000, base + 100, base + 200, base + 80, base + 180), // 3 - swing high candidate
    makeCandle(5000, base + 180, base + 190, base + 100, base + 110), // 4
    makeCandle(6000, base + 110, base + 130, base + 50, base + 60),  // 5
    makeCandle(7000, base + 60, base + 80, base - 100, base - 80),   // 6 - swing low candidate
    makeCandle(8000, base - 80, base - 30, base - 120, base - 50),   // 7
    makeCandle(9000, base - 50, base + 20, base - 60, base + 10),    // 8
    makeCandle(10000, base + 10, base + 60, base - 20, base + 50),   // 9
  ];
}

describe('computeLiquidationLevels', () => {
  it('should compute long liquidation prices correctly', () => {
    const positions: EstimatedPosition[] = [
      { entryPrice: 50000, leverage: 10, side: 'long' },
    ];

    const clusters = computeLiquidationLevels(positions, [10]);
    expect(clusters).toHaveLength(1);
    // long_liquidation = 50000 * (1 - 1/10) = 45000
    expect(clusters[0]!.price).toBeCloseTo(45000, 0);
    expect(clusters[0]!.type).toBe('stop-loss');
    expect(clusters[0]!.side).toBe('long');
  });

  it('should compute short liquidation prices correctly', () => {
    const positions: EstimatedPosition[] = [
      { entryPrice: 50000, leverage: 10, side: 'short' },
    ];

    const clusters = computeLiquidationLevels(positions, [10]);
    expect(clusters).toHaveLength(1);
    // short_liquidation = 50000 * (1 + 1/10) = 55000
    expect(clusters[0]!.price).toBeCloseTo(55000, 0);
    expect(clusters[0]!.type).toBe('stop-loss');
    expect(clusters[0]!.side).toBe('short');
  });

  it('should generate clusters for multiple leverage levels', () => {
    const positions: EstimatedPosition[] = [
      { entryPrice: 50000, leverage: 1, side: 'long' },
    ];

    const clusters = computeLiquidationLevels(positions, [5, 10, 25, 50, 100]);
    // 1x leverage, so the function uses the provided leverage levels
    expect(clusters.length).toBe(5);

    // 5x: 50000 * (1 - 1/5) = 40000
    expect(clusters[0]!.price).toBeCloseTo(40000, 0);
    // 10x: 50000 * (1 - 1/10) = 45000
    expect(clusters[1]!.price).toBeCloseTo(45000, 0);
  });

  it('should return empty for empty positions', () => {
    const clusters = computeLiquidationLevels([], [10, 25]);
    expect(clusters).toHaveLength(0);
  });
});

describe('detectSwingPoints', () => {
  it('should detect swing highs and lows', () => {
    const candles = makeSwingCandles();
    const swings = detectSwingPoints(candles, 2);
    expect(swings.length).toBeGreaterThan(0);

    const highs = swings.filter((s) => s.type === 'high');
    const lows = swings.filter((s) => s.type === 'low');
    expect(highs.length).toBeGreaterThanOrEqual(1);
    expect(lows.length).toBeGreaterThanOrEqual(1);
  });

  it('should return empty for insufficient data', () => {
    const candles = [makeCandle(1000, 50000, 50100, 49900, 50050)];
    const swings = detectSwingPoints(candles, 3);
    expect(swings).toHaveLength(0);
  });

  it('should respect swing strength parameter', () => {
    const candles = makeSwingCandles();
    const weakSwings = detectSwingPoints(candles, 1);
    const strongSwings = detectSwingPoints(candles, 3);
    // Weaker strength should find more swings
    expect(weakSwings.length).toBeGreaterThanOrEqual(strongSwings.length);
  });
});

describe('clusterSwingPoints', () => {
  it('should cluster nearby swing points', () => {
    const candles = makeSwingCandles();
    const swings = detectSwingPoints(candles, 2);
    const clusters = clusterSwingPoints(swings, 0.01); // 1% tolerance
    expect(clusters.length).toBeGreaterThan(0);
  });

  it('should return empty for no swings', () => {
    const clusters = clusterSwingPoints([], 0.01);
    expect(clusters).toHaveLength(0);
  });

  it('should produce both SL and TP clusters from swing highs', () => {
    const candles = makeSwingCandles();
    const swings = detectSwingPoints(candles, 1);
    const clusters = clusterSwingPoints(swings, 0.05);

    const slClusters = clusters.filter((c) => c.type === 'stop-loss');
    const tpClusters = clusters.filter((c) => c.type === 'take-profit');
    expect(slClusters.length).toBeGreaterThan(0);
    expect(tpClusters.length).toBeGreaterThan(0);
  });
});

describe('computeATR', () => {
  it('should compute ATR from candles', () => {
    const candles = [
      makeCandle(1000, 100, 110, 90, 105),
      makeCandle(2000, 105, 115, 95, 100),
      makeCandle(3000, 100, 108, 92, 98),
    ];
    const atr = computeATR(candles, 14);
    expect(atr).toBeGreaterThan(0);
    // True ranges: ~20, ~20, ~16 → avg 18
    expect(atr).toBeCloseTo(18, 0);
  });

  it('should return 0 for single candle', () => {
    const candles = [makeCandle(1000, 100, 110, 90, 105)];
    const atr = computeATR(candles, 14);
    expect(atr).toBe(0);
  });
});

describe('computeRoundNumberLevels', () => {
  it('should find round number levels around current price', () => {
    const clusters = computeRoundNumberLevels(50250, 100, 500, 1.5, 2000);
    expect(clusters.length).toBeGreaterThan(0);

    // Should find levels at 49500, 49600, ..., 50000, 50100, ..., 51000, etc.
    const prices = clusters.map((c) => c.price);
    expect(prices.some((p) => p === 50000)).toBe(true);
    expect(prices.some((p) => p === 50100)).toBe(true);
  });

  it('should skip levels too close to current price', () => {
    const clusters = computeRoundNumberLevels(50000, 100, 500, 1.5, 2000);
    // 50000 should be skipped (within 0.1% of current price)
    const exactMatch = clusters.filter((c) => c.price === 50000);
    expect(exactMatch).toHaveLength(0);
  });

  it('should mark below-price as SL for longs, TP for shorts', () => {
    const clusters = computeRoundNumberLevels(50250, 500, 500, 1.5, 2000);
    const below = clusters.filter((c) => c.price < 50250);
    const belowLongSL = below.filter((c) => c.side === 'long' && c.type === 'stop-loss');
    const belowShortTP = below.filter((c) => c.side === 'short' && c.type === 'take-profit');
    expect(belowLongSL.length).toBeGreaterThan(0);
    expect(belowShortTP.length).toBeGreaterThan(0);
  });
});

describe('dbscanCluster', () => {
  it('should cluster nearby prices', () => {
    const prices = [100, 101, 102, 200, 201, 202, 300];
    const clusters = dbscanCluster(prices, 0.02, 2);
    expect(clusters.length).toBeGreaterThanOrEqual(2);
  });

  it('should return empty for empty input', () => {
    const clusters = dbscanCluster([], 0.01, 2);
    expect(clusters).toHaveLength(0);
  });

  it('should not cluster distant points', () => {
    const prices = [100, 200, 300, 400, 500];
    const clusters = dbscanCluster(prices, 0.001, 2); // very tight eps
    expect(clusters).toHaveLength(0);
  });
});

describe('computeCompositeScores', () => {
  it('should merge and weight clusters', () => {
    const clusters = [
      { price: 50000, width: 100, intensity: 0.8, sources: ['liquidation-math' as const], type: 'stop-loss' as const, side: 'long' as const },
      { price: 50010, width: 80, intensity: 0.6, sources: ['swing-cluster' as const], type: 'stop-loss' as const, side: 'long' as const },
    ];

    const result = computeCompositeScores(clusters, DEFAULT_SLTP_CONFIG.weights, 100);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.sources).toContain('composite');
  });

  it('should return empty for empty input', () => {
    const result = computeCompositeScores([], DEFAULT_SLTP_CONFIG.weights, 100);
    expect(result).toHaveLength(0);
  });
});

describe('computeSLTPHeatmap', () => {
  it('should return empty heatmap for no candles', () => {
    const result = computeSLTPHeatmap([], DEFAULT_SLTP_CONFIG);
    expect(result.cells).toHaveLength(0);
    expect(result.maxIntensity).toBe(0);
    expect(result.slClusters).toHaveLength(0);
    expect(result.tpClusters).toHaveLength(0);
  });

  it('should produce SL and TP clusters from candle data', () => {
    const candles = makeSwingCandles();
    const result = computeSLTPHeatmap(candles, DEFAULT_SLTP_CONFIG);

    expect(result.slClusters.length).toBeGreaterThan(0);
    expect(result.tpClusters.length).toBeGreaterThan(0);
    expect(result.cells.length).toBeGreaterThan(0);
    expect(result.maxIntensity).toBeGreaterThan(0);
  });

  it('should work with specific algorithms only', () => {
    const candles = makeSwingCandles();
    const config: SLTPConfig = {
      ...DEFAULT_SLTP_CONFIG,
      algorithms: ['round-number'],
    };

    const result = computeSLTPHeatmap(candles, config);
    // Should still produce clusters from round numbers
    const allSources = [...result.slClusters, ...result.tpClusters]
      .flatMap((c) => c.sources);
    expect(allSources).toContain('round-number');
  });

  it('should accept optional positions for better accuracy', () => {
    const candles = makeSwingCandles();
    const positions: EstimatedPosition[] = [
      { entryPrice: 50000, leverage: 10, side: 'long', size: 5000 },
      { entryPrice: 50000, leverage: 25, side: 'short', size: 3000 },
    ];

    const config: SLTPConfig = {
      ...DEFAULT_SLTP_CONFIG,
      algorithms: ['liquidation-math'],
    };

    const result = computeSLTPHeatmap(candles, config, positions);
    expect(result.slClusters.length).toBeGreaterThan(0);

    // Should have clusters at the known liquidation levels
    const liqPrices = result.slClusters.map((c) => c.price);
    // 10x long liq = 45000
    expect(liqPrices.some((p) => Math.abs(p - 45000) < 500)).toBe(true);
  });

  it('should auto-detect price bucket size', () => {
    const candles = makeSwingCandles();
    const config: SLTPConfig = {
      ...DEFAULT_SLTP_CONFIG,
      priceBucketSize: 0,
    };

    const result = computeSLTPHeatmap(candles, config);
    expect(result.priceBucketSize).toBeGreaterThan(0);
  });
});
