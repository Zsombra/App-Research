import { describe, it, expect } from 'vitest';
import { buildTickBars, buildVolumeBars, buildRangeBars } from '../indicators/custom-bars.js';
import type { NormalizedTrade } from '@terminal/types';
import type { TickBarConfig, VolumeBarConfig, RangeBarConfig } from '@terminal/types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let tradeIdCounter = 0;

/**
 * Generate a single NormalizedTrade with explicit control over the fields
 * that the bar-building functions actually inspect: price, amount, side,
 * timestamp. exchange and symbol are kept constant so that bar output can be
 * asserted against known values.
 */
function makeTrade(
  price: number,
  amount: number,
  side: 'buy' | 'sell' = 'buy',
  timestamp?: number,
): NormalizedTrade {
  tradeIdCounter += 1;
  return {
    id: `trade-${tradeIdCounter}`,
    exchange: 'simulated',
    symbol: 'BTC/USDT',
    price,
    amount,
    side,
    timestamp: timestamp ?? 1_700_000_000_000 + tradeIdCounter * 100,
    isMaker: false,
    cost: price * amount,
    liquidation: false,
  };
}

/**
 * Generate an array of NormalizedTrades from a compact descriptor list.
 * Each element is [price, amount, side?].
 */
function makeTrades(
  descriptors: Array<[price: number, amount: number, side?: 'buy' | 'sell']>,
): NormalizedTrade[] {
  return descriptors.map(([price, amount, side]) => makeTrade(price, amount, side ?? 'buy'));
}

// ---------------------------------------------------------------------------
// buildTickBars
// ---------------------------------------------------------------------------

