import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FOOTPRINT_CONFIG,
  DEFAULT_FOOTPRINT_FILTER,
  DEFAULT_HEATMAP_CONFIG,
  DEFAULT_MARKET_PROFILE_CONFIG,
  DEFAULT_TRADE_CLUSTER_CONFIG,
  DEFAULT_TIME_CLUSTER_CONFIG,
  DEFAULT_LIQUIDATION_HEATMAP_CONFIG,
  DEFAULT_MBO_PROFILE_CONFIG,
  DEFAULT_SLTP_CONFIG,
  DEFAULT_TICK_BAR_CONFIG,
  DEFAULT_VOLUME_BAR_CONFIG,
  DEFAULT_RANGE_BAR_CONFIG,
  DEFAULT_FOOTPRINT_DISPLAY_CONFIG,
} from '@terminal/types';

describe('DEFAULT_FOOTPRINT_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_FOOTPRINT_CONFIG).toBeDefined();
    expect(DEFAULT_FOOTPRINT_CONFIG.tickSize).toBe(1.0);
    expect(DEFAULT_FOOTPRINT_CONFIG.showDelta).toBe(true);
    expect(DEFAULT_FOOTPRINT_CONFIG.filter).toBeDefined();
  });
});

describe('DEFAULT_FOOTPRINT_FILTER', () => {
  it('has expected shape', () => {
    expect(DEFAULT_FOOTPRINT_FILTER).toBeDefined();
    expect(DEFAULT_FOOTPRINT_FILTER.mode).toBe('none');
    expect(typeof DEFAULT_FOOTPRINT_FILTER.minDelta).toBe('number');
    expect(typeof DEFAULT_FOOTPRINT_FILTER.minVolume).toBe('number');
  });
});

describe('DEFAULT_HEATMAP_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_HEATMAP_CONFIG).toBeDefined();
    expect(typeof DEFAULT_HEATMAP_CONFIG.priceBucketSize).toBe('number');
    expect(typeof DEFAULT_HEATMAP_CONFIG.maxColumns).toBe('number');
    expect(DEFAULT_HEATMAP_CONFIG.maxColumns).toBeGreaterThan(0);
    expect(DEFAULT_HEATMAP_CONFIG.captureIntervalMs).toBeGreaterThan(0);
  });
});

describe('DEFAULT_MARKET_PROFILE_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_MARKET_PROFILE_CONFIG).toBeDefined();
    expect(DEFAULT_MARKET_PROFILE_CONFIG.valueAreaPercent).toBe(0.70);
    expect(DEFAULT_MARKET_PROFILE_CONFIG.ibPeriodMinutes).toBe(60);
  });
});

describe('DEFAULT_TRADE_CLUSTER_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_TRADE_CLUSTER_CONFIG).toBeDefined();
    expect(DEFAULT_TRADE_CLUSTER_CONFIG.k).toBe(4);
    expect(DEFAULT_TRADE_CLUSTER_CONFIG.maxIterations).toBe(50);
    expect(DEFAULT_TRADE_CLUSTER_CONFIG.useCost).toBe(true);
  });
});

describe('DEFAULT_TIME_CLUSTER_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_TIME_CLUSTER_CONFIG).toBeDefined();
    expect(DEFAULT_TIME_CLUSTER_CONFIG.maxGapMs).toBe(500);
    expect(DEFAULT_TIME_CLUSTER_CONFIG.minTrades).toBe(3);
  });
});

describe('DEFAULT_LIQUIDATION_HEATMAP_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_LIQUIDATION_HEATMAP_CONFIG).toBeDefined();
    expect(DEFAULT_LIQUIDATION_HEATMAP_CONFIG.timeBucketMs).toBe(60_000);
    expect(DEFAULT_LIQUIDATION_HEATMAP_CONFIG.maxEvents).toBe(5000);
  });
});

describe('DEFAULT_MBO_PROFILE_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_MBO_PROFILE_CONFIG).toBeDefined();
    expect(DEFAULT_MBO_PROFILE_CONFIG.depthLevels).toBe(20);
    expect(DEFAULT_MBO_PROFILE_CONFIG.largeOrderThreshold).toBe(10);
    expect(DEFAULT_MBO_PROFILE_CONFIG.showOrderAge).toBe(true);
  });
});

describe('DEFAULT_SLTP_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_SLTP_CONFIG).toBeDefined();
    expect(Array.isArray(DEFAULT_SLTP_CONFIG.algorithms)).toBe(true);
    expect(DEFAULT_SLTP_CONFIG.algorithms.length).toBe(6);
    expect(Array.isArray(DEFAULT_SLTP_CONFIG.leverageLevels)).toBe(true);
  });
});

describe('DEFAULT_TICK_BAR_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_TICK_BAR_CONFIG).toBeDefined();
    expect(DEFAULT_TICK_BAR_CONFIG.tickCount).toBe(100);
    expect(DEFAULT_TICK_BAR_CONFIG.type).toBe('tick');
  });
});

describe('DEFAULT_VOLUME_BAR_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_VOLUME_BAR_CONFIG).toBeDefined();
    expect(DEFAULT_VOLUME_BAR_CONFIG.volumeThreshold).toBe(10);
    expect(DEFAULT_VOLUME_BAR_CONFIG.type).toBe('volume');
  });
});

describe('DEFAULT_RANGE_BAR_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_RANGE_BAR_CONFIG).toBeDefined();
    expect(typeof DEFAULT_RANGE_BAR_CONFIG.rangeSize).toBe('number');
    expect(DEFAULT_RANGE_BAR_CONFIG.rangeSize).toBeGreaterThan(0);
  });
});

describe('DEFAULT_FOOTPRINT_DISPLAY_CONFIG', () => {
  it('has expected shape', () => {
    expect(DEFAULT_FOOTPRINT_DISPLAY_CONFIG).toBeDefined();
    expect(DEFAULT_FOOTPRINT_DISPLAY_CONFIG.mode).toBe('bid-ask');
    expect(DEFAULT_FOOTPRINT_DISPLAY_CONFIG.highlightImbalances).toBe(true);
    expect(DEFAULT_FOOTPRINT_DISPLAY_CONFIG.showPOC).toBe(true);
  });
});
