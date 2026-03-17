import { describe, it, expect } from 'vitest';
import { aggregateTrade, timeframeToMs, floorToCandle } from '../stores/candle-aggregator.js';
import type { NormalizedTrade, OHLCVCandle } from '@terminal/types';

function makeTrade(overrides: Partial<NormalizedTrade> = {}): NormalizedTrade {
  return {
    id: `t-${Math.random()}`,
    exchange: 'simulated',
    symbol: 'BTC/USDT',
    price: 65000,
    amount: 0.1,
    side: 'buy',
    timestamp: Date.now(),
    isMaker: false,
    cost: 6500,
    liquidation: false,
    ...overrides,
  };
}

describe('timeframeToMs', () => {
  it('should return 60000 for 1m', () => {
    expect(timeframeToMs('1m')).toBe(60_000);
  });

  it('should return 3600000 for 1h', () => {
    expect(timeframeToMs('1h')).toBe(3_600_000);
  });

  it('should return 1000 for 1s', () => {
    expect(timeframeToMs('1s')).toBe(1_000);
  });
});

describe('floorToCandle', () => {
  it('should floor to minute boundary', () => {
    const ts = 1700000000123; // some timestamp
    const floored = floorToCandle(ts, 60_000);
    expect(floored % 60_000).toBe(0);
    expect(floored).toBeLessThanOrEqual(ts);
    expect(ts - floored).toBeLessThan(60_000);
  });
});

describe('aggregateTrade', () => {
  it('should create a new candle from first trade', () => {
    const candles: OHLCVCandle[] = [];
    const trade = makeTrade({ price: 65000, amount: 0.5, side: 'buy' });

    aggregateTrade(candles, trade, '1m');

    expect(candles).toHaveLength(1);
    expect(candles[0]!.open).toBe(65000);
    expect(candles[0]!.high).toBe(65000);
    expect(candles[0]!.low).toBe(65000);
    expect(candles[0]!.close).toBe(65000);
    expect(candles[0]!.volume).toBe(0.5);
    expect(candles[0]!.buyVolume).toBe(0.5);
    expect(candles[0]!.sellVolume).toBe(0);
    expect(candles[0]!.tradeCount).toBe(1);
    expect(candles[0]!.closed).toBe(false);
  });

  it('should update existing candle for same period', () => {
    const candles: OHLCVCandle[] = [];
    const now = Date.now();
    const trade1 = makeTrade({ price: 65000, amount: 0.5, side: 'buy', timestamp: now });
    const trade2 = makeTrade({ price: 65100, amount: 0.3, side: 'sell', timestamp: now + 1000 });

    aggregateTrade(candles, trade1, '1m');
    aggregateTrade(candles, trade2, '1m');

    expect(candles).toHaveLength(1);
    expect(candles[0]!.open).toBe(65000);
    expect(candles[0]!.high).toBe(65100);
    expect(candles[0]!.close).toBe(65100);
    expect(candles[0]!.volume).toBeCloseTo(0.8);
    expect(candles[0]!.buyVolume).toBeCloseTo(0.5);
    expect(candles[0]!.sellVolume).toBeCloseTo(0.3);
    expect(candles[0]!.tradeCount).toBe(2);
  });

  it('should create new candle for different period', () => {
    const candles: OHLCVCandle[] = [];
    const baseTime = floorToCandle(Date.now(), 60_000);
    const trade1 = makeTrade({ price: 65000, timestamp: baseTime + 1000 });
    const trade2 = makeTrade({ price: 65100, timestamp: baseTime + 61_000 }); // next minute

    aggregateTrade(candles, trade1, '1m');
    aggregateTrade(candles, trade2, '1m');

    expect(candles).toHaveLength(2);
    expect(candles[0]!.closed).toBe(true);
    expect(candles[1]!.closed).toBe(false);
    expect(candles[1]!.open).toBe(65100);
  });

  it('should track low price correctly', () => {
    const candles: OHLCVCandle[] = [];
    const now = Date.now();
    aggregateTrade(candles, makeTrade({ price: 65000, timestamp: now }), '1m');
    aggregateTrade(candles, makeTrade({ price: 64900, timestamp: now + 100 }), '1m');
    aggregateTrade(candles, makeTrade({ price: 65200, timestamp: now + 200 }), '1m');

    expect(candles[0]!.low).toBe(64900);
    expect(candles[0]!.high).toBe(65200);
  });

  it('should trim old candles when exceeding max', () => {
    const candles: OHLCVCandle[] = [];
    const baseTime = floorToCandle(Date.now(), 1_000); // Using 1s timeframe for easy testing

    // Create 10 candles
    for (let i = 0; i < 10; i++) {
      aggregateTrade(
        candles,
        makeTrade({ timestamp: baseTime + i * 1000 + 100 }),
        '1s',
        5 // max 5 candles
      );
    }

    expect(candles.length).toBeLessThanOrEqual(5);
  });
});
