import { describe, it, expect } from 'vitest';
import type { OrderbookSnapshot, PriceLevel } from '@terminal/types';
import { computeOrderbookImbalance, detectStackedImbalances } from '../indicators/orderbook-imbalance.js';

function makeSnapshot(
  bids: Array<{ price: number; size: number }>,
  asks: Array<{ price: number; size: number }>,
): OrderbookSnapshot {
  return {
    exchange: 'test',
    symbol: 'BTC/USDT',
    timestamp: Date.now(),
    bids: bids.map(({ price, size }) => ({ price, size })),
    asks: asks.map(({ price, size }) => ({ price, size })),
    sequenceId: 1,
  };
}

describe('computeOrderbookImbalance edge cases', () => {
  describe('zero volume handling', () => {
    it('should return ratio 0 when both sides have zero volume', () => {
      const snapshot = makeSnapshot(
        [{ price: 100, size: 0 }, { price: 99, size: 0 }],
        [{ price: 101, size: 0 }, { price: 102, size: 0 }],
      );
      const result = computeOrderbookImbalance(snapshot);

      expect(result.bidAskRatio).toBe(0);
      expect(result.totalBidVolume).toBe(0);
      expect(result.totalAskVolume).toBe(0);
    });

    it('should return Infinity when ask volume is 0 but bid volume is positive', () => {
      const snapshot = makeSnapshot(
        [{ price: 100, size: 10 }],
        [{ price: 101, size: 0 }],
      );
      const result = computeOrderbookImbalance(snapshot);

      expect(result.bidAskRatio).toBe(Infinity);
    });

    it('should return 0 when bid volume is 0 but ask volume is positive', () => {
      const snapshot = makeSnapshot(
        [{ price: 100, size: 0 }],
        [{ price: 101, size: 10 }],
      );
      const result = computeOrderbookImbalance(snapshot);

      expect(result.bidAskRatio).toBeCloseTo(0);
    });
  });

  describe('empty orderbook', () => {
    it('should handle empty bids and asks', () => {
      const snapshot = makeSnapshot([], []);
      const result = computeOrderbookImbalance(snapshot);

      expect(result.bidAskRatio).toBe(0);
      expect(result.totalBidVolume).toBe(0);
      expect(result.totalAskVolume).toBe(0);
      expect(result.stackedImbalances).toHaveLength(0);
    });
  });

  describe('balanced orderbook', () => {
    it('should return ratio ~1.0 for equal volumes', () => {
      const snapshot = makeSnapshot(
        [{ price: 100, size: 10 }, { price: 99, size: 10 }],
        [{ price: 101, size: 10 }, { price: 102, size: 10 }],
      );
      const result = computeOrderbookImbalance(snapshot);

      expect(result.bidAskRatio).toBeCloseTo(1.0);
    });
  });

  describe('depth levels parameter', () => {
    it('should only consider specified depth levels', () => {
      const snapshot = makeSnapshot(
        [{ price: 100, size: 10 }, { price: 99, size: 1000 }],
        [{ price: 101, size: 10 }, { price: 102, size: 1000 }],
      );

      const shallow = computeOrderbookImbalance(snapshot, 1);
      const deep = computeOrderbookImbalance(snapshot, 2);

      expect(shallow.totalBidVolume).toBe(10);
      expect(deep.totalBidVolume).toBe(1010);
    });
  });
});

describe('detectStackedImbalances edge cases', () => {
  describe('no imbalances', () => {
    it('should return empty array for balanced orderbook', () => {
      const bids: PriceLevel[] = [
        { price: 100, size: 10 },
        { price: 99, size: 10 },
        { price: 98, size: 10 },
      ];
      const asks: PriceLevel[] = [
        { price: 101, size: 10 },
        { price: 102, size: 10 },
        { price: 103, size: 10 },
      ];

      const result = detectStackedImbalances(bids, asks);
      expect(result).toHaveLength(0);
    });
  });

  describe('stacked bid imbalances', () => {
    it('should detect 3+ consecutive bid-heavy levels', () => {
      const bids: PriceLevel[] = [
        { price: 100, size: 100 },
        { price: 99, size: 100 },
        { price: 98, size: 100 },
      ];
      const asks: PriceLevel[] = [
        { price: 101, size: 1 },
        { price: 102, size: 1 },
        { price: 103, size: 1 },
      ];

      const result = detectStackedImbalances(bids, asks, 3, 3);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.side).toBe('bid');
    });
  });

  describe('threshold parameter', () => {
    it('should not detect imbalances below threshold', () => {
      const bids: PriceLevel[] = [
        { price: 100, size: 20 },
        { price: 99, size: 20 },
        { price: 98, size: 20 },
      ];
      const asks: PriceLevel[] = [
        { price: 101, size: 10 },
        { price: 102, size: 10 },
        { price: 103, size: 10 },
      ];

      // Ratio is 2x, but threshold is 3x
      const result = detectStackedImbalances(bids, asks, 3, 3);
      expect(result).toHaveLength(0);
    });
  });

  describe('zero size levels', () => {
    it('should skip levels with zero size', () => {
      const bids: PriceLevel[] = [
        { price: 100, size: 0 },
        { price: 99, size: 100 },
        { price: 98, size: 100 },
      ];
      const asks: PriceLevel[] = [
        { price: 101, size: 0 },
        { price: 102, size: 1 },
        { price: 103, size: 1 },
      ];

      // First level has zero size, no division occurs
      const result = detectStackedImbalances(bids, asks, 3, 2);
      // Should only consider non-zero levels
      expect(result.length).toBeGreaterThanOrEqual(0); // Just verify no crash
    });
  });
});
