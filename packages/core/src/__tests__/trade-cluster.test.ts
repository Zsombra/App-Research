import { describe, it, expect } from 'vitest';
import { clusterTradeSizes } from '../indicators/trade-cluster.js';
import type { NormalizedTrade, TradeClusterConfig } from '@terminal/types';

function makeTrade(id: string, amount: number, price: number = 100): NormalizedTrade {
  return {
    id,
    exchange: 'simulated',
    symbol: 'BTC/USDT',
    price,
    amount,
    side: 'buy',
    timestamp: Date.now(),
    isMaker: false,
    cost: price * amount,
    liquidation: false,
  };
}

const defaultConfig: TradeClusterConfig = {
  k: 4,
  maxIterations: 50,
  useCost: true,
};

describe('clusterTradeSizes', () => {
  it('should return empty result for empty trades', () => {
    const result = clusterTradeSizes([], defaultConfig);
    expect(result.clusters).toHaveLength(0);
    expect(result.classifications).toHaveLength(0);
    expect(result.iterations).toBe(0);
  });

  it('should handle single trade', () => {
    const trades = [makeTrade('1', 1.0)];
    const result = clusterTradeSizes(trades, defaultConfig);
    expect(result.clusters).toHaveLength(1);
    expect(result.classifications).toHaveLength(1);
    expect(result.classifications[0]!.bucket).toBe('small');
  });

  it('should cluster clearly separated groups', () => {
    // 4 distinct groups
    const trades = [
      // Small: ~$10
      ...Array.from({ length: 10 }, (_, i) => makeTrade(`s${i}`, 0.1, 100)),
      // Medium: ~$500
      ...Array.from({ length: 10 }, (_, i) => makeTrade(`m${i}`, 5, 100)),
      // Large: ~$5000
      ...Array.from({ length: 10 }, (_, i) => makeTrade(`l${i}`, 50, 100)),
      // Whale: ~$50000
      ...Array.from({ length: 10 }, (_, i) => makeTrade(`w${i}`, 500, 100)),
    ];

    const result = clusterTradeSizes(trades, defaultConfig);
    expect(result.clusters).toHaveLength(4);

    // Clusters should be sorted by centroid (small → whale)
    expect(result.clusters[0]!.bucket).toBe('small');
    expect(result.clusters[3]!.bucket).toBe('whale');

    // Each cluster should have 10 trades
    for (const cluster of result.clusters) {
      expect(cluster.count).toBe(10);
    }
  });

  it('should assign correct buckets to classifications', () => {
    const trades = [
      makeTrade('tiny', 0.01, 100),   // cost = 1
      makeTrade('big', 100, 100),     // cost = 10000
    ];

    const config: TradeClusterConfig = { k: 2, maxIterations: 50, useCost: true };
    const result = clusterTradeSizes(trades, config);

    const tinyClass = result.classifications.find((c) => c.tradeId === 'tiny');
    const bigClass = result.classifications.find((c) => c.tradeId === 'big');
    expect(tinyClass!.bucket).toBe('small');
    expect(bigClass!.bucket).toBe('medium'); // second of 2 clusters
  });

  it('should use amount instead of cost when useCost is false', () => {
    const trades = [
      makeTrade('a', 0.001, 50000), // cost=50, amount=0.001
      makeTrade('b', 10, 1),        // cost=10, amount=10
    ];

    const config: TradeClusterConfig = { k: 2, maxIterations: 50, useCost: false };
    const result = clusterTradeSizes(trades, config);

    // By amount: 0.001 is small, 10 is bigger
    const classA = result.classifications.find((c) => c.tradeId === 'a');
    const classB = result.classifications.find((c) => c.tradeId === 'b');
    expect(classA!.bucket).toBe('small');
    expect(classB!.bucket).toBe('medium');
  });

  it('should converge within max iterations', () => {
    const trades = Array.from({ length: 100 }, (_, i) =>
      makeTrade(`t${i}`, Math.random() * 100, 100)
    );

    const result = clusterTradeSizes(trades, defaultConfig);
    expect(result.iterations).toBeLessThanOrEqual(50);
    expect(result.clusters).toHaveLength(4);
    expect(result.classifications).toHaveLength(100);
  });

  it('should compute correct cluster stats', () => {
    const trades = [
      makeTrade('a', 1, 100),  // cost = 100
      makeTrade('b', 2, 100),  // cost = 200
      makeTrade('c', 10, 100), // cost = 1000
      makeTrade('d', 11, 100), // cost = 1100
    ];

    const config: TradeClusterConfig = { k: 2, maxIterations: 50, useCost: true };
    const result = clusterTradeSizes(trades, config);

    // 2 clusters: small (100, 200) and medium (1000, 1100)
    expect(result.clusters).toHaveLength(2);
    const small = result.clusters[0]!;
    const medium = result.clusters[1]!;

    expect(small.count).toBe(2);
    expect(small.totalVolume).toBe(300);
    expect(small.min).toBe(100);
    expect(small.max).toBe(200);

    expect(medium.count).toBe(2);
    expect(medium.totalVolume).toBe(2100);
    expect(medium.min).toBe(1000);
    expect(medium.max).toBe(1100);
  });
});
