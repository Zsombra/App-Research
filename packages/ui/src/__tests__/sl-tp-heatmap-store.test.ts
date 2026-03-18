import { describe, it, expect, beforeEach } from 'vitest';
import { useSLTPHeatmapStore } from '../stores/sl-tp-heatmap-store.js';
import { DEFAULT_SLTP_CONFIG } from '@terminal/types';
import type { OHLCVCandle, EstimatedPosition } from '@terminal/types';

function makeCandle(close: number, timestamp: number): OHLCVCandle {
  return {
    exchange: 'test',
    symbol: 'TEST/USDT',
    timeframe: '1m',
    timestamp,
    open: close - 5,
    high: close + 10,
    low: close - 10,
    close,
    volume: 100,
    buyVolume: 50,
    sellVolume: 50,
    tradeCount: 10,
    closed: true,
  };
}

function makeCandles(count: number): OHLCVCandle[] {
  const base = 1700000000000;
  return Array.from({ length: count }, (_, i) =>
    makeCandle(60000 + i * 100, base + i * 60_000)
  );
}

describe('useSLTPHeatmapStore', () => {
  beforeEach(() => {
    useSLTPHeatmapStore.setState({
      enabled: false,
      config: { ...DEFAULT_SLTP_CONFIG },
      heatmaps: new Map(),
      positions: new Map(),
    });
  });

  describe('setEnabled', () => {
    it('should toggle enabled state', () => {
      expect(useSLTPHeatmapStore.getState().enabled).toBe(false);
      useSLTPHeatmapStore.getState().setEnabled(true);
      expect(useSLTPHeatmapStore.getState().enabled).toBe(true);
      useSLTPHeatmapStore.getState().setEnabled(false);
      expect(useSLTPHeatmapStore.getState().enabled).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update a specific config key', () => {
      useSLTPHeatmapStore.getState().updateConfig('priceBucketSize', 50);
      expect(useSLTPHeatmapStore.getState().config.priceBucketSize).toBe(50);
    });

    it('should preserve other config values', () => {
      const originalConfig = { ...useSLTPHeatmapStore.getState().config };
      useSLTPHeatmapStore.getState().updateConfig('priceBucketSize', 50);
      const updated = useSLTPHeatmapStore.getState().config;
      expect(updated.priceBucketSize).toBe(50);
      expect(updated.swingStrength).toBe(originalConfig.swingStrength);
    });
  });

  describe('setPositions', () => {
    it('should store positions for a symbol', () => {
      const positions: EstimatedPosition[] = [
        { side: 'long', entryPrice: 60000, size: 1, leverage: 10 },
      ];
      useSLTPHeatmapStore.getState().setPositions('BTC/USDT', positions);
      expect(useSLTPHeatmapStore.getState().positions.get('BTC/USDT')).toEqual(positions);
    });

    it('should replace existing positions', () => {
      const pos1: EstimatedPosition[] = [{ side: 'long', entryPrice: 60000, size: 1, leverage: 10 }];
      const pos2: EstimatedPosition[] = [{ side: 'short', entryPrice: 65000, size: 2, leverage: 5 }];

      useSLTPHeatmapStore.getState().setPositions('BTC/USDT', pos1);
      useSLTPHeatmapStore.getState().setPositions('BTC/USDT', pos2);

      expect(useSLTPHeatmapStore.getState().positions.get('BTC/USDT')).toEqual(pos2);
    });

    it('should store positions independently per symbol', () => {
      const btcPos: EstimatedPosition[] = [{ side: 'long', entryPrice: 60000, size: 1, leverage: 10 }];
      const ethPos: EstimatedPosition[] = [{ side: 'short', entryPrice: 3000, size: 5, leverage: 20 }];

      useSLTPHeatmapStore.getState().setPositions('BTC/USDT', btcPos);
      useSLTPHeatmapStore.getState().setPositions('ETH/USDT', ethPos);

      expect(useSLTPHeatmapStore.getState().positions.get('BTC/USDT')).toEqual(btcPos);
      expect(useSLTPHeatmapStore.getState().positions.get('ETH/USDT')).toEqual(ethPos);
    });
  });

  describe('recompute', () => {
    it('should do nothing when disabled', () => {
      useSLTPHeatmapStore.getState().setEnabled(false);
      useSLTPHeatmapStore.getState().recompute('BTC/USDT', makeCandles(20));
      expect(useSLTPHeatmapStore.getState().heatmaps.has('BTC/USDT')).toBe(false);
    });

    it('should do nothing with empty candles', () => {
      useSLTPHeatmapStore.getState().setEnabled(true);
      useSLTPHeatmapStore.getState().recompute('BTC/USDT', []);
      expect(useSLTPHeatmapStore.getState().heatmaps.has('BTC/USDT')).toBe(false);
    });

    it('should compute heatmap when enabled with candles', () => {
      useSLTPHeatmapStore.getState().setEnabled(true);
      useSLTPHeatmapStore.getState().recompute('BTC/USDT', makeCandles(20));

      const heatmap = useSLTPHeatmapStore.getState().heatmaps.get('BTC/USDT');
      expect(heatmap).toBeDefined();
      expect(heatmap!.slClusters).toBeDefined();
      expect(heatmap!.tpClusters).toBeDefined();
      expect(Array.isArray(heatmap!.slClusters)).toBe(true);
      expect(Array.isArray(heatmap!.tpClusters)).toBe(true);
    });

    it('should store heatmaps per symbol independently', () => {
      useSLTPHeatmapStore.getState().setEnabled(true);

      const btcCandles = makeCandles(20);
      const ethCandles = makeCandles(20).map((c) => ({
        ...c,
        symbol: 'ETH/USDT',
        close: c.close / 20,
        high: c.high / 20,
        low: c.low / 20,
        open: c.open / 20,
      }));

      useSLTPHeatmapStore.getState().recompute('BTC/USDT', btcCandles);
      useSLTPHeatmapStore.getState().recompute('ETH/USDT', ethCandles);

      expect(useSLTPHeatmapStore.getState().heatmaps.has('BTC/USDT')).toBe(true);
      expect(useSLTPHeatmapStore.getState().heatmaps.has('ETH/USDT')).toBe(true);
    });

    it('should use positions if provided', () => {
      useSLTPHeatmapStore.getState().setEnabled(true);
      const positions: EstimatedPosition[] = [
        { side: 'long', entryPrice: 60000, size: 1, leverage: 50 },
      ];
      useSLTPHeatmapStore.getState().setPositions('BTC/USDT', positions);
      useSLTPHeatmapStore.getState().recompute('BTC/USDT', makeCandles(20));

      const heatmap = useSLTPHeatmapStore.getState().heatmaps.get('BTC/USDT');
      expect(heatmap).toBeDefined();
    });
  });
});
