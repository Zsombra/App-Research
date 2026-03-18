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
}

/** Default footprint configuration. */
export const DEFAULT_FOOTPRINT_CONFIG: FootprintConfig = {
  tickSize: 1.0,
  showDelta: true,
  minVolume: 0,
  showNumbers: false,
};
