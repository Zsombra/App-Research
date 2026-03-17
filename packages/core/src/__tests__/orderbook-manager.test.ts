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

describe('OrderbookManager', () => {
  describe('Snapshot application', () => {
    it('should apply a snapshot and return it via getSnapshot', () => {
      const manager = createManager();

      const snapshot: OrderbookSnapshot = {
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        bids: [
          { price: 100, size: 1 },
          { price: 99, size: 2 },
          { price: 98, size: 3 },
        ],
        asks: [
          { price: 101, size: 1.5 },
          { price: 102, size: 2.5 },
        ],
        sequenceId: 1,
      };

      manager.applySnapshot(snapshot);
      const result = manager.getSnapshot();

      expect(result.bids).toHaveLength(3);
      expect(result.asks).toHaveLength(2);
      expect(result.timestamp).toBe(1000);
      expect(result.sequenceId).toBe(1);
    });

    it('should sort bids descending by price', () => {
      const manager = createManager();

      manager.applySnapshot({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        bids: [
          { price: 98, size: 3 },
          { price: 100, size: 1 },
          { price: 99, size: 2 },
        ],
        asks: [],
        sequenceId: 1,
      });

      const result = manager.getSnapshot();
      expect(result.bids[0]!.price).toBe(100);
      expect(result.bids[1]!.price).toBe(99);
      expect(result.bids[2]!.price).toBe(98);
    });

    it('should sort asks ascending by price', () => {
      const manager = createManager();

      manager.applySnapshot({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        bids: [],
        asks: [
          { price: 103, size: 3 },
          { price: 101, size: 1 },
          { price: 102, size: 2 },
        ],
        sequenceId: 1,
      });

      const result = manager.getSnapshot();
      expect(result.asks[0]!.price).toBe(101);
      expect(result.asks[1]!.price).toBe(102);
      expect(result.asks[2]!.price).toBe(103);
    });

    it('should replace previous snapshot entirely', () => {
      const manager = createManager();

      manager.applySnapshot({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        bids: [{ price: 100, size: 1 }],
        asks: [{ price: 101, size: 1 }],
        sequenceId: 1,
      });

      manager.applySnapshot({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 2000,
        bids: [{ price: 200, size: 5 }],
        asks: [{ price: 201, size: 5 }],
        sequenceId: 2,
      });

      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(1);
      expect(result.bids[0]!.price).toBe(200);
      expect(result.asks[0]!.price).toBe(201);
      expect(result.timestamp).toBe(2000);
    });

    it('should skip levels with size 0 in snapshot', () => {
      const manager = createManager();

      manager.applySnapshot({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        bids: [
          { price: 100, size: 1 },
          { price: 99, size: 0 }, // Should be skipped
        ],
        asks: [{ price: 101, size: 1 }],
        sequenceId: 1,
      });

      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(1);
    });
  });

  describe('Delta application', () => {
    it('should update existing levels', () => {
      const manager = createManager();

      manager.applySnapshot({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        bids: [{ price: 100, size: 1 }],
        asks: [{ price: 101, size: 1 }],
        sequenceId: 1,
      });

      const delta: OrderbookDelta = {
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 2000,
        bids: [{ price: 100, size: 5 }], // Update bid size
        asks: [{ price: 101, size: 3 }], // Update ask size
        sequenceId: 2,
        prevSequenceId: 1,
      };

      manager.applyDelta(delta);
      const result = manager.getSnapshot();

      expect(result.bids[0]!.size).toBe(5);
      expect(result.asks[0]!.size).toBe(3);
    });

    it('should add new levels', () => {
      const manager = createManager();

      manager.applySnapshot({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        bids: [{ price: 100, size: 1 }],
        asks: [{ price: 101, size: 1 }],
        sequenceId: 1,
      });

      const delta: OrderbookDelta = {
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 2000,
        bids: [{ price: 99, size: 2 }],
        asks: [{ price: 102, size: 3 }],
        sequenceId: 2,
        prevSequenceId: 1,
      };

      manager.applyDelta(delta);
      const result = manager.getSnapshot();

      expect(result.bids).toHaveLength(2);
      expect(result.asks).toHaveLength(2);
    });

    it('should remove levels with size 0', () => {
      const manager = createManager();

      manager.applySnapshot({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        bids: [
          { price: 100, size: 1 },
          { price: 99, size: 2 },
        ],
        asks: [
          { price: 101, size: 1 },
          { price: 102, size: 2 },
        ],
        sequenceId: 1,
      });

      const delta: OrderbookDelta = {
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 2000,
        bids: [{ price: 100, size: 0 }], // Remove
        asks: [{ price: 101, size: 0 }], // Remove
        sequenceId: 2,
        prevSequenceId: 1,
      };

      manager.applyDelta(delta);
      const result = manager.getSnapshot();

      expect(result.bids).toHaveLength(1);
      expect(result.bids[0]!.price).toBe(99);
      expect(result.asks).toHaveLength(1);
      expect(result.asks[0]!.price).toBe(102);
    });

    it('should maintain sort order after delta', () => {
      const manager = createManager();

      manager.applySnapshot({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        bids: [
          { price: 100, size: 1 },
          { price: 98, size: 3 },
        ],
        asks: [
          { price: 101, size: 1 },
          { price: 103, size: 3 },
        ],
        sequenceId: 1,
      });

      const delta: OrderbookDelta = {
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 2000,
        bids: [{ price: 99, size: 2 }], // Insert between 100 and 98
        asks: [{ price: 102, size: 2 }], // Insert between 101 and 103
        sequenceId: 2,
        prevSequenceId: 1,
      };

      manager.applyDelta(delta);
      const result = manager.getSnapshot();

      // Bids: 100, 99, 98
      expect(result.bids.map((b) => b.price)).toEqual([100, 99, 98]);
      // Asks: 101, 102, 103
      expect(result.asks.map((a) => a.price)).toEqual([101, 102, 103]);
    });
  });

  describe('Depth limiting', () => {
    it('should limit bids and asks to maxDepth', () => {
      const manager = createManager(3);

      const bids = Array.from({ length: 10 }, (_, i) => ({
        price: 100 - i,
        size: 1,
      }));
      const asks = Array.from({ length: 10 }, (_, i) => ({
        price: 101 + i,
        size: 1,
      }));

      manager.applySnapshot({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        bids,
        asks,
        sequenceId: 1,
      });

      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(3);
      expect(result.asks).toHaveLength(3);

      // Should keep the top 3 bids (closest to spread)
      expect(result.bids[0]!.price).toBe(100);
      expect(result.bids[2]!.price).toBe(98);

      // Should keep the top 3 asks (closest to spread)
      expect(result.asks[0]!.price).toBe(101);
      expect(result.asks[2]!.price).toBe(103);
    });

    it('should trim after delta application', () => {
      const manager = createManager(2);

      manager.applySnapshot({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        bids: [
          { price: 100, size: 1 },
          { price: 99, size: 1 },
        ],
        asks: [
          { price: 101, size: 1 },
          { price: 102, size: 1 },
        ],
        sequenceId: 1,
      });

      // Add a new level that should push out the furthest one
      manager.applyDelta({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 2000,
        bids: [{ price: 101, size: 0.5 }], // New best bid
        asks: [{ price: 100.5, size: 0.5 }], // New best ask
        sequenceId: 2,
        prevSequenceId: 1,
      });

      const result = manager.getSnapshot();
      expect(result.bids).toHaveLength(2);
      expect(result.asks).toHaveLength(2);
    });
  });

  describe('Best bid/ask', () => {
    it('should return best bid and ask', () => {
      const manager = createManager();

      manager.applySnapshot({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        bids: [
          { price: 98, size: 3 },
          { price: 100, size: 1 },
          { price: 99, size: 2 },
        ],
        asks: [
          { price: 103, size: 3 },
          { price: 101, size: 1 },
          { price: 102, size: 2 },
        ],
        sequenceId: 1,
      });

      expect(manager.bestBid).toEqual({ price: 100, size: 1 });
      expect(manager.bestAsk).toEqual({ price: 101, size: 1 });
    });

    it('should return null when no levels exist', () => {
      const manager = createManager();
      expect(manager.bestBid).toBeNull();
      expect(manager.bestAsk).toBeNull();
    });

    it('should return null after clearing all levels', () => {
      const manager = createManager();

      manager.applySnapshot({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 1000,
        bids: [{ price: 100, size: 1 }],
        asks: [{ price: 101, size: 1 }],
        sequenceId: 1,
      });

      // Remove all levels
      manager.applyDelta({
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timestamp: 2000,
        bids: [{ price: 100, size: 0 }],
        asks: [{ price: 101, size: 0 }],
        sequenceId: 2,
        prevSequenceId: 1,
      });

      expect(manager.bestBid).toBeNull();
      expect(manager.bestAsk).toBeNull();
    });
  });
});
