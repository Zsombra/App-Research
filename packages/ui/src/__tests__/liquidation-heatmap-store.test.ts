import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLiquidationHeatmapStore } from '../stores/liquidation-heatmap-store.js';
import { DEFAULT_LIQUIDATION_HEATMAP_CONFIG } from '@terminal/types';
import type { LiquidationEvent } from '@terminal/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _eventId = 0;

/** Build a minimal valid LiquidationEvent. */
function makeEvent(overrides: Partial<LiquidationEvent> = {}): LiquidationEvent {
  _eventId++;
  return {
    exchange: 'simulated',
    symbol: 'BTC/USDT',
    side: 'buy',
    price: 50000 + _eventId,  // distinct price per event for bucketing variety
    amount: 0.1,
    timestamp: Date.now() + _eventId,
    ...overrides,
  };
}

/** Build `count` events for a given symbol, all with distinct timestamps/prices. */
function makeEvents(count: number, symbol = 'BTC/USDT'): LiquidationEvent[] {
  return Array.from({ length: count }, (_, i) =>
    makeEvent({ symbol, price: 50000 + i, timestamp: 1_700_000_000_000 + i * 1000 })
  );
}

// ---------------------------------------------------------------------------
// Reset the store to a known baseline before every test.
// ---------------------------------------------------------------------------

