import { describe, it, expect } from 'vitest';
import { clusterByTime } from '../indicators/time-cluster.js';
import type { NormalizedTrade, TimeClusterConfig } from '@terminal/types';

function makeTrade(ts: number, side: 'buy' | 'sell', amount: number, price: number = 100): NormalizedTrade {
  return {
    id: `t-${ts}`,
    exchange: 'simulated',
    symbol: 'BTC/USDT',
    price,
    amount,
    side,
    timestamp: ts,
    isMaker: false,
    cost: price * amount,
    liquidation: false,
  };
}

const defaultConfig: TimeClusterConfig = {
  maxGapMs: 500,
  minTrades: 1,
  minCost: 0,
};

describe('clusterByTime', () => {
  it('should return empty for empty trades', () => {
    const result = clusterByTime([], defaultConfig);
    expect(result).toHaveLength(0);
  });

  it('should group consecutive trades within maxGapMs', () => {
    const trades = [
      makeTrade(1000, 'buy', 1),
      makeTrade(1200, 'buy', 2),   // 200ms gap
      makeTrade(1400, 'sell', 1),  // 200ms gap
      makeTrade(3000, 'buy', 1),   // 1600ms gap — new cluster
    ];

    const result = clusterByTime(trades, defaultConfig);
    expect(result).toHaveLength(2);
    expect(result[0]!.tradeCount).toBe(3);
    expect(result[0]!.startTime).toBe(1000);
    expect(result[0]!.endTime).toBe(1400);
    expect(result[1]!.tradeCount).toBe(1);
  });

  it('should filter by minTrades', () => {
    const trades = [
      makeTrade(1000, 'buy', 1),
      makeTrade(1200, 'buy', 2),
      makeTrade(5000, 'sell', 1), // alone
    ];

    const config: TimeClusterConfig = { maxGapMs: 500, minTrades: 2, minCost: 0 };
    const result = clusterByTime(trades, config);
    expect(result).toHaveLength(1); // only the first cluster (2 trades)
    expect(result[0]!.tradeCount).toBe(2);
  });

  it('should filter by minCost', () => {
    const trades = [
      makeTrade(1000, 'buy', 0.01, 100),  // cost = 1
      makeTrade(1200, 'buy', 0.01, 100),  // cost = 1 (cluster total = 2)
      makeTrade(5000, 'buy', 10, 100),    // cost = 1000
    ];

    const config: TimeClusterConfig = { maxGapMs: 500, minTrades: 1, minCost: 100 };
    const result = clusterByTime(trades, config);
    expect(result).toHaveLength(1);
    expect(result[0]!.totalCost).toBe(1000);
  });

  it('should compute buy/sell volume separately', () => {
    const trades = [
      makeTrade(1000, 'buy', 5, 100),   // cost = 500
      makeTrade(1100, 'sell', 3, 100),  // cost = 300
      makeTrade(1200, 'buy', 2, 100),   // cost = 200
    ];

    const result = clusterByTime(trades, defaultConfig);
    expect(result).toHaveLength(1);
    expect(result[0]!.buyCost).toBe(700);
    expect(result[0]!.sellCost).toBe(300);
    expect(result[0]!.totalCost).toBe(1000);
  });

  it('should compute VWAP correctly', () => {
    const trades = [
      makeTrade(1000, 'buy', 1, 100),  // cost=100, cost*price = 10000
      makeTrade(1100, 'buy', 1, 200),  // cost=200, cost*price = 40000
    ];

    const result = clusterByTime(trades, defaultConfig);
    // VWAP = (100*100 + 200*200) / (100 + 200) = 50000 / 300 ≈ 166.67
    expect(result[0]!.vwap).toBeCloseTo(166.67, 1);
  });

  it('should handle all trades in one cluster', () => {
    const trades = [
      makeTrade(1000, 'buy', 1),
      makeTrade(1100, 'sell', 1),
      makeTrade(1200, 'buy', 1),
      makeTrade(1300, 'sell', 1),
    ];

    const result = clusterByTime(trades, defaultConfig);
    expect(result).toHaveLength(1);
    expect(result[0]!.tradeCount).toBe(4);
  });

  it('should handle each trade as its own cluster when gap > maxGapMs', () => {
    const trades = [
      makeTrade(1000, 'buy', 1),
      makeTrade(5000, 'sell', 1),
      makeTrade(10000, 'buy', 1),
    ];

    const result = clusterByTime(trades, defaultConfig);
    expect(result).toHaveLength(3);
  });
});
