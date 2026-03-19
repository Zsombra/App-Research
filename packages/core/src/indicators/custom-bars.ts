import type { NormalizedTrade, OHLCVCandle } from '@terminal/types';
import type { TickBarConfig, VolumeBarConfig, RangeBarConfig } from '@terminal/types';

/**
 * Build tick bars: each bar contains exactly N trades.
 */
export function buildTickBars(
  trades: NormalizedTrade[],
  config: TickBarConfig,
): OHLCVCandle[] {
  if (trades.length === 0 || config.tickCount <= 0) return [];

  const bars: OHLCVCandle[] = [];
  let i = 0;

  while (i < trades.length) {
    const batchEnd = Math.min(i + config.tickCount, trades.length);
    const batch = trades.slice(i, batchEnd);

    if (batch.length === 0) break;

    const bar = buildBarFromTrades(batch);
    bars.push(bar);
    i = batchEnd;
  }

  return bars;
}

/**
 * Build volume bars: each bar accumulates until volume threshold is reached.
 */
export function buildVolumeBars(
  trades: NormalizedTrade[],
  config: VolumeBarConfig,
): OHLCVCandle[] {
  if (trades.length === 0 || config.volumeThreshold <= 0) return [];

  const bars: OHLCVCandle[] = [];
  let batch: NormalizedTrade[] = [];
  let accVolume = 0;

  for (const trade of trades) {
    batch.push(trade);
    accVolume += trade.amount;

    if (accVolume >= config.volumeThreshold) {
      bars.push(buildBarFromTrades(batch));
      batch = [];
      accVolume = 0;
    }
  }

  // Emit final incomplete bar if it has data
  if (batch.length > 0) {
    const bar = buildBarFromTrades(batch);
    bar.closed = false;
    bars.push(bar);
  }

  return bars;
}

/**
 * Build range bars: each bar spans exactly rangeSize price movement.
 */
export function buildRangeBars(
  trades: NormalizedTrade[],
  config: RangeBarConfig,
): OHLCVCandle[] {
  if (trades.length === 0 || config.rangeSize <= 0) return [];

  const bars: OHLCVCandle[] = [];
  let batch: NormalizedTrade[] = [];
  let barHigh = -Infinity;
  let barLow = Infinity;

  for (const trade of trades) {
    const nextHigh = Math.max(barHigh, trade.price);
    const nextLow = Math.min(barLow, trade.price);

    if (nextHigh - nextLow >= config.rangeSize && batch.length > 0) {
      // Close current bar before adding this trade
      bars.push(buildBarFromTrades(batch));
      batch = [trade];
      barHigh = trade.price;
      barLow = trade.price;
    } else {
      batch.push(trade);
      barHigh = nextHigh;
      barLow = nextLow;
    }
  }

  // Emit final incomplete bar
  if (batch.length > 0) {
    const bar = buildBarFromTrades(batch);
    bar.closed = false;
    bars.push(bar);
  }

  return bars;
}

/**
 * Build a single OHLCV candle from a batch of trades.
 */
function buildBarFromTrades(trades: NormalizedTrade[]): OHLCVCandle {
  const first = trades[0] as NormalizedTrade;
  const last = trades[trades.length - 1] as NormalizedTrade;

  let high = first.price;
  let low = first.price;
  let volume = 0;
  let buyVolume = 0;
  let sellVolume = 0;

  for (const t of trades) {
    if (t.price > high) high = t.price;
    if (t.price < low) low = t.price;
    volume += t.amount;
    if (t.side === 'buy') {
      buyVolume += t.amount;
    } else {
      sellVolume += t.amount;
    }
  }

  return {
    exchange: first.exchange,
    symbol: first.symbol,
    timeframe: '1m', // Custom bars don't map to standard timeframes
    timestamp: first.timestamp,
    open: first.price,
    high,
    low,
    close: last.price,
    volume,
    buyVolume,
    sellVolume,
    tradeCount: trades.length,
    closed: true,
  };
}
