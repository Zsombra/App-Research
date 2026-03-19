/**
 * A single column of heatmap data: an orderbook depth snapshot at a point in time.
 */
export interface HeatmapColumn {
  /** Timestamp of this snapshot in unix milliseconds */
  timestamp: number;
  /** Bid levels: price → size */
  bids: Map<number, number>;
  /** Ask levels: price → size */
  asks: Map<number, number>;
}

/**
 * Configuration for orderbook heatmap rendering.
 */
export interface HeatmapConfig {
  /** Price bucket size for heatmap cells (auto-detected if 0) */
  priceBucketSize: number;
  /** Maximum number of historical columns to keep */
  maxColumns: number;
  /** Capture interval in milliseconds (how often to snapshot the orderbook) */
  captureIntervalMs: number;
  /** Number of price levels to capture from each side */
  depthLevels: number;
}

/** Default heatmap config: auto bucket size, 500 columns, 1s capture, 50 depth levels. */
export const DEFAULT_HEATMAP_CONFIG: HeatmapConfig = {
  priceBucketSize: 0, // auto-detect
  maxColumns: 500,
  captureIntervalMs: 1000,
  depthLevels: 50,
};
