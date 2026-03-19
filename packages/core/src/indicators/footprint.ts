import type { NormalizedTrade, OHLCVCandle, FootprintCandle, FootprintLevel } from '@terminal/types';

/**
 * Find the candle timestamp a trade belongs to via binary search.
 * Returns null if the trade doesn't fall within any candle.
 */
function findCandleTimestamp(
  sortedTimestamps: number[],
  tradeTime: number,
  intervalMs: number,
): number | null {
  // Binary search for the last timestamp <= tradeTime
  let lo = 0;
  let hi = sortedTimestamps.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if ((sortedTimestamps[mid] as number) <= tradeTime) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // hi is now the index of the last timestamp <= tradeTime
  if (hi < 0) return null;
  const candleTs = sortedTimestamps[hi] as number;

  // Check if trade falls within this candle's time window
  if (tradeTime >= candleTs && tradeTime < candleTs + intervalMs) {
    return candleTs;
  }

  return null;
}

/**
 * Bucket a price to the nearest tick size.
 */
export function bucketPrice(price: number, tickSize: number): number {
  if (tickSize <= 0) return price;
  return Math.floor(price / tickSize) * tickSize;
}

/**
 * Auto-detect a reasonable tick size based on the price range.
 * Aims for roughly 20-50 levels per candle.
 */
export function autoTickSize(candles: OHLCVCandle[]): number {
  if (candles.length === 0) return 1;

  // Use the average candle range to determine tick size
  let totalRange = 0;
  let count = 0;
  for (const c of candles) {
    const range = c.high - c.low;
    if (range > 0) {
      totalRange += range;
      count++;
    }
  }

  if (count === 0) return 1;
  const avgRange = totalRange / count;

  // Target ~30 levels per candle
  const raw = avgRange / 30;

  // Guard against log10(0) or log10(negative) → -Infinity
  if (raw <= 0) return 1;

  // Round to a "nice" number
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

/**
 * Build footprint candles from trades grouped by candle timestamps.
 * Each trade is bucketed to a price level and aggregated by buy/sell volume.
 *
 * @param candles - OHLCV candles (provides time boundaries and OHLC)
 * @param trades - Trades sorted chronologically (oldest first)
 * @param tickSize - Price bucket size
 * @returns Array of FootprintCandle with per-level volume data
 */
export function buildFootprintFromTrades(
  candles: OHLCVCandle[],
  trades: NormalizedTrade[],
  tickSize: number,
): FootprintCandle[] {
  if (candles.length === 0) return [];
  if (tickSize <= 0) return candles.map((c) => ({
    timestamp: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close,
    volume: c.volume, levels: [], tickSize: 1, maxLevelVolume: 0,
  }));

  // Build a map of candle timestamp -> trade accumulation
  const candleMap = new Map<number, Map<number, { buy: number; sell: number; count: number }>>();
  for (const candle of candles) {
    candleMap.set(candle.timestamp, new Map());
  }

  // Find candle interval from first two candles or default to 60s
  let intervalMs = 60_000;
  if (candles.length >= 2) {
    intervalMs = (candles[1] as OHLCVCandle).timestamp - (candles[0] as OHLCVCandle).timestamp;
  }

  // Build sorted timestamp array for binary search
  const candleTimestamps = candles.map((c) => c.timestamp).sort((a, b) => a - b);

  // Bucket each trade into the appropriate candle and price level
  for (const trade of trades) {
    // Find the candle this trade belongs to via binary search
    const candleTs = findCandleTimestamp(candleTimestamps, trade.timestamp, intervalMs);
    if (candleTs === null) continue;

    const levelMap = candleMap.get(candleTs);
    if (!levelMap) {
      continue;
    }

    const priceBucket = bucketPrice(trade.price, tickSize);
    let level = levelMap.get(priceBucket);
    if (!level) {
      level = { buy: 0, sell: 0, count: 0 };
      levelMap.set(priceBucket, level);
    }

    if (trade.side === 'buy') {
      level.buy += trade.amount;
    } else {
      level.sell += trade.amount;
    }
    level.count += 1;
  }

  // Convert to FootprintCandle array
  const result: FootprintCandle[] = [];
  for (const candle of candles) {
    const levelMap = candleMap.get(candle.timestamp);
    const levels: FootprintLevel[] = [];
    let maxLevelVolume = 0;

    if (levelMap) {
      for (const [price, data] of levelMap) {
        const totalVol = data.buy + data.sell;
        if (totalVol > maxLevelVolume) maxLevelVolume = totalVol;
        levels.push({
          price,
          buyVolume: data.buy,
          sellVolume: data.sell,
          tradeCount: data.count,
        });
      }
    }

    // Sort levels by price ascending
    levels.sort((a, b) => a.price - b.price);

    result.push({
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      levels,
      tickSize,
      maxLevelVolume,
    });
  }

  return result;
}

/**
 * Build footprint candles directly from OHLCV candles (without tick-level trades).
 * Creates a synthetic single-level footprint per candle using buyVolume/sellVolume.
 * Useful when tick data is not available.
 */
export function buildFootprintFromCandles(
  candles: OHLCVCandle[],
  tickSize: number,
): FootprintCandle[] {
  return candles.map((c) => {
    // Distribute volume across price levels between low and high
    const levels: FootprintLevel[] = [];
    const low = bucketPrice(c.low, tickSize);
    const high = bucketPrice(c.high, tickSize);
    const numLevels = Math.max(1, Math.round((high - low) / tickSize) + 1);

    // Simple distribution: split volume evenly across levels with
    // more weight near open/close
    let maxLevelVolume = 0;
    for (let i = 0; i < numLevels; i++) {
      const price = low + i * tickSize;
      const fraction = 1 / numLevels;
      const buyVol = c.buyVolume * fraction;
      const sellVol = c.sellVolume * fraction;
      const totalVol = buyVol + sellVol;
      if (totalVol > maxLevelVolume) maxLevelVolume = totalVol;
      levels.push({
        price,
        buyVolume: buyVol,
        sellVolume: sellVol,
        tradeCount: Math.max(1, Math.round(c.tradeCount * fraction)),
      });
    }

    return {
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      levels,
      tickSize,
      maxLevelVolume,
    };
  });
}
