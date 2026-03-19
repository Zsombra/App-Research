import { describe, it, expect } from 'vitest';
import { computeOrderbookImbalance, detectStackedImbalances } from '../indicators/orderbook-imbalance.js';
import type { OrderbookSnapshot, PriceLevel } from '@terminal/types';

function makeSnapshot(overrides: Partial<OrderbookSnapshot> = {}): OrderbookSnapshot {
  return {
    exchange: 'simulated',
    symbol: 'BTC/USDT',
    timestamp: Date.now(),
    bids: [
      { price: 100, size: 10 },
      { price: 99, size: 8 },
      { price: 98, size: 5 },
    ],
    asks: [
      { price: 101, size: 10 },
      { price: 102, size: 8 },
      { price: 103, size: 5 },
    ],
    sequenceId: 1,
    ...overrides,
  };
}

describe('computeOrderbookImbalance', () => {
  it('should compute balanced bid/ask ratio', () => {
    const result = computeOrderbookImbalance(makeSnapshot());
    expect(result.bidAskRatio).toBeCloseTo(1, 1);
    expect(result.totalBidVolume).toBe(23);
    expect(result.totalAskVolume).toBe(23);
  });

  it('should detect bid-heavy imbalance', () => {
    const result = computeOrderbookImbalance(makeSnapshot({
      bids: [
        { price: 100, size: 50 },
        { price: 99, size: 40 },
      ],
      asks: [
        { price: 101, size: 5 },
        { price: 102, size: 3 },
      ],
    }));
    expect(result.bidAskRatio).toBeGreaterThan(5);
  });

  it('should detect ask-heavy imbalance', () => {
    const result = computeOrderbookImbalance(makeSnapshot({
      bids: [
        { price: 100, size: 2 },
        { price: 99, size: 3 },
      ],
      asks: [
        { price: 101, size: 40 },
        { price: 102, size: 50 },
      ],
    }));
    expect(result.bidAskRatio).toBeLessThan(0.2);
  });

  it('should handle empty orderbook', () => {
    const result = computeOrderbookImbalance(makeSnapshot({
      bids: [],
      asks: [],
    }));
    expect(result.bidAskRatio).toBe(1);
    expect(result.totalBidVolume).toBe(0);
  });

  it('should return Infinity ratio when asks are empty but bids exist', () => {
    const result = computeOrderbookImbalance(makeSnapshot({
      bids: [{ price: 100, size: 10 }],
      asks: [],
    }));
    expect(result.bidAskRatio).toBe(Infinity);
    expect(result.totalBidVolume).toBe(10);
    expect(result.totalAskVolume).toBe(0);
  });

  it('should respect depthLevels parameter', () => {
    const result = computeOrderbookImbalance(makeSnapshot(), 2);
    // Only first 2 levels: bids 10+8=18, asks 10+8=18
    expect(result.totalBidVolume).toBe(18);
    expect(result.totalAskVolume).toBe(18);
  });

  it('should always return empty absorptions array', () => {
    const result = computeOrderbookImbalance(makeSnapshot());
    expect(result.absorptions).toHaveLength(0);
  });
});

describe('detectStackedImbalances', () => {
  it('should detect bid-side stacked imbalances', () => {
    const bids: PriceLevel[] = [
      { price: 100, size: 30 },
      { price: 99, size: 40 },
      { price: 98, size: 35 },
      { price: 97, size: 25 },
    ];
    const asks: PriceLevel[] = [
      { price: 101, size: 5 },
      { price: 102, size: 4 },
      { price: 103, size: 3 },
      { price: 104, size: 6 },
    ];

    const result = detectStackedImbalances(bids, asks, 3, 3);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.side).toBe('bid');
  });

  it('should not detect when below threshold', () => {
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

    const result = detectStackedImbalances(bids, asks, 3, 3);
    expect(result).toHaveLength(0);
  });

  it('should require minimum consecutive levels', () => {
    const bids: PriceLevel[] = [
      { price: 100, size: 50 },
      { price: 99, size: 50 },
      { price: 98, size: 5 }, // breaks the streak
    ];
    const asks: PriceLevel[] = [
      { price: 101, size: 5 },
      { price: 102, size: 5 },
      { price: 103, size: 50 },
    ];

    const result = detectStackedImbalances(bids, asks, 3, 3);
    // Only 2 consecutive, need 3 minimum
    expect(result).toHaveLength(0);
  });
});
