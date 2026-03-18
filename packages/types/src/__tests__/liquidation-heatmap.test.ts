import { describe, it, expect } from 'vitest';
import { buildLiquidationHeatmap } from '../market/liquidation-heatmap.js';
import type { LiquidationEvent, LiquidationHeatmapConfig } from '../index.js';

function makeLiq(price: number, amount: number, side: 'buy' | 'sell', ts: number): LiquidationEvent {
  return { exchange: 'simulated', symbol: 'BTC/USDT', side, price, amount, timestamp: ts };
}

const config: LiquidationHeatmapConfig = {
  priceBucketSize: 100,
  timeBucketMs: 60_000,
  maxEvents: 5000,
};

describe('buildLiquidationHeatmap', () => {
  it('should return empty for no events', () => {
    const result = buildLiquidationHeatmap([], config);
    expect(result.cells).toHaveLength(0);
    expect(result.maxVolume).toBe(0);
  });

  it('should bucket events by price and time', () => {
    const events = [
      makeLiq(50050, 0.5, 'buy', 1000000),
      makeLiq(50080, 0.3, 'sell', 1010000),  // same price bucket (50000), same time bucket
      makeLiq(50150, 1.0, 'buy', 1000000),   // different price bucket (50100)
    ];

    const result = buildLiquidationHeatmap(events, config);
    expect(result.cells).toHaveLength(2); // two distinct price buckets
  });

  it('should separate long and short liquidation volumes', () => {
    const events = [
      makeLiq(50000, 1, 'buy', 1000000),   // long liq: 50000 * 1 = 50000
      makeLiq(50000, 0.5, 'sell', 1000000), // short liq: 50000 * 0.5 = 25000
    ];

    const result = buildLiquidationHeatmap(events, config);
    expect(result.cells).toHaveLength(1);
    expect(result.cells[0]!.longVolume).toBe(50000);
    expect(result.cells[0]!.shortVolume).toBe(25000);
    expect(result.cells[0]!.count).toBe(2);
  });

  it('should compute maxVolume correctly', () => {
    const events = [
      makeLiq(50000, 2, 'buy', 1000000),    // vol = 100000
      makeLiq(50200, 0.5, 'sell', 1000000),  // vol = 25100
    ];

    const result = buildLiquidationHeatmap(events, config);
    expect(result.maxVolume).toBe(100000);
  });

  it('should auto-detect price bucket size', () => {
    const events = [
      makeLiq(50000, 1, 'buy', 1000000),
      makeLiq(51000, 1, 'sell', 1000000),
    ];

    const autoConfig: LiquidationHeatmapConfig = { priceBucketSize: 0, timeBucketMs: 60_000, maxEvents: 5000 };
    const result = buildLiquidationHeatmap(events, autoConfig);
    // Range = 1000, target 50 buckets → bucket ~20
    expect(result.priceBucketSize).toBeCloseTo(20, 0);
    expect(result.cells.length).toBeGreaterThan(0);
  });

  it('should split by time buckets', () => {
    const events = [
      makeLiq(50000, 1, 'buy', 0),       // time bucket 0
      makeLiq(50000, 1, 'sell', 120_000), // time bucket 120000 (different minute)
    ];

    const result = buildLiquidationHeatmap(events, config);
    expect(result.cells).toHaveLength(2); // same price bucket, different time buckets
  });
});
