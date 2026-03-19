import { describe, it, expect } from 'vitest';
import type { OrderbookSnapshot } from '@terminal/types';
import { OrderbookManager, SequenceGapError } from '../orderbook/orderbook-manager.js';

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

describe('OrderbookManager validation', () => {
  // -------------------------------------------------------------------------
  // Price > 0 validation
  // -------------------------------------------------------------------------
  describe('price validation', () => {
    it('should reject zero-price bids in snapshot', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot({
        bids: [
          { price: 0, size: 10 },
          { price: 100, size: 1 },
        ],
      }));

      const result = manager.getSnapshot();
      // Zero-price bid should be filtered out
      expect(result.bids).toHaveLength(1);
      expect(result.bids[0]!.price).toBe(100);
    });

    it('should reject zero-price asks in snapshot', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot({
        asks: [
          { price: 0, size: 5 },
          { price: 101, size: 1 },
        ],
      }));

      const result = manager.getSnapshot();
      expect(result.asks).toHaveLength(1);
      expect(result.asks[0]!.price).toBe(101);
    });

    it('should reject negative-price levels in snapshot', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot({
        bids: [
          { price: -50, size: 10 },
          { price: 100, size: 1 },
        ],
        asks: [
          { price: -10, size: 5 },
          { price: 101, size: 1 },
        ],
      }));

      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(1);
      expect(result.asks).toHaveLength(1);
    });

    it('should reject zero-size levels in snapshot', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot({
        bids: [
          { price: 100, size: 0 },
          { price: 99, size: 1 },
        ],
      }));

      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(1);
      expect(result.bids[0]!.price).toBe(99);
    });

    it('should accept valid positive price and size levels', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot({
        bids: [
          { price: 100, size: 1 },
          { price: 99, size: 2 },
          { price: 98, size: 3 },
        ],
      }));

      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // Sequence gap detection
  // -------------------------------------------------------------------------
  describe('sequence gap detection', () => {
    it('should throw SequenceGapError on sequence mismatch', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot({ sequenceId: 10 }));

      expect(() => {
        manager.applyDelta({
          exchange: 'binance', symbol: 'BTC/USDT', timestamp: 2000,
          bids: [{ price: 100, size: 5 }],
          asks: [],
          sequenceId: 15,
          prevSequenceId: 12, // Expected 10, got 12
        });
      }).toThrow(SequenceGapError);
    });

    it('should not throw when prevSequenceId matches lastSequenceId', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot({ sequenceId: 10 }));

      expect(() => {
        manager.applyDelta({
          exchange: 'binance', symbol: 'BTC/USDT', timestamp: 2000,
          bids: [{ price: 100, size: 5 }],
          asks: [],
          sequenceId: 11,
          prevSequenceId: 10,
        });
      }).not.toThrow();
    });

    it('should skip sequence check when lastSequenceId is 0', () => {
      const manager = createManager();
      // No snapshot applied, lastSequenceId is 0

      expect(() => {
        manager.applyDelta({
          exchange: 'binance', symbol: 'BTC/USDT', timestamp: 1000,
          bids: [{ price: 100, size: 1 }],
          asks: [{ price: 101, size: 1 }],
          sequenceId: 5,
          prevSequenceId: 3, // Doesn't match 0 but check is skipped
        });
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // bestBid / bestAsk
  // -------------------------------------------------------------------------
  describe('best bid/ask', () => {
    it('should return highest bid as bestBid', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot({
        bids: [
          { price: 98, size: 1 },
          { price: 100, size: 2 },
          { price: 99, size: 3 },
        ],
      }));

      expect(manager.bestBid!.price).toBe(100);
      expect(manager.bestBid!.size).toBe(2);
    });

    it('should return lowest ask as bestAsk', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot({
        asks: [
          { price: 103, size: 1 },
          { price: 101, size: 2 },
          { price: 102, size: 3 },
        ],
      }));

      expect(manager.bestAsk!.price).toBe(101);
      expect(manager.bestAsk!.size).toBe(2);
    });

    it('should return null for bestBid when no bids', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot({ bids: [] }));
      expect(manager.bestBid).toBeNull();
    });

    it('should return null for bestAsk when no asks', () => {
      const manager = createManager();
      manager.applySnapshot(makeSnapshot({ asks: [] }));
      expect(manager.bestAsk).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Depth trimming
  // -------------------------------------------------------------------------
  describe('depth trimming', () => {
    it('should trim bids to maxDepth keeping best prices', () => {
      const manager = createManager(3);

      const bids = [];
      for (let i = 0; i < 10; i++) {
        bids.push({ price: 100 - i, size: 1 });
      }

      manager.applySnapshot(makeSnapshot({ bids }));

      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(3);
      expect(result.bids[0]!.price).toBe(100);
      expect(result.bids[2]!.price).toBe(98);
    });

    it('should trim asks to maxDepth keeping best prices', () => {
      const manager = createManager(3);

      const asks = [];
      for (let i = 0; i < 10; i++) {
        asks.push({ price: 101 + i, size: 1 });
      }

      manager.applySnapshot(makeSnapshot({ asks }));

      const result = manager.getSnapshot();
      expect(result.asks).toHaveLength(3);
      expect(result.asks[0]!.price).toBe(101);
      expect(result.asks[2]!.price).toBe(103);
    });

    it('should trim after delta application too', () => {
      const manager = createManager(2);
      manager.applySnapshot(makeSnapshot({
        bids: [{ price: 100, size: 1 }, { price: 99, size: 1 }],
        asks: [{ price: 101, size: 1 }],
      }));

      manager.applyDelta({
        exchange: 'binance', symbol: 'BTC/USDT', timestamp: 2000,
        bids: [{ price: 98, size: 1 }, { price: 97, size: 1 }],
        asks: [],
        sequenceId: 2, prevSequenceId: 1,
      });

      const result = manager.getSnapshot();
      // Should only keep top 2 bids (100, 99)
      expect(result.bids).toHaveLength(2);
      expect(result.bids[0]!.price).toBe(100);
    });
  });
});
