import { describe, it, expect, beforeEach } from 'vitest';
import { useHeatmapStore } from '../stores/heatmap-store.js';
import { useLiquidationHeatmapStore } from '../stores/liquidation-heatmap-store.js';
import type { OrderbookSnapshot, LiquidationEvent } from '@terminal/types';
import { DEFAULT_HEATMAP_CONFIG, DEFAULT_LIQUIDATION_HEATMAP_CONFIG } from '@terminal/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(overrides: Partial<OrderbookSnapshot> = {}): OrderbookSnapshot {
  return {
    exchange: 'test',
    symbol: 'BTC/USDT',
    timestamp: Date.now(),
    bids: [
      { price: 100, size: 10 },
      { price: 99, size: 20 },
    ],
    asks: [
      { price: 101, size: 15 },
      { price: 102, size: 25 },
    ],
    sequenceId: 1,
    ...overrides,
  };
}

function makeLiquidationEvent(overrides: Partial<LiquidationEvent> = {}): LiquidationEvent {
  return {
    exchange: 'binance',
    symbol: 'BTC/USDT',
    side: 'buy',
    price: 50000,
    quantity: 1.0,
    timestamp: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Heatmap Store Tests
// ---------------------------------------------------------------------------

describe('heatmap-store immutability', () => {
  beforeEach(() => {
    useHeatmapStore.setState({
      enabled: true,
      config: { ...DEFAULT_HEATMAP_CONFIG, maxColumns: 3, captureIntervalMs: 0 },
      columns: new Map(),
      maxLiquidity: new Map(),
    });
  });

  it('should trim columns using slice (immutable) when exceeding maxColumns', () => {
    const store = useHeatmapStore.getState();

    // Add 5 snapshots (max is 3)
    for (let i = 0; i < 5; i++) {
      useHeatmapStore.getState().captureSnapshot(
        'BTC/USDT',
        makeSnapshot({ timestamp: 1000 + i * 1000 }),
      );
    }

    const columns = useHeatmapStore.getState().columns.get('BTC/USDT')!;
    expect(columns).toHaveLength(3);
    // Should keep the latest 3
    expect(columns[0]!.timestamp).toBe(3000);
    expect(columns[2]!.timestamp).toBe(5000);
  });

  it('should not trim when under maxColumns', () => {
    useHeatmapStore.getState().captureSnapshot(
      'BTC/USDT',
      makeSnapshot({ timestamp: 1000 }),
    );
    useHeatmapStore.getState().captureSnapshot(
      'BTC/USDT',
      makeSnapshot({ timestamp: 2000 }),
    );

    const columns = useHeatmapStore.getState().columns.get('BTC/USDT')!;
    expect(columns).toHaveLength(2);
  });

  it('should track max liquidity across captures', () => {
    useHeatmapStore.getState().captureSnapshot('BTC/USDT', makeSnapshot({
      timestamp: 1000,
      bids: [{ price: 100, size: 50 }],
      asks: [{ price: 101, size: 30 }],
    }));

    const maxLiq = useHeatmapStore.getState().maxLiquidity.get('BTC/USDT');
    expect(maxLiq).toBe(50);
  });

  it('should skip capture when within captureIntervalMs', () => {
    useHeatmapStore.setState({
      enabled: true,
      config: { ...DEFAULT_HEATMAP_CONFIG, maxColumns: 10, captureIntervalMs: 5000 },
      columns: new Map(),
      maxLiquidity: new Map(),
    });

    // First capture: timestamp 10000, lastTs=0 → diff=10000 >= 5000 → accepted
    useHeatmapStore.getState().captureSnapshot('BTC/USDT', makeSnapshot({ timestamp: 10000 }));
    // Second: diff=2000 < 5000 → skipped
    useHeatmapStore.getState().captureSnapshot('BTC/USDT', makeSnapshot({ timestamp: 12000 }));
    // Third: diff=6000 >= 5000 → accepted
    useHeatmapStore.getState().captureSnapshot('BTC/USDT', makeSnapshot({ timestamp: 16000 }));

    const columns = useHeatmapStore.getState().columns.get('BTC/USDT')!;
    expect(columns).toHaveLength(2); // first + third (second was skipped)
  });
});

// ---------------------------------------------------------------------------
// Liquidation Heatmap Store Tests
// ---------------------------------------------------------------------------

describe('liquidation-heatmap-store immutability', () => {
  beforeEach(() => {
    useLiquidationHeatmapStore.setState({
      enabled: true,
      config: { ...DEFAULT_LIQUIDATION_HEATMAP_CONFIG, maxEvents: 3 },
      events: new Map(),
      heatmaps: new Map(),
    });
  });

  it('should trim events using slice (immutable) when exceeding maxEvents', () => {
    for (let i = 0; i < 5; i++) {
      useLiquidationHeatmapStore.getState().addLiquidation(
        makeLiquidationEvent({ price: 50000 + i, timestamp: 1000 + i }),
      );
    }

    const events = useLiquidationHeatmapStore.getState().events.get('BTC/USDT')!;
    expect(events).toHaveLength(3);
    // Should keep latest 3 (prices 50002, 50003, 50004)
    expect(events[0]!.price).toBe(50002);
    expect(events[2]!.price).toBe(50004);
  });

  it('should not trim when under maxEvents', () => {
    useLiquidationHeatmapStore.getState().addLiquidation(makeLiquidationEvent({ price: 50000 }));
    useLiquidationHeatmapStore.getState().addLiquidation(makeLiquidationEvent({ price: 50001 }));

    const events = useLiquidationHeatmapStore.getState().events.get('BTC/USDT')!;
    expect(events).toHaveLength(2);
  });

  it('should auto-recompute heatmap when enabled', () => {
    useLiquidationHeatmapStore.getState().addLiquidation(makeLiquidationEvent());

    const heatmap = useLiquidationHeatmapStore.getState().heatmaps.get('BTC/USDT');
    expect(heatmap).toBeDefined();
  });

  it('should not auto-recompute when disabled', () => {
    useLiquidationHeatmapStore.setState({ enabled: false });
    useLiquidationHeatmapStore.getState().addLiquidation(makeLiquidationEvent());

    const heatmap = useLiquidationHeatmapStore.getState().heatmaps.get('BTC/USDT');
    expect(heatmap).toBeUndefined();
  });

  it('should clear symbol data completely', () => {
    useLiquidationHeatmapStore.getState().addLiquidation(makeLiquidationEvent());

    useLiquidationHeatmapStore.getState().clearSymbol('BTC/USDT');

    expect(useLiquidationHeatmapStore.getState().events.get('BTC/USDT')).toBeUndefined();
    expect(useLiquidationHeatmapStore.getState().heatmaps.get('BTC/USDT')).toBeUndefined();
  });
});
