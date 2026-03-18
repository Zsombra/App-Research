import { describe, it, expect } from 'vitest';
import { filterFootprintLevels } from '../indicators/footprint-filter.js';
import type { FootprintCandle, FootprintFilter } from '@terminal/types';

function makeCandle(levels: { price: number; buy: number; sell: number; trades: number }[]): FootprintCandle {
  let maxVol = 0;
  const fpLevels = levels.map((l) => {
    const total = l.buy + l.sell;
    if (total > maxVol) maxVol = total;
    return { price: l.price, buyVolume: l.buy, sellVolume: l.sell, tradeCount: l.trades };
  });
  return {
    timestamp: 1700000000000,
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 1000,
    levels: fpLevels,
    tickSize: 1,
    maxLevelVolume: maxVol,
  };
}

describe('filterFootprintLevels', () => {
  const candle = makeCandle([
    { price: 100, buy: 10, sell: 5, trades: 3 },
    { price: 101, buy: 50, sell: 30, trades: 20 },
    { price: 102, buy: 2, sell: 1, trades: 1 },
    { price: 103, buy: 20, sell: 25, trades: 10 },
    { price: 104, buy: 100, sell: 80, trades: 50 },
  ]);

  it('should pass through all levels when mode is none', () => {
    const filter: FootprintFilter = { mode: 'none', minVolume: 0, minTrades: 0, minDelta: 0, percentile: 90 };
    const result = filterFootprintLevels([candle], filter);
    expect(result[0]!.levels).toHaveLength(5);
  });

  it('should filter by minimum volume', () => {
    const filter: FootprintFilter = { mode: 'min-volume', minVolume: 20, minTrades: 0, minDelta: 0, percentile: 90 };
    const result = filterFootprintLevels([candle], filter);
    // Levels with total >= 20: 101 (80), 103 (45), 104 (180)
    expect(result[0]!.levels).toHaveLength(3);
    expect(result[0]!.levels.map((l) => l.price)).toEqual([101, 103, 104]);
  });

  it('should filter by minimum trade count', () => {
    const filter: FootprintFilter = { mode: 'min-trades', minVolume: 0, minTrades: 10, minDelta: 0, percentile: 90 };
    const result = filterFootprintLevels([candle], filter);
    // trades >= 10: 101 (20), 103 (10), 104 (50)
    expect(result[0]!.levels).toHaveLength(3);
    expect(result[0]!.levels.map((l) => l.price)).toEqual([101, 103, 104]);
  });

  it('should filter by minimum delta', () => {
    const filter: FootprintFilter = { mode: 'min-delta', minVolume: 0, minTrades: 0, minDelta: 10, percentile: 90 };
    const result = filterFootprintLevels([candle], filter);
    // |delta| >= 10: 101 (|50-30|=20), 104 (|100-80|=20)
    expect(result[0]!.levels).toHaveLength(2);
    expect(result[0]!.levels.map((l) => l.price)).toEqual([101, 104]);
  });

  it('should filter by percentile', () => {
    // percentile=60 means keep levels in top 40% by volume
    // Volumes: 15, 80, 3, 45, 180 → sorted: 3, 15, 45, 80, 180
    // idx = floor(60/100 * 4) = floor(2.4) = 2 → threshold = 45
    const filter: FootprintFilter = { mode: 'percentile', minVolume: 0, minTrades: 0, minDelta: 0, percentile: 60 };
    const result = filterFootprintLevels([candle], filter);
    // >= 45: 101 (80), 103 (45), 104 (180)
    expect(result[0]!.levels).toHaveLength(3);
  });

  it('should update maxLevelVolume after filtering', () => {
    const filter: FootprintFilter = { mode: 'min-volume', minVolume: 100, minTrades: 0, minDelta: 0, percentile: 90 };
    const result = filterFootprintLevels([candle], filter);
    // Only 104 (180) passes
    expect(result[0]!.levels).toHaveLength(1);
    expect(result[0]!.maxLevelVolume).toBe(180);
  });

  it('should handle empty levels', () => {
    const empty = makeCandle([]);
    const filter: FootprintFilter = { mode: 'min-volume', minVolume: 10, minTrades: 0, minDelta: 0, percentile: 90 };
    const result = filterFootprintLevels([empty], filter);
    expect(result[0]!.levels).toHaveLength(0);
  });

  it('should handle multiple candles', () => {
    const candle2 = makeCandle([
      { price: 200, buy: 5, sell: 5, trades: 2 },
      { price: 201, buy: 100, sell: 100, trades: 50 },
    ]);
    const filter: FootprintFilter = { mode: 'min-volume', minVolume: 40, minTrades: 0, minDelta: 0, percentile: 90 };
    const result = filterFootprintLevels([candle, candle2], filter);
    expect(result[0]!.levels).toHaveLength(3); // 101 (80), 103 (45), 104 (180)
    expect(result[1]!.levels).toHaveLength(1); // 201
  });
});