describe('buildTickBars', () => {
  const config: TickBarConfig = { type: 'tick', tickCount: 3 };

  it('returns empty array for empty trade list', () => {
    expect(buildTickBars([], config)).toEqual([]);
  });

  it('returns empty array when tickCount is zero', () => {
    const trades = makeTrades([[100, 1]]);
    expect(buildTickBars(trades, { type: 'tick', tickCount: 0 })).toEqual([]);
  });

  it('creates exactly one bar when trade count equals tickCount', () => {
    const trades = makeTrades([
      [100, 1],
      [101, 2],
      [102, 3],
    ]);
    const bars = buildTickBars(trades, config);
    expect(bars).toHaveLength(1);
  });

  it('creates N complete bars when trades divide evenly', () => {
    // 6 trades with tickCount=3 → 2 full bars
    const trades = makeTrades([
      [100, 1],
      [101, 1],
      [102, 1],
      [103, 1],
      [104, 1],
      [105, 1],
    ]);
    const bars = buildTickBars(trades, config);
    expect(bars).toHaveLength(2);
    expect(bars[0]!.tradeCount).toBe(3);
    expect(bars[1]!.tradeCount).toBe(3);
  });

  it('last bar may have fewer than tickCount trades', () => {
    // 7 trades with tickCount=3 → 2 full bars + 1 partial bar (1 trade)
    const trades = makeTrades([
      [100, 1],
      [101, 1],
      [102, 1],
      [103, 1],
      [104, 1],
      [105, 1],
      [106, 1],
    ]);
    const bars = buildTickBars(trades, config);
    expect(bars).toHaveLength(3);
    expect(bars[2]!.tradeCount).toBe(1);
  });

  it('computes OHLCV correctly from trades', () => {
    // open=first price, high=max, low=min, close=last price
    const trades = makeTrades([
      [100, 1, 'buy'],  // open
      [105, 2, 'sell'], // high
      [98,  1, 'buy'],  // low
      [103, 3, 'buy'],  // close
    ]);
    const bars = buildTickBars(trades, { type: 'tick', tickCount: 4 });

    expect(bars).toHaveLength(1);
    const bar = bars[0]!;
    expect(bar.open).toBe(100);
    expect(bar.high).toBe(105);
    expect(bar.low).toBe(98);
    expect(bar.close).toBe(103);
    expect(bar.volume).toBe(1 + 2 + 1 + 3);
  });

  it('carries exchange and symbol from the first trade in each bar', () => {
    const trades = makeTrades([[100, 1], [101, 1], [102, 1]]);
    const bars = buildTickBars(trades, config);
    expect(bars[0]!.exchange).toBe('simulated');
    expect(bars[0]!.symbol).toBe('BTC/USDT');
  });

  it('uses timestamp of the first trade in each bar', () => {
    const t0 = 1_700_000_000_000;
    const trades = [
      makeTrade(100, 1, 'buy', t0),
      makeTrade(101, 1, 'buy', t0 + 1000),
      makeTrade(102, 1, 'buy', t0 + 2000),
      makeTrade(103, 1, 'buy', t0 + 3000),
    ];
    const bars = buildTickBars(trades, { type: 'tick', tickCount: 2 });
    expect(bars[0]!.timestamp).toBe(t0);
    expect(bars[1]!.timestamp).toBe(t0 + 2000);
  });

  it('marks all bars as closed', () => {
    const trades = makeTrades([[100, 1], [101, 1], [102, 1], [103, 1]]);
    const bars = buildTickBars(trades, config);
    for (const bar of bars) {
      expect(bar.closed).toBe(true);
    }
  });

  it('computes buy and sell volume breakdown correctly', () => {
    const trades = makeTrades([
      [100, 2, 'buy'],
      [101, 3, 'sell'],
      [102, 5, 'buy'],
    ]);
    const bars = buildTickBars(trades, { type: 'tick', tickCount: 3 });
    expect(bars).toHaveLength(1);
    const bar = bars[0]!;
    expect(bar.buyVolume).toBe(2 + 5);   // 7
    expect(bar.sellVolume).toBe(3);
    expect(bar.volume).toBe(bar.buyVolume + bar.sellVolume);
  });

  it('buy + sell volume always sums to total volume across all bars', () => {
    const trades = makeTrades([
      [100, 1, 'buy'],
      [101, 2, 'sell'],
      [102, 3, 'buy'],
      [103, 4, 'sell'],
      [104, 5, 'buy'],
    ]);
    const bars = buildTickBars(trades, { type: 'tick', tickCount: 2 });
    for (const bar of bars) {
      expect(bar.buyVolume + bar.sellVolume).toBeCloseTo(bar.volume);
    }
  });

  it('handles single trade input', () => {
    const trades = [makeTrade(100, 5, 'sell')];
    const bars = buildTickBars(trades, config);
    expect(bars).toHaveLength(1);
    const bar = bars[0]!;
    expect(bar.open).toBe(100);
    expect(bar.close).toBe(100);
    expect(bar.high).toBe(100);
    expect(bar.low).toBe(100);
    expect(bar.volume).toBe(5);
    expect(bar.sellVolume).toBe(5);
    expect(bar.buyVolume).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildVolumeBars
// ---------------------------------------------------------------------------

describe('buildVolumeBars', () => {
  const config: VolumeBarConfig = { type: 'volume', volumeThreshold: 10 };

  it('returns empty array for empty trade list', () => {
    expect(buildVolumeBars([], config)).toEqual([]);
  });

  it('returns empty array when volumeThreshold is zero', () => {
    const trades = makeTrades([[100, 1]]);
    expect(buildVolumeBars(trades, { type: 'volume', volumeThreshold: 0 })).toEqual([]);
  });

  it('emits a closed bar when accumulated volume exactly meets threshold', () => {
    // 2 trades of 5 each → threshold 10 exactly reached
    const trades = makeTrades([
      [100, 5],
      [101, 5],
    ]);
    const bars = buildVolumeBars(trades, config);
    expect(bars).toHaveLength(1);
    expect(bars[0]!.closed).toBe(true);
    expect(bars[0]!.volume).toBe(10);
  });

  it('emits a closed bar when volume exceeds threshold mid-trade', () => {
    // Trades: 4, 4, 4 with threshold=10
    // After 3rd trade volume=12 ≥ 10 → one closed bar
    const trades = makeTrades([[100, 4], [101, 4], [102, 4]]);
    const bars = buildVolumeBars(trades, config);
    expect(bars).toHaveLength(1);
    expect(bars[0]!.closed).toBe(true);
    expect(bars[0]!.volume).toBe(12);
  });

  it('creates multiple closed bars and a trailing unclosed bar', () => {
    // Each group of 2×5 fills one bar; a leftover trade becomes unclosed
    const trades = makeTrades([
      [100, 5], [101, 5], // bar 1: volume=10
      [102, 5], [103, 5], // bar 2: volume=10
      [104, 3],           // leftover → unclosed
    ]);
    const bars = buildVolumeBars(trades, config);
    expect(bars).toHaveLength(3);
    expect(bars[0]!.closed).toBe(true);
    expect(bars[1]!.closed).toBe(true);
    expect(bars[2]!.closed).toBe(false);
    expect(bars[2]!.volume).toBe(3);
  });

  it('marks the last bar unclosed when remaining trades never fill the threshold', () => {
    const trades = makeTrades([[100, 2], [101, 3]]); // total 5, threshold 10
    const bars = buildVolumeBars(trades, config);
    expect(bars).toHaveLength(1);
    expect(bars[0]!.closed).toBe(false);
  });

  it('handles a single large trade that exceeds threshold on its own', () => {
    // One trade with volume 50 > threshold 10 → single closed bar
    const trades = [makeTrade(100, 50)];
    const bars = buildVolumeBars(trades, config);
    expect(bars).toHaveLength(1);
    expect(bars[0]!.closed).toBe(true);
    expect(bars[0]!.volume).toBe(50);
  });

  it('handles consecutive large trades each exceeding threshold', () => {
    const trades = makeTrades([[100, 15], [101, 20], [102, 12]]);
    const bars = buildVolumeBars(trades, config);
    // Each trade individually exceeds threshold → 3 closed bars, no remainder
    expect(bars).toHaveLength(3);
    for (const bar of bars) {
      expect(bar.closed).toBe(true);
    }
  });

  it('resets accumulator after each completed bar', () => {
    // 3 batches: [5,5], [5,5], [5] → 2 closed + 1 open
    const trades = makeTrades([
      [100, 5], [100, 5],
      [100, 5], [100, 5],
      [100, 5],
    ]);
    const bars = buildVolumeBars(trades, config);
    expect(bars).toHaveLength(3);
    expect(bars[0]!.volume).toBe(10);
    expect(bars[1]!.volume).toBe(10);
    expect(bars[2]!.volume).toBe(5);
  });

  it('computes OHLCV correctly within a single volume bar', () => {
    const trades = makeTrades([
      [100, 3, 'buy'],  // open
      [108, 4, 'sell'], // high, pushes volume to 7
      [96,  3, 'buy'],  // low, closes bar at volume=10
    ]);
    const bars = buildVolumeBars(trades, config);
    expect(bars).toHaveLength(1);
    const bar = bars[0]!;
    expect(bar.open).toBe(100);
    expect(bar.high).toBe(108);
    expect(bar.low).toBe(96);
    expect(bar.close).toBe(96);
    expect(bar.volume).toBe(10);
    expect(bar.buyVolume).toBe(3 + 3);
    expect(bar.sellVolume).toBe(4);
  });

  it('handles single trade input that does not meet threshold', () => {
    const trades = [makeTrade(200, 1)];
    const bars = buildVolumeBars(trades, config);
    expect(bars).toHaveLength(1);
    expect(bars[0]!.closed).toBe(false);
    expect(bars[0]!.volume).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// buildRangeBars
// ---------------------------------------------------------------------------

describe('buildRangeBars', () => {
  const config: RangeBarConfig = { type: 'range', rangeSize: 10 };

  it('returns empty array for empty trade list', () => {
    expect(buildRangeBars([], config)).toEqual([]);
  });

  it('returns empty array when rangeSize is zero', () => {
    const trades = makeTrades([[100, 1]]);
    expect(buildRangeBars(trades, { type: 'range', rangeSize: 0 })).toEqual([]);
  });

  it('emits a closed bar when price range first meets rangeSize', () => {
    // Prices: 100, 105, 110 → range at 110 = 10, bar closes before 110 is added
    const trades = makeTrades([[100, 1], [105, 1], [110, 1]]);
    const bars = buildRangeBars(trades, config);
    // At price=110: nextHigh - nextLow = 110-100 = 10 ≥ rangeSize=10
    // → closes [100,105], starts new bar with [110]
    expect(bars.length).toBeGreaterThanOrEqual(1);
    expect(bars[0]!.closed).toBe(true);
    expect(bars[0]!.open).toBe(100);
    expect(bars[0]!.close).toBe(105);
  });

  it('marks the final bar as unclosed', () => {
    const trades = makeTrades([[100, 1], [102, 1], [104, 1]]);
    const bars = buildRangeBars(trades, config);
    // Range never reaches 10 → one unclosed bar
    expect(bars).toHaveLength(1);
    expect(bars[0]!.closed).toBe(false);
  });

  it('handles flat price — all trades at the same price produce one unclosed bar', () => {
    const trades = makeTrades([
      [100, 1],
      [100, 2],
      [100, 3],
      [100, 4],
    ]);
    const bars = buildRangeBars(trades, config);
    expect(bars).toHaveLength(1);
    expect(bars[0]!.closed).toBe(false);
    expect(bars[0]!.high).toBe(100);
    expect(bars[0]!.low).toBe(100);
    expect(bars[0]!.tradeCount).toBe(4);
  });

  it('creates new bar when price range strictly exceeds rangeSize', () => {
    // rangeSize=10, price moves 0→11 in one step
    const trades = makeTrades([[100, 1], [111, 1]]);
    const bars = buildRangeBars(trades, config);
    // At price=111: 111-100=11 ≥ 10 → closes [100], new bar starts with [111]
    expect(bars).toHaveLength(2);
    expect(bars[0]!.closed).toBe(true);
    expect(bars[0]!.tradeCount).toBe(1);
    expect(bars[1]!.closed).toBe(false);
    expect(bars[1]!.open).toBe(111);
  });

  it('accumulates multiple completed bars across a trending price series', () => {
    // Each step of +10 should close the previous bar
    const trades = makeTrades([
      [100, 1],
      [105, 1],
      [110, 1], // closes bar 1: [100, 105]
      [115, 1],
      [120, 1], // closes bar 2: [110, 115]
      [125, 1],
    ]);
    const bars = buildRangeBars(trades, config);
    // 2 closed bars + 1 unclosed
    expect(bars).toHaveLength(3);
    expect(bars[0]!.closed).toBe(true);
    expect(bars[1]!.closed).toBe(true);
    expect(bars[2]!.closed).toBe(false);
  });

  it('correctly builds OHLCV from trades within each range bar', () => {
    // Bar captures [100, 104, 101]; closed before 111
    const trades = makeTrades([
      [100, 2, 'buy'],
      [104, 3, 'sell'],
      [101, 1, 'buy'],
      [111, 4, 'buy'], // triggers close of prior batch
    ]);
    const bars = buildRangeBars(trades, config);
    expect(bars.length).toBeGreaterThanOrEqual(1);
    const first = bars[0]!;
    expect(first.open).toBe(100);
    expect(first.high).toBe(104);
    expect(first.low).toBe(100);
    expect(first.close).toBe(101);
    expect(first.volume).toBe(2 + 3 + 1);
    expect(first.buyVolume).toBe(2 + 1);
    expect(first.sellVolume).toBe(3);
  });

  it('trade that triggers a close starts the next bar — not discarded', () => {
    const trades = makeTrades([[100, 1], [111, 5]]);
    const bars = buildRangeBars(trades, config);
    // The triggering trade (111) must become the open of the next bar
    const lastBar = bars[bars.length - 1]!;
    expect(lastBar.open).toBe(111);
    expect(lastBar.volume).toBe(5);
  });

  it('handles single trade input — produces one unclosed bar', () => {
    const trades = [makeTrade(500, 10)];
    const bars = buildRangeBars(trades, config);
    expect(bars).toHaveLength(1);
    expect(bars[0]!.closed).toBe(false);
    expect(bars[0]!.open).toBe(500);
    expect(bars[0]!.close).toBe(500);
    expect(bars[0]!.volume).toBe(10);
  });

  it('buy + sell volume sums to total volume in every bar', () => {
    const trades = makeTrades([
      [100, 1, 'buy'],
      [102, 2, 'sell'],
      [104, 1, 'buy'],
      [106, 3, 'sell'],
      [110, 2, 'buy'], // triggers close
      [112, 1, 'sell'],
    ]);
    const bars = buildRangeBars(trades, config);
    for (const bar of bars) {
      expect(bar.buyVolume + bar.sellVolume).toBeCloseTo(bar.volume);
    }
  });
});
