import type { NormalizedTrade, OHLCVCandle, CandleTimeframe } from '@terminal/types';

/** Returns the interval duration in milliseconds for a given timeframe. */
export function timeframeToMs(tf: CandleTimeframe): number {
  const map: Record<CandleTimeframe, number> = {
    '1s': 1_000,
    '5s': 5_000,
    '15s': 15_000,
    '30s': 30_000,
    '1m': 60_000,
    '3m': 180_000,
    '5m': 300_000,
    '15m': 900_000,
    '30m': 1_800_000,
    '1h': 3_600_000,
    '2h': 7_200_000,
    '4h': 14_400_000,
    '6h': 21_600_000,
    '12h': 43_200_000,
    '1d': 86_400_000,
    '1w': 604_800_000,
  };
  return map[tf];
}

/** Floors a timestamp to the start of its candle period. */
export function floorToCandle(timestamp: number, intervalMs: number): number {
  return Math.floor(timestamp / intervalMs) * intervalMs;
}

/**
 * Aggregates a trade into an array of OHLCV candles.
 * Updates the last candle if the trade falls within its period,
 * otherwise creates a new candle.
 *
 * Returns the updated candles array (mutates in place for performance).
 */
export function aggregateTrade(
  candles: OHLCVCandle[],
  trade: NormalizedTrade,
  timeframe: CandleTimeframe,
  maxCandles: number = 500
): OHLCVCandle[] {
  const intervalMs = timeframeToMs(timeframe);
  const candleTimestamp = floorToCandle(trade.timestamp, intervalMs);

  const last = candles.length > 0 ? candles[candles.length - 1] : undefined;

  if (last && last.timestamp === candleTimestamp) {
    // Update existing candle
    last.high = Math.max(last.high, trade.price);
    last.low = Math.min(last.low, trade.price);
    last.close = trade.price;
    last.volume += trade.amount;
    last.tradeCount += 1;
    if (trade.side === 'buy') {
      last.buyVolume += trade.amount;
    } else {
      last.sellVolume += trade.amount;
    }
  } else {
    // Close previous candle
    if (last && !last.closed) {
      last.closed = true;
    }

    // Create new candle
    const newCandle: OHLCVCandle = {
      exchange: trade.exchange,
      symbol: trade.symbol,
      timeframe,
      timestamp: candleTimestamp,
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
      volume: trade.amount,
      buyVolume: trade.side === 'buy' ? trade.amount : 0,
      sellVolume: trade.side === 'sell' ? trade.amount : 0,
      tradeCount: 1,
      closed: false,
    };

    candles.push(newCandle);

    // Trim old candles
    if (candles.length > maxCandles) {
      candles.splice(0, candles.length - maxCandles);
    }
  }

  return candles;
}
