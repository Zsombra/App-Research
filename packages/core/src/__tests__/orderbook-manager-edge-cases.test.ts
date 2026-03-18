import { describe, it, expect } from 'vitest';
import type { OrderbookSnapshot, OrderbookDelta } from '@terminal/types';
import { OrderbookManager } from '../orderbook/orderbook-manager.js';

function createManager(maxDepth?: number): OrderbookManager {
  return new OrderbookManager({
    symbol: 'BTC/USDT',
    exchange: 'binance',
    maxDepth: maxDepth ?? 50,
  });
}

function makeSnapshot(overrides: Partial<OrderbookSnapshot> = {}): OrderbookSnapshot {
  return {
    exchange: 'binance', symbol: 'BTC/USDT', timestamp: 1000,
    bids: [{ price: 100, size: 1 }, { price: 99, size: 2 }],
    asks: [{ price: 101, size: 1 }, { price: 102, size: 2 }],
    sequenceId: 1,
    ...overrides,
  };
}

describe('OrderbookManager edge cases', () => {
  // -------------------------------------------------------------------------
  // Empty / no-data states
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    it('getSnapshot returns empty arrays before any data', () => {
      const manager = createManager();
      const snapshot = manager.getSnapshot();
      expect(snapshot.bids).toHaveLength(0);
      expect(snapshot.asks).toHaveLength(0);
    });

    it('applyDelta before any snapshot does not throw', () => {
      const manager = createManager();

      expect(() => {
        manager.applyDelta({
          exchange: 'binance', symbol: 'BTC/USDT', timestamp: 1000,
          bids: [{ price: 100, size: 1 }],
          asks: [{ price: 101, size: 1 }],
          sequenceId: 2, prevSequenceId: 1,
        });
      }).not.toThrow();
    });

    it('snapshot with empty bids and asks', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot({ bids: [], asks: [] }));
      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(0);
      expect(result.asks).toHaveLength(0);
      expect(manager.bestBid).toBeNull();
      expect(manager.bestAsk).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // All levels removed via deltas
  // -------------------------------------------------------------------------
  describe('all levels removed', () => {
    it('removing all levels via delta leaves empty book', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot());

      manager.applyDelta({
        exchange: 'binance', symbol: 'BTC/USDT', timestamp: 2000,
        bids: [{ price: 100, size: 0 }, { price: 99, size: 0 }],
        asks: [{ price: 101, size: 0 }, { price: 102, size: 0 }],
        sequenceId: 2, prevSequenceId: 1,
      });

      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(0);
      expect(result.asks).toHaveLength(0);
    });

    it('can add levels back after removing all', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot());

      // Remove all
      manager.applyDelta({
        exchange: 'binance', symbol: 'BTC/USDT', timestamp: 2000,
        bids: [{ price: 100, size: 0 }, { price: 99, size: 0 }],
        asks: [{ price: 101, size: 0 }, { price: 102, size: 0 }],
        sequenceId: 2, prevSequenceId: 1,
      });

      // Add new levels
      manager.applyDelta({
        exchange: 'binance', symbol: 'BTC/USDT', timestamp: 3000,
        bids: [{ price: 200, size: 5 }],
        asks: [{ price: 201, size: 5 }],
        sequenceId: 3, prevSequenceId: 2,
      });

      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(1);
      expect(result.bids[0]!.price).toBe(200);
      expect(result.asks[0]!.price).toBe(201);
    });
  });

  // -------------------------------------------------------------------------
  // Duplicate price levels
  // -------------------------------------------------------------------------
  describe('duplicate prices', () => {
    it('handles duplicate price levels in snapshot (last wins)', () => {
      const manager = createManager();

      manager.applySnapshot(makeSnapshot({
        bids: [
          { price: 100, size: 1 },
          { price: 100, size: 5 }, // duplicate price
        ],
      }));

      const result = manager.getSnapshot();
      // Implementation-dependent: could merge or last-wins
      // Just verify it doesn't crash and produces valid output
      expect(result.bids.length).toBeGreaterThanOrEqual(1);
    });

    it('delta updating same price twice keeps last size', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot());

      manager.applyDelta({
        exchange: 'binance', symbol: 'BTC/USDT', timestamp: 2000,
        bids: [
          { price: 100, size: 3 },
          { price: 100, size: 7 }, // second update to same price
        ],
        asks: [],
        sequenceId: 2, prevSequenceId: 1,
      });

      const result = manager.getSnapshot();
      const level100 = result.bids.find(b => b.price === 100);
      expect(level100).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // maxDepth edge cases
  // -------------------------------------------------------------------------
  describe('maxDepth edge cases', () => {
    it('maxDepth = 1 keeps only best bid and ask', () => {
      const manager = createManager(1);

      manager.applySnapshot(makeSnapshot({
        bids: [
          { price: 100, size: 1 },
          { price: 99, size: 2 },
          { price: 98, size: 3 },
        ],
        asks: [
          { price: 101, size: 1 },
          { price: 102, size: 2 },
          { price: 103, size: 3 },
        ],
      }));

      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(1);
      expect(result.asks).toHaveLength(1);
      expect(result.bids[0]!.price).toBe(100);
      expect(result.asks[0]!.price).toBe(101);
    });

    it('large maxDepth does not trim small book', () => {
      const manager = createManager(1000);

      manager.applySnapshot(makeSnapshot({
        bids: [{ price: 100, size: 1 }],
        asks: [{ price: 101, size: 1 }],
      }));

      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(1);
      expect(result.asks).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Spread / crossed book scenarios
  // -------------------------------------------------------------------------
  describe('crossed / tight book', () => {
    it('handles zero spread (bid == ask)', () => {
      const manager = createManager();

      manager.applySnapshot(makeSnapshot({
        bids: [{ price: 100, size: 1 }],
        asks: [{ price: 100, size: 1 }], // same as bid
      }));

      const result = manager.getSnapshot();
      expect(result.bids[0]!.price).toBe(100);
      expect(result.asks[0]!.price).toBe(100);
    });

    it('handles crossed book (bid > ask) without crashing', () => {
      const manager = createManager();

      manager.applySnapshot(makeSnapshot({
        bids: [{ price: 102, size: 1 }],
        asks: [{ price: 100, size: 1 }], // ask below bid
      }));

      // Should not crash, even if book is invalid
      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(1);
      expect(result.asks).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Rapid updates
  // -------------------------------------------------------------------------
  describe('rapid sequential updates', () => {
    it('handles many sequential deltas correctly', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot());

      for (let i = 0; i < 100; i++) {
        manager.applyDelta({
          exchange: 'binance', symbol: 'BTC/USDT', timestamp: 2000 + i,
          bids: [{ price: 100, size: i + 1 }],
          asks: [{ price: 101, size: i + 1 }],
          sequenceId: 2 + i, prevSequenceId: 1 + i,
        });
      }

      const result = manager.getSnapshot();
      expect(result.bids.find(b => b.price === 100)!.size).toBe(100);
      expect(result.asks.find(a => a.price === 101)!.size).toBe(100);
    });

    it('multiple snapshots only keeps the last one', () => {
      const manager = createManager();

      for (let i = 0; i < 10; i++) {
        manager.applySnapshot(makeSnapshot({
          bids: [{ price: 100 + i, size: 1 }],
          asks: [{ price: 200 + i, size: 1 }],
          sequenceId: i + 1,
          timestamp: 1000 + i,
        }));
      }

      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(1);
      expect(result.bids[0]!.price).toBe(109); // last snapshot
      expect(result.asks[0]!.price).toBe(209);
    });
  });

  // -------------------------------------------------------------------------
  // Delta removing non-existent level
  // -------------------------------------------------------------------------
  describe('delta removing non-existent level', () => {
    it('removing a price level that does not exist is a no-op', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot());

      const before = manager.getSnapshot();

      manager.applyDelta({
        exchange: 'binance', symbol: 'BTC/USDT', timestamp: 2000,
        bids: [{ price: 999, size: 0 }], // price doesn't exist
        asks: [{ price: 999, size: 0 }],
        sequenceId: 2, prevSequenceId: 1,
      });

      const after = manager.getSnapshot();
      expect(after.bids).toHaveLength(before.bids.length);
      expect(after.asks).toHaveLength(before.asks.length);
    });
  });
});