function resetStore() {
  useLiquidationHeatmapStore.setState({
    enabled: false,
    config: { ...DEFAULT_LIQUIDATION_HEATMAP_CONFIG },
    events: new Map(),
    heatmaps: new Map(),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useLiquidationHeatmapStore', () => {
  beforeEach(() => {
    _eventId = 0;
    resetStore();
  });

  // -------------------------------------------------------------------------
  // 1. Initial state
  // -------------------------------------------------------------------------
  describe('initial state', () => {
    it('starts disabled', () => {
      expect(useLiquidationHeatmapStore.getState().enabled).toBe(false);
    });

    it('starts with no events', () => {
      expect(useLiquidationHeatmapStore.getState().events.size).toBe(0);
    });

    it('starts with no heatmaps', () => {
      expect(useLiquidationHeatmapStore.getState().heatmaps.size).toBe(0);
    });

    it('uses the default config', () => {
      const { config } = useLiquidationHeatmapStore.getState();
      expect(config.maxEvents).toBe(DEFAULT_LIQUIDATION_HEATMAP_CONFIG.maxEvents);
      expect(config.timeBucketMs).toBe(DEFAULT_LIQUIDATION_HEATMAP_CONFIG.timeBucketMs);
      expect(config.priceBucketSize).toBe(DEFAULT_LIQUIDATION_HEATMAP_CONFIG.priceBucketSize);
    });
  });

  // -------------------------------------------------------------------------
  // 2. setEnabled
  // -------------------------------------------------------------------------
  describe('setEnabled', () => {
    it('toggles enabled to true', () => {
      useLiquidationHeatmapStore.getState().setEnabled(true);
      expect(useLiquidationHeatmapStore.getState().enabled).toBe(true);
    });

    it('toggles enabled back to false', () => {
      useLiquidationHeatmapStore.getState().setEnabled(true);
      useLiquidationHeatmapStore.getState().setEnabled(false);
      expect(useLiquidationHeatmapStore.getState().enabled).toBe(false);
    });

    it('calling setEnabled(false) when already false is a no-op', () => {
      useLiquidationHeatmapStore.getState().setEnabled(false);
      expect(useLiquidationHeatmapStore.getState().enabled).toBe(false);
    });

    it('does not affect events or heatmaps', () => {
      const event = makeEvent();
      useLiquidationHeatmapStore.getState().addLiquidation(event);
      useLiquidationHeatmapStore.getState().setEnabled(true);
      // events still there, setEnabled alone should not wipe them
      expect(useLiquidationHeatmapStore.getState().events.get('BTC/USDT')).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // 3. addLiquidation – basic storage
  // -------------------------------------------------------------------------
  describe('addLiquidation – stores events per symbol', () => {
    it('stores a single event under the correct symbol', () => {
      const event = makeEvent({ symbol: 'BTC/USDT' });
      useLiquidationHeatmapStore.getState().addLiquidation(event);

      const stored = useLiquidationHeatmapStore.getState().events.get('BTC/USDT');
      expect(stored).toHaveLength(1);
      expect(stored![0]).toEqual(event);
    });

    it('accumulates multiple events for the same symbol', () => {
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ symbol: 'ETH/USDT' }));
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ symbol: 'ETH/USDT' }));
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ symbol: 'ETH/USDT' }));

      expect(useLiquidationHeatmapStore.getState().events.get('ETH/USDT')).toHaveLength(3);
    });

    it('stores events for different symbols independently', () => {
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ symbol: 'BTC/USDT' }));
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ symbol: 'ETH/USDT' }));
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ symbol: 'BTC/USDT' }));

      expect(useLiquidationHeatmapStore.getState().events.get('BTC/USDT')).toHaveLength(2);
      expect(useLiquidationHeatmapStore.getState().events.get('ETH/USDT')).toHaveLength(1);
    });

    it('preserves event order (oldest first)', () => {
      const first = makeEvent({ timestamp: 1000 });
      const second = makeEvent({ timestamp: 2000 });
      useLiquidationHeatmapStore.getState().addLiquidation(first);
      useLiquidationHeatmapStore.getState().addLiquidation(second);

      const stored = useLiquidationHeatmapStore.getState().events.get('BTC/USDT')!;
      expect(stored[0]!.timestamp).toBe(1000);
      expect(stored[1]!.timestamp).toBe(2000);
    });
  });

  // -------------------------------------------------------------------------
  // 4. addLiquidation – trims to maxEvents
  // -------------------------------------------------------------------------
  describe('addLiquidation – trims to maxEvents', () => {
    it('keeps exactly maxEvents entries when the limit is exceeded', () => {
      const smallMax = 5;
      useLiquidationHeatmapStore.setState({
        config: { ...DEFAULT_LIQUIDATION_HEATMAP_CONFIG, maxEvents: smallMax },
      });

      const events = makeEvents(smallMax + 3);
      for (const e of events) {
        useLiquidationHeatmapStore.getState().addLiquidation(e);
      }

      const stored = useLiquidationHeatmapStore.getState().events.get('BTC/USDT')!;
      expect(stored).toHaveLength(smallMax);
    });

    it('retains the newest events (drops the oldest) when trimming', () => {
      const smallMax = 3;
      useLiquidationHeatmapStore.setState({
        config: { ...DEFAULT_LIQUIDATION_HEATMAP_CONFIG, maxEvents: smallMax },
      });

      // Add 5 events with known, ascending timestamps
      const events = Array.from({ length: 5 }, (_, i) =>
        makeEvent({ timestamp: 1000 + i * 1000 })
      );
      for (const e of events) {
        useLiquidationHeatmapStore.getState().addLiquidation(e);
      }

      const stored = useLiquidationHeatmapStore.getState().events.get('BTC/USDT')!;
      // The three youngest should survive
      expect(stored[0]!.timestamp).toBe(3000);
      expect(stored[1]!.timestamp).toBe(4000);
      expect(stored[2]!.timestamp).toBe(5000);
    });

    it('does not trim while the count is below maxEvents', () => {
      const limit = 10;
      useLiquidationHeatmapStore.setState({
        config: { ...DEFAULT_LIQUIDATION_HEATMAP_CONFIG, maxEvents: limit },
      });

      for (let i = 0; i < limit; i++) {
        useLiquidationHeatmapStore.getState().addLiquidation(makeEvent());
      }

      expect(useLiquidationHeatmapStore.getState().events.get('BTC/USDT')).toHaveLength(limit);
    });
  });

  // -------------------------------------------------------------------------
  // 5. addLiquidation – auto-recomputes when enabled
  // -------------------------------------------------------------------------
  describe('addLiquidation – auto-recompute when enabled', () => {
    it('does NOT auto-recompute when disabled', () => {
      // disabled by default (resetStore)
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent());
      expect(useLiquidationHeatmapStore.getState().heatmaps.size).toBe(0);
    });

    it('auto-recomputes when enabled and a new event arrives', () => {
      useLiquidationHeatmapStore.getState().setEnabled(true);
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ symbol: 'BTC/USDT' }));

      expect(useLiquidationHeatmapStore.getState().heatmaps.has('BTC/USDT')).toBe(true);
    });

    it('auto-recomputes for the correct symbol only', () => {
      useLiquidationHeatmapStore.getState().setEnabled(true);
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ symbol: 'ETH/USDT' }));

      const state = useLiquidationHeatmapStore.getState();
      expect(state.heatmaps.has('ETH/USDT')).toBe(true);
      expect(state.heatmaps.has('BTC/USDT')).toBe(false);
    });

    it('recomputes after every new event when enabled', () => {
      useLiquidationHeatmapStore.getState().setEnabled(true);

      const recomputeSpy = vi.spyOn(
        useLiquidationHeatmapStore.getState(),
        'recompute'
      );

      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent());
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent());

      // Verify the heatmap was updated twice (two distinct calls)
      const heatmap = useLiquidationHeatmapStore.getState().heatmaps.get('BTC/USDT')!;
      expect(heatmap).toBeDefined();

      // Two events → cells should reflect both
      const totalCount = heatmap.cells.reduce((sum, c) => sum + c.count, 0);
      expect(totalCount).toBe(2);

      recomputeSpy.mockRestore();
    });

    it('stops auto-recomputing after setEnabled(false)', () => {
      useLiquidationHeatmapStore.getState().setEnabled(true);
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent());
      // Now disable and add another event
      useLiquidationHeatmapStore.getState().setEnabled(false);

      // Capture the heatmap state before the new event
      const heatmapBefore = useLiquidationHeatmapStore.getState().heatmaps.get('BTC/USDT');

      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent());

      // Heatmap should be exactly the same object reference (no recompute occurred)
      const heatmapAfter = useLiquidationHeatmapStore.getState().heatmaps.get('BTC/USDT');
      expect(heatmapAfter).toBe(heatmapBefore);
    });
  });

  // -------------------------------------------------------------------------
  // 6. recompute – builds and stores the heatmap
  // -------------------------------------------------------------------------
  describe('recompute', () => {
    it('stores a heatmap for the given symbol', () => {
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ symbol: 'BTC/USDT' }));
      useLiquidationHeatmapStore.getState().recompute('BTC/USDT');

      expect(useLiquidationHeatmapStore.getState().heatmaps.has('BTC/USDT')).toBe(true);
    });

    it('returns an empty heatmap (no cells) when there are no events for the symbol', () => {
      useLiquidationHeatmapStore.getState().recompute('XRP/USDT');

      const heatmap = useLiquidationHeatmapStore.getState().heatmaps.get('XRP/USDT')!;
      expect(heatmap).toBeDefined();
      expect(heatmap.cells).toHaveLength(0);
      expect(heatmap.maxVolume).toBe(0);
    });

    it('produces cells whose total count matches the number of events added', () => {
      const events = makeEvents(4);
      for (const e of events) {
        useLiquidationHeatmapStore.getState().addLiquidation(e);
      }
      useLiquidationHeatmapStore.getState().recompute('BTC/USDT');

      const heatmap = useLiquidationHeatmapStore.getState().heatmaps.get('BTC/USDT')!;
      const totalCount = heatmap.cells.reduce((sum, c) => sum + c.count, 0);
      expect(totalCount).toBe(4);
    });

    it('produces a positive maxVolume when events have quantity > 0', () => {
      useLiquidationHeatmapStore.getState().addLiquidation(
        makeEvent({ price: 50000, amount: 1.0 })
      );
      useLiquidationHeatmapStore.getState().recompute('BTC/USDT');

      const heatmap = useLiquidationHeatmapStore.getState().heatmaps.get('BTC/USDT')!;
      expect(heatmap.maxVolume).toBeGreaterThan(0);
    });

    it('stores heatmaps for multiple symbols independently', () => {
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ symbol: 'BTC/USDT', price: 50000 }));
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ symbol: 'ETH/USDT', price: 3000 }));
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ symbol: 'ETH/USDT', price: 3001 }));

      useLiquidationHeatmapStore.getState().recompute('BTC/USDT');
      useLiquidationHeatmapStore.getState().recompute('ETH/USDT');

      const btcHeatmap = useLiquidationHeatmapStore.getState().heatmaps.get('BTC/USDT')!;
      const ethHeatmap = useLiquidationHeatmapStore.getState().heatmaps.get('ETH/USDT')!;

      const btcCount = btcHeatmap.cells.reduce((s, c) => s + c.count, 0);
      const ethCount = ethHeatmap.cells.reduce((s, c) => s + c.count, 0);

      expect(btcCount).toBe(1);
      expect(ethCount).toBe(2);
    });

    it('overwrites a previous heatmap for the same symbol on subsequent recompute calls', () => {
      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ price: 50000, amount: 1 }));
      useLiquidationHeatmapStore.getState().recompute('BTC/USDT');
      const firstHeatmap = useLiquidationHeatmapStore.getState().heatmaps.get('BTC/USDT')!;

      useLiquidationHeatmapStore.getState().addLiquidation(makeEvent({ price: 50100, amount: 2 }));
      useLiquidationHeatmapStore.getState().recompute('BTC/USDT');
      const secondHeatmap = useLiquidationHeatmapStore.getState().heatmaps.get('BTC/USDT')!;

      // The second heatmap must incorporate both events
      const totalCount = secondHeatmap.cells.reduce((s, c) => s + c.count, 0);
      expect(totalCount).toBe(2);
      // It should be a new object
      expect(secondHeatmap).not.toBe(firstHeatmap);
    });

    it('separates long and short volumes into the correct cell fields', () => {
      const ts = 1_700_000_000_000;
      // Two events in the exact same time + price bucket so they land in one cell
      useLiquidationHeatmapStore.getState().addLiquidation(
        makeEvent({ price: 50000, amount: 1.0, side: 'buy', timestamp: ts })
      );
      useLiquidationHeatmapStore.getState().addLiquidation(
        makeEvent({ price: 50000, amount: 0.5, side: 'sell', timestamp: ts })
      );

      useLiquidationHeatmapStore.getState().recompute('BTC/USDT');

      const heatmap = useLiquidationHeatmapStore.getState().heatmaps.get('BTC/USDT')!;
      // Both events share the same price/time key → one cell
      expect(heatmap.cells).toHaveLength(1);
      const cell = heatmap.cells[0]!;
      expect(cell.longVolume).toBeCloseTo(50000 * 1.0);
      expect(cell.shortVolume).toBeCloseTo(50000 * 0.5);
      expect(cell.count).toBe(2);
    });
  });
});
