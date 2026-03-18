import { describe, it, expect } from 'vitest';
import { buildMBOProfile } from '../market/mbo.js';
import type { MBOSnapshot, MBOProfileConfig } from '../index.js';

const config: MBOProfileConfig = {
  depthLevels: 5,
  largeOrderThreshold: 10,
  showOrderAge: true,
};

function makeSnapshot(bids: { price: number; size: number; ts: number }[], asks: { price: number; size: number; ts: number }[]): MBOSnapshot {
  return {
    symbol: 'BTC/USDT',
    bids: bids.map((b, i) => ({ orderId: `b${i}`, price: b.price, size: b.size, side: 'bid' as const, timestamp: b.ts })),
    asks: asks.map((a, i) => ({ orderId: `a${i}`, price: a.price, size: a.size, side: 'ask' as const, timestamp: a.ts })),
    timestamp: 1000000,
  };
}

describe('buildMBOProfile', () => {
  it('should return empty for empty snapshot', () => {
    const snap = makeSnapshot([], []);
    const result = buildMBOProfile(snap, config, 1000000);
    expect(result).toHaveLength(0);
  });

  it('should aggregate orders at same price level', () => {
    const snap = makeSnapshot(
      [
        { price: 50000, size: 1, ts: 900000 },
        { price: 50000, size: 2, ts: 950000 },
        { price: 49900, size: 3, ts: 800000 },
      ],
      [{ price: 50100, size: 0.5, ts: 990000 }]
    );

    const result = buildMBOProfile(snap, config, 1000000);

    // 2 bid levels + 1 ask level
    const bids = result.filter((l) => l.side === 'bid');
    const asks = result.filter((l) => l.side === 'ask');
    expect(bids).toHaveLength(2);
    expect(asks).toHaveLength(1);

    // Level at 50000 should have 2 orders, total 3
    const top = bids.find((l) => l.price === 50000)!;
    expect(top.orderCount).toBe(2);
    expect(top.totalSize).toBe(3);
    expect(top.avgSize).toBe(1.5);
    expect(top.maxOrderSize).toBe(2);
  });

  it('should compute oldest order age', () => {
    const snap = makeSnapshot(
      [{ price: 50000, size: 1, ts: 500000 }],
      []
    );

    const result = buildMBOProfile(snap, config, 1000000);
    expect(result[0]!.oldestOrderAge).toBe(500000);
  });

  it('should limit to depthLevels', () => {
    const bids = Array.from({ length: 20 }, (_, i) => ({
      price: 50000 - i * 10,
      size: 1,
      ts: 900000,
    }));

    const snap = makeSnapshot(bids, []);
    const result = buildMBOProfile(snap, config, 1000000);
    expect(result).toHaveLength(5); // config.depthLevels = 5
  });

  it('should sort bids descending and asks ascending', () => {
    const snap = makeSnapshot(
      [
        { price: 49900, size: 1, ts: 900000 },
        { price: 50000, size: 1, ts: 900000 },
      ],
      [
        { price: 50200, size: 1, ts: 900000 },
        { price: 50100, size: 1, ts: 900000 },
      ]
    );

    const result = buildMBOProfile(snap, config, 1000000);
    const bids = result.filter((l) => l.side === 'bid');
    const asks = result.filter((l) => l.side === 'ask');

    expect(bids[0]!.price).toBe(50000); // highest bid first
    expect(bids[1]!.price).toBe(49900);
    expect(asks[0]!.price).toBe(50100); // lowest ask first
    expect(asks[1]!.price).toBe(50200);
  });
});
