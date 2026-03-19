/**
 * Volume data at a single price level within a footprint candle.
 */
export interface FootprintLevel {
  /** Price level (bucketed) */
  price: number;
  /** Buy (taker) volume at this level */
  buyVolume: number;
  /** Sell (taker) volume at this level */
  sellVolume: number;
  /** Total number of trades at this level */
  tradeCount: number;
}

/**
 * A single footprint candle: OHLC data + per-price-level volume breakdown.
 */
export interface FootprintCandle {
  /** Candle open timestamp in unix milliseconds */
  timestamp: number;
  /** Opening price */
  open: number;
  /** Highest price */
  high: number;
  /** Lowest price */
  low: number;
  /** Closing price */
  close: number;
  /** Total volume */
  volume: number;
  /** Per-price-level volume breakdown, keyed by bucketed price */
  levels: FootprintLevel[];
  /** Price tick size used for bucketing */
  tickSize: number;
  /** Maximum single-level volume (for normalization) */
  maxLevelVolume: number;
}

/**
 * Filter mode for filtered footprints.
 * - 'none': Show all levels (no filtering)
 * - 'min-volume': Only show levels above a minimum total volume
 * - 'min-trades': Only show levels above a minimum trade count
 * - 'min-delta': Only show levels where |buyVolume - sellVolume| exceeds threshold
 * - 'percentile': Only show levels in the top N percentile by volume
 */
export type FootprintFilterMode = 'none' | 'min-volume' | 'min-trades' | 'min-delta' | 'percentile';

/**
 * Filter configuration for filtered footprints.
 */
export interface FootprintFilter {
  /** Active filter mode */
  mode: FootprintFilterMode;
  /** Minimum total volume threshold (for 'min-volume' mode) */
  minVolume: number;
  /** Minimum trade count threshold (for 'min-trades' mode) */
  minTrades: number;
  /** Minimum absolute delta threshold (for 'min-delta' mode) */
  minDelta: number;
  /** Percentile cutoff 0-100 (for 'percentile' mode, e.g. 90 = top 10%) */
  percentile: number;
}

/** Default filter — no filtering active. */
export const DEFAULT_FOOTPRINT_FILTER: FootprintFilter = {
  mode: 'none',
  minVolume: 0,
  minTrades: 0,
  minDelta: 0,
  percentile: 90,
};

/**
 * Configuration for footprint chart rendering.
 */
export interface FootprintConfig {
  /** Price tick size for bucketing trades into levels (e.g. 1.0 for $1 increments) */
  tickSize: number;
  /** Minimum volume to display a cell (filter noise) */
  minVolume: number;
  /** Whether to show delta (buy - sell) coloring */
  showDelta: boolean;
  /** Whether to show volume numbers as text */
  showNumbers: boolean;
  /** Footprint filter settings */
  filter: FootprintFilter;
}

/** Default footprint config: 1.0 tick size, delta enabled, no label overlay. */
export const DEFAULT_FOOTPRINT_CONFIG: FootprintConfig = {
  tickSize: 1.0,
  showDelta: true,
  minVolume: 0,
  showNumbers: false,
  filter: { ...DEFAULT_FOOTPRINT_FILTER },
};
