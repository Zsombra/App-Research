import { describe, it, expect, beforeEach } from 'vitest';
import { useFootprintStore } from '../stores/footprint-store.js';
import { DEFAULT_FOOTPRINT_CONFIG, DEFAULT_FOOTPRINT_DISPLAY_CONFIG } from '@terminal/types';
import type { OHLCVCandle } from '@terminal/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCandle(overrides: Partial<OHLCVCandle> = {}): OHLCVCandle {
  return {
    exchange: 'simulated',
    symbol: 'BTC/USDT',
    timeframe: '1m',
    timestamp: 1700000000000,
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 10,
    buyVolume: 6,
    sellVolume: 4,
    tradeCount: 20,
    closed: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('footprint-store', () => {
  beforeEach(() => {
    useFootprintStore.setState({
      enabled: false,
      config: { ...DEFAULT_FOOTPRINT_CONFIG },
      displayConfig: { ...DEFAULT_FOOTPRINT_DISPLAY_CONFIG },
      footprints: new Map(),
    });
  });

  // -------------------------------------------------------------------------
  // setEnabled
  // -------------------------------------------------------------------------

  describe('setEnabled', () => {
    it('should set enabled to true', () => {
      useFootprintStore.getState().setEnabled(true);
      expect(useFootprintStore.getState().enabled).toBe(true);
    });

    it('should set enabled to false', () => {
      // Start from true, toggle to false
      useFootprintStore.setState({ enabled: true });
      useFootprintStore.getState().setEnabled(false);
      expect(useFootprintStore.getState().enabled).toBe(false);
    });

    it('should toggle enabled state multiple times', () => {
      useFootprintStore.getState().setEnabled(true);
      expect(useFootprintStore.getState().enabled).toBe(true);

      useFootprintStore.getState().setEnabled(false);
      expect(useFootprintStore.getState().enabled).toBe(false);

      useFootprintStore.getState().setEnabled(true);
      expect(useFootprintStore.getState().enabled).toBe(true);
    });

    it('should not affect other state fields when toggling enabled', () => {
      const configBefore = useFootprintStore.getState().config;
      useFootprintStore.getState().setEnabled(true);
      expect(useFootprintStore.getState().config).toEqual(configBefore);
    });
  });

  // -------------------------------------------------------------------------
  // updateConfig
  // -------------------------------------------------------------------------

  describe('updateConfig', () => {
    it('should update tickSize', () => {
      useFootprintStore.getState().updateConfig('tickSize', 5);
      expect(useFootprintStore.getState().config.tickSize).toBe(5);
    });

    it('should update showDelta', () => {
      useFootprintStore.getState().updateConfig('showDelta', false);
      expect(useFootprintStore.getState().config.showDelta).toBe(false);
    });

    it('should update showNumbers', () => {
      useFootprintStore.getState().updateConfig('showNumbers', true);
      expect(useFootprintStore.getState().config.showNumbers).toBe(true);
    });

    it('should update minVolume', () => {
      useFootprintStore.getState().updateConfig('minVolume', 100);
      expect(useFootprintStore.getState().config.minVolume).toBe(100);
    });

    it('should preserve other config keys when updating one', () => {
      const { config: original } = useFootprintStore.getState();
      useFootprintStore.getState().updateConfig('tickSize', 2);

      const { config: updated } = useFootprintStore.getState();
      expect(updated.tickSize).toBe(2);
      expect(updated.showDelta).toBe(original.showDelta);
      expect(updated.showNumbers).toBe(original.showNumbers);
      expect(updated.minVolume).toBe(original.minVolume);
      expect(updated.filter).toEqual(original.filter);
    });

    it('should allow sequential updates to different keys', () => {
      useFootprintStore.getState().updateConfig('tickSize', 10);
      useFootprintStore.getState().updateConfig('showNumbers', true);
      useFootprintStore.getState().updateConfig('minVolume', 50);

      const { config } = useFootprintStore.getState();
      expect(config.tickSize).toBe(10);
      expect(config.showNumbers).toBe(true);
      expect(config.minVolume).toBe(50);
    });
  });

  // -------------------------------------------------------------------------
  // updateFilter
  // -------------------------------------------------------------------------

  describe('updateFilter', () => {
    it('should update filter mode', () => {
      useFootprintStore.getState().updateFilter('mode', 'min-volume');
      expect(useFootprintStore.getState().config.filter.mode).toBe('min-volume');
    });

    it('should update minVolume filter threshold', () => {
      useFootprintStore.getState().updateFilter('minVolume', 200);
      expect(useFootprintStore.getState().config.filter.minVolume).toBe(200);
    });

    it('should update minTrades filter threshold', () => {
      useFootprintStore.getState().updateFilter('minTrades', 10);
      expect(useFootprintStore.getState().config.filter.minTrades).toBe(10);
    });

    it('should update minDelta filter threshold', () => {
      useFootprintStore.getState().updateFilter('minDelta', 50);
      expect(useFootprintStore.getState().config.filter.minDelta).toBe(50);
    });

    it('should update percentile filter threshold', () => {
      useFootprintStore.getState().updateFilter('percentile', 75);
      expect(useFootprintStore.getState().config.filter.percentile).toBe(75);
    });

    it('should preserve other filter keys when updating one', () => {
      const { config: original } = useFootprintStore.getState();
      useFootprintStore.getState().updateFilter('minVolume', 500);

      const { config: updated } = useFootprintStore.getState();
      expect(updated.filter.minVolume).toBe(500);
      expect(updated.filter.mode).toBe(original.filter.mode);
      expect(updated.filter.minTrades).toBe(original.filter.minTrades);
      expect(updated.filter.minDelta).toBe(original.filter.minDelta);
      expect(updated.filter.percentile).toBe(original.filter.percentile);
    });

    it('should nest filter update inside config without clobbering top-level config fields', () => {
      useFootprintStore.getState().updateConfig('tickSize', 3);
      useFootprintStore.getState().updateFilter('mode', 'min-trades');

      const { config } = useFootprintStore.getState();
      expect(config.tickSize).toBe(3);
      expect(config.filter.mode).toBe('min-trades');
    });
  });

  // -------------------------------------------------------------------------
  // recompute
  // -------------------------------------------------------------------------

  describe('recompute', () => {
    it('should do nothing when disabled', () => {
      // enabled is false (set by beforeEach)
      const candles = [makeCandle()];
      useFootprintStore.getState().recompute('BTC/USDT', candles);
      expect(useFootprintStore.getState().footprints.size).toBe(0);
    });

    it('should do nothing with empty candles array', () => {
      useFootprintStore.setState({ enabled: true });
      useFootprintStore.getState().recompute('BTC/USDT', []);
      expect(useFootprintStore.getState().footprints.size).toBe(0);
    });

    it('should do nothing when both disabled and candles are empty', () => {
      useFootprintStore.getState().recompute('BTC/USDT', []);
      expect(useFootprintStore.getState().footprints.size).toBe(0);
    });

    it('should produce footprint data when enabled with valid candles', () => {
      useFootprintStore.setState({ enabled: true });
      const candles = [
        makeCandle({ timestamp: 1700000000000, high: 110, low: 90 }),
        makeCandle({ timestamp: 1700000060000, high: 115, low: 95 }),
      ];

      useFootprintStore.getState().recompute('BTC/USDT', candles);

      const footprints = useFootprintStore.getState().footprints;
      expect(footprints.size).toBe(1);
      const result = footprints.get('BTC/USDT');
      expect(result).toBeDefined();
      expect(result!.length).toBe(2);
    });

    it('should produce FootprintCandle objects with expected shape', () => {
      useFootprintStore.setState({ enabled: true });
      const candles = [makeCandle({ high: 110, low: 90, open: 100, close: 105 })];

      useFootprintStore.getState().recompute('BTC/USDT', candles);

      const result = useFootprintStore.getState().footprints.get('BTC/USDT');
      expect(result).toBeDefined();
      const fp = result![0]!;
      expect(fp.timestamp).toBe(candles[0]!.timestamp);
      expect(fp.open).toBe(100);
      expect(fp.high).toBe(110);
      expect(fp.low).toBe(90);
      expect(fp.close).toBe(105);
      expect(Array.isArray(fp.levels)).toBe(true);
      expect(fp.levels.length).toBeGreaterThan(0);
      expect(typeof fp.tickSize).toBe('number');
      expect(fp.tickSize).toBeGreaterThan(0);
      expect(typeof fp.maxLevelVolume).toBe('number');
    });

    it('should use explicit tickSize from config when set to non-zero', () => {
      useFootprintStore.setState({ enabled: true });
      useFootprintStore.getState().updateConfig('tickSize', 5);

      const candles = [makeCandle({ high: 110, low: 90 })];
      useFootprintStore.getState().recompute('BTC/USDT', candles);

      const result = useFootprintStore.getState().footprints.get('BTC/USDT');
      expect(result).toBeDefined();
      expect(result![0]!.tickSize).toBe(5);
    });

    it('should auto-detect tick size when config.tickSize is 0', () => {
      useFootprintStore.setState({ enabled: true });
      useFootprintStore.getState().updateConfig('tickSize', 0);

      const candles = [makeCandle({ high: 110, low: 90 })];
      useFootprintStore.getState().recompute('BTC/USDT', candles);

      const result = useFootprintStore.getState().footprints.get('BTC/USDT');
      expect(result).toBeDefined();
      // autoTickSize returns a positive value — should be applied
      expect(result![0]!.tickSize).toBeGreaterThan(0);
    });

    it('should not apply filter when filter.mode is none', () => {
      useFootprintStore.setState({ enabled: true });
      // filter.mode defaults to 'none' — all levels are kept
      const candles = [makeCandle({ high: 110, low: 90, buyVolume: 6, sellVolume: 4 })];

      useFootprintStore.getState().recompute('BTC/USDT', candles);

      const result = useFootprintStore.getState().footprints.get('BTC/USDT');
      expect(result).toBeDefined();
      // With mode 'none', no levels are stripped
      expect(result![0]!.levels.length).toBeGreaterThan(0);
    });

    it('should apply min-volume filter and remove levels below threshold', () => {
      useFootprintStore.setState({ enabled: true });
      // Set a very high minVolume so all levels are stripped
      useFootprintStore.getState().updateFilter('mode', 'min-volume');
      useFootprintStore.getState().updateFilter('minVolume', 1_000_000);

      const candles = [makeCandle({ high: 110, low: 90, volume: 10, buyVolume: 6, sellVolume: 4 })];
      useFootprintStore.getState().recompute('BTC/USDT', candles);

      const result = useFootprintStore.getState().footprints.get('BTC/USDT');
      expect(result).toBeDefined();
      // All levels should be filtered out because they are far below the threshold
      expect(result![0]!.levels.length).toBe(0);
    });

    it('should apply min-volume filter and keep levels above threshold', () => {
      useFootprintStore.setState({ enabled: true });
      useFootprintStore.getState().updateFilter('mode', 'min-volume');
      // Threshold of 0 means every level passes
      useFootprintStore.getState().updateFilter('minVolume', 0);

      const candles = [makeCandle({ high: 110, low: 90, buyVolume: 6, sellVolume: 4 })];
      useFootprintStore.getState().recompute('BTC/USDT', candles);

      const result = useFootprintStore.getState().footprints.get('BTC/USDT');
      expect(result).toBeDefined();
      expect(result![0]!.levels.length).toBeGreaterThan(0);
    });

    it('should apply min-trades filter', () => {
      useFootprintStore.setState({ enabled: true });
      useFootprintStore.getState().updateFilter('mode', 'min-trades');
      // An impossibly high trade count: all levels filtered out
      useFootprintStore.getState().updateFilter('minTrades', 999_999);

      const candles = [makeCandle({ high: 110, low: 90 })];
      useFootprintStore.getState().recompute('BTC/USDT', candles);

      const result = useFootprintStore.getState().footprints.get('BTC/USDT');
      expect(result).toBeDefined();
      expect(result![0]!.levels.length).toBe(0);
    });

    it('should apply min-delta filter', () => {
      useFootprintStore.setState({ enabled: true });
      useFootprintStore.getState().updateFilter('mode', 'min-delta');
      // When buyVolume === sellVolume per level, delta is 0 — threshold > 0 removes all
      useFootprintStore.getState().updateFilter('minDelta', 999_999);

      const candles = [makeCandle({ high: 110, low: 90, buyVolume: 5, sellVolume: 5 })];
      useFootprintStore.getState().recompute('BTC/USDT', candles);

      const result = useFootprintStore.getState().footprints.get('BTC/USDT');
      expect(result).toBeDefined();
      expect(result![0]!.levels.length).toBe(0);
    });

    it('should store results per symbol independently', () => {
      useFootprintStore.setState({ enabled: true });
      const btcCandles = [makeCandle({ symbol: 'BTC/USDT', high: 110, low: 90 })];
      const ethCandles = [
        makeCandle({ symbol: 'ETH/USDT', timestamp: 1700000000000, high: 2100, low: 1900 }),
      ];

      useFootprintStore.getState().recompute('BTC/USDT', btcCandles);
      useFootprintStore.getState().recompute('ETH/USDT', ethCandles);

      const footprints = useFootprintStore.getState().footprints;
      expect(footprints.size).toBe(2);
      expect(footprints.get('BTC/USDT')).toBeDefined();
      expect(footprints.get('ETH/USDT')).toBeDefined();
    });

    it('should overwrite previous footprint data for the same symbol on subsequent recomputes', () => {
      useFootprintStore.setState({ enabled: true });
      const firstCandles = [makeCandle({ timestamp: 1700000000000 })];
      const secondCandles = [
        makeCandle({ timestamp: 1700000000000 }),
        makeCandle({ timestamp: 1700000060000 }),
      ];

      useFootprintStore.getState().recompute('BTC/USDT', firstCandles);
      expect(useFootprintStore.getState().footprints.get('BTC/USDT')!.length).toBe(1);

      useFootprintStore.getState().recompute('BTC/USDT', secondCandles);
      expect(useFootprintStore.getState().footprints.get('BTC/USDT')!.length).toBe(2);
    });

    it('should preserve footprints for other symbols when recomputing one symbol', () => {
      useFootprintStore.setState({ enabled: true });

      useFootprintStore.getState().recompute('BTC/USDT', [makeCandle()]);
      useFootprintStore.getState().recompute('ETH/USDT', [makeCandle({ symbol: 'ETH/USDT' })]);

      // Recompute BTC again — ETH entry must survive
      useFootprintStore.getState().recompute('BTC/USDT', [makeCandle()]);

      expect(useFootprintStore.getState().footprints.get('ETH/USDT')).toBeDefined();
    });
  });
});
