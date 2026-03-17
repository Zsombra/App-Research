import type { CandleTimeframe } from '@terminal/types';

/**
 * Mapping from candle timeframe string to its duration in milliseconds.
 */
export const TIMEFRAME_MS: Readonly<Record<CandleTimeframe, number>> = {
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

/**
 * All available timeframes sorted by duration ascending.
 */
export const TIMEFRAMES_SORTED: readonly CandleTimeframe[] = (
  Object.keys(TIMEFRAME_MS) as CandleTimeframe[]
).sort((a, b) => TIMEFRAME_MS[a] - TIMEFRAME_MS[b]);
