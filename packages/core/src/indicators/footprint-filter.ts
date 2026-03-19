import type { FootprintCandle, FootprintLevel, FootprintFilter } from '@terminal/types';

/**
 * Apply a volume/trade/delta filter to footprint candles.
 * Returns new FootprintCandle[] with levels filtered according to the filter config.
 * Levels that don't pass the filter are removed entirely.
 */
export function filterFootprintLevels(
  candles: readonly FootprintCandle[],
  filter: Readonly<FootprintFilter>,
): FootprintCandle[] {
  if (filter.mode === 'none') return [...candles];

  return candles.map((candle) => {
    const filtered = applyFilter(candle.levels, filter);
    let maxLevelVolume = 0;
    for (const level of filtered) {
      const total = level.buyVolume + level.sellVolume;
      if (total > maxLevelVolume) maxLevelVolume = total;
    }
    return {
      ...candle,
      levels: filtered,
      maxLevelVolume,
    };
  });
}

/**
 * Apply the active filter mode to a set of levels.
 */
function applyFilter(levels: readonly FootprintLevel[], filter: Readonly<FootprintFilter>): FootprintLevel[] {
  switch (filter.mode) {
    case 'min-volume':
      return levels.filter((l) => l.buyVolume + l.sellVolume >= filter.minVolume);

    case 'min-trades':
      return levels.filter((l) => l.tradeCount >= filter.minTrades);

    case 'min-delta':
      return levels.filter((l) => Math.abs(l.buyVolume - l.sellVolume) >= filter.minDelta);

    case 'percentile':
      return filterByPercentile(levels, filter.percentile);

    default:
      return [...levels];
  }
}

/**
 * Keep only levels in the top (100 - percentile)% by total volume.
 * E.g. percentile=90 keeps the top 10% of levels.
 */
function filterByPercentile(levels: readonly FootprintLevel[], percentile: number): FootprintLevel[] {
  if (levels.length === 0) return [];

  const volumes = levels.map((l) => l.buyVolume + l.sellVolume);
  const sorted = [...volumes].sort((a, b) => a - b);

  // Find the threshold at the given percentile
  const idx = Math.floor((percentile / 100) * (sorted.length - 1));
  const threshold = sorted[idx] ?? 0;

  return levels.filter((l) => l.buyVolume + l.sellVolume >= threshold);
}
