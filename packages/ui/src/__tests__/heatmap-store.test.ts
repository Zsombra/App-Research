import { describe, it, expect, beforeEach } from 'vitest';
import { useHeatmapStore } from '../stores/heatmap-store.js';
import type { OrderbookSnapshot } from '@terminal/types';

function makeSnapshot(overrides: Partial<OrderbookSnapshot> = {}): OrderbookSnapshot {
  return {
    exchange: 'simulated',
    symbol: 'BTC/USDT',
    timestamp: Date.now(),
    bids: [
      { price: 100, size: 5 },
      { price: 99, size: 10 },
      { price: 98, size: 3 },
    ],
    asks: [
      { price: 101, size: 7 },
      { price: 102, size: 4 },
      { price: 103, size: 8 },
    ],
    sequenceId: 1,
    ...overrides,
  };
}

describe('heatmap-store', () => {
  beforeEach(() => {
    const store = useHeatmapStore.getState();
    store.setEnabled(false);
    // Reset columns
    useHeatmapStore.setState({ columns: new Map(), maxLiquidity: new Map() });
  });

  it('should not capture when disabled', () => {
    const store = useHeatmapStore.getState();
    store.captureSnapshot('BTC/USDT', makeSnapshot());
    expect(store.columns.get('BTC/USDT')).toBeUndefined();
  });

  it('should capture snapshot when enabled', () => {
    const store = useHeatmapStore.getState();
    store.setEnabled(true);
    store.captureSnapshot('BTC/USDT', makeSnapshot({ timestamp: 1000000 }));

    const columns = useHeatmapStore.getState().columns.get('BTC/USDT');
    expect(columns).toHaveLength(1);
    expect(columns![0]!.bids.size).toBeGreaterThan(0);
    expect(columns![0]!.asks.size).toBeGreaterThan(0);
  });

  it('should respect capture interval', () => {
    const store = useHeatmapStore.getState();
    store.setEnabled(true);

    store.captureSnapshot('BTC/USDT', makeSnapshot({ timestamp: 1000 }));
    store.captureSnapshot('BTC/USDT', makeSnapshot({ timestamp: 1500 })); // too close (500ms < 1000ms default)

    const columns = useHeatmapStore.getState().columns.get('BTC/USDT');
    expect(columns).toHaveLength(1);
  });

  it('should capture after interval passes', () => {
    const store = useHeatmapStore.getState();
    store.setEnabled(true);

    store.captureSnapshot('BTC/USDT', makeSnapshot({ timestamp: 1000 }));
    store.captureSnapshot('BTC/USDT', makeSnapshot({ timestamp: 2100 })); // 1100ms > 1000ms

    const columns = useHeatmapStore.getState().columns.get('BTC/USDT');
    expect(columns).toHaveLength(2);
  });

  it('should track max liquidity', () => {
    const store = useHeatmapStore.getState();
    store.setEnabled(true);

    store.captureSnapshot('BTC/USDT', makeSnapshot({
      timestamp: 1000,
      bids: [{ price: 100, size: 50 }],
      asks: [{ price: 101, size: 30 }],
    }));

    const maxLiq = useHeatmapStore.getState().maxLiquidity.get('BTC/USDT');
    expect(maxLiq).toBe(50);
  });

  it('should trim old columns beyond maxColumns', () => {
    const store = useHeatmapStore.getState();
    store.setEnabled(true);
    store.updateConfig('maxColumns', 3);
    store.updateConfig('captureIntervalMs', 0); // no interval throttle

    for (let i = 0; i < 5; i++) {
      store.captureSnapshot('BTC/USDT', makeSnapshot({ timestamp: i * 1000 }));
    }

    const columns = useHeatmapStore.getState().columns.get('BTC/USDT');
    expect(columns!.length).toBeLessThanOrEqual(3);
  });

  it('should toggle enabled state', () => {
    const store = useHeatmapStore.getState();
    expect(store.enabled).toBe(false);
    store.setEnabled(true);
    expect(useHeatmapStore.getState().enabled).toBe(true);
  });

  describe('clearSymbol', () => {
    it('should remove columns and maxLiquidity for the given symbol', () => {
      const store = useHeatmapStore.getState();
      store.setEnabled(true);
      store.captureSnapshot('BTC/USDT', makeSnapshot({ timestamp: 1000 }));
      store.captureSnapshot('ETH/USDT', makeSnapshot({ symbol: 'ETH/USDT', timestamp: 2000 }));

      expect(useHeatmapStore.getState().columns.get('BTC/USDT')).toBeDefined();
      expect(useHeatmapStore.getState().maxLiquidity.get('BTC/USDT')).toBeDefined();

      useHeatmapStore.getState().clearSymbol('BTC/USDT');

      expect(useHeatmapStore.getState().columns.get('BTC/USDT')).toBeUndefined();
      expect(useHeatmapStore.getState().maxLiquidity.get('BTC/USDT')).toBeUndefined();
      // ETH should be untouched
      expect(useHeatmapStore.getState().columns.get('ETH/USDT')).toBeDefined();
    });

    it('should be idempotent for non-existent symbols', () => {
      expect(() => useHeatmapStore.getState().clearSymbol('UNKNOWN/USDT')).not.toThrow();
    });
  });
});
