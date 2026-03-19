import type { LiquidationEvent } from './liquidation.js';

/**
 * A cell in the liquidation heatmap grid.
 */
export interface LiquidationHeatmapCell {
  /** Price bucket center */
  price: number;
  /** Time bucket start (unix ms) */
  timestamp: number;
  /** Total long liquidation volume (quote currency) in this cell */
  longVolume: number;
  /** Total short liquidation volume (quote currency) in this cell */
  shortVolume: number;
  /** Number of liquidation events in this cell */
  count: number;
}

/**
 * A complete liquidation heatmap: grid of cells bucketed by price and time.
 */
export interface LiquidationHeatmap {
  /** All non-empty cells */
  cells: LiquidationHeatmapCell[];
  /** Maximum cell volume (for normalization) */
  maxVolume: number;
  /** Price bucket size */
  priceBucketSize: number;
  /** Time bucket size in ms */
  timeBucketMs: number;
}

/**
 * Configuration for the liquidation heatmap.
 */
export interface LiquidationHeatmapConfig {
  /** Price bucket size (auto-detected if 0) */
  priceBucketSize: number;
  /** Time bucket duration in ms (default 60s) */
  timeBucketMs: number;
  /** Maximum number of liquidation events to keep in memory */
  maxEvents: number;
}

/** Default liquidation heatmap config. */
export const DEFAULT_LIQUIDATION_HEATMAP_CONFIG: LiquidationHeatmapConfig = {
  priceBucketSize: 0,
  timeBucketMs: 60_000,
  maxEvents: 5000,
};

/** Target number of price buckets for auto-detecting bucket size. */
const PRICE_BUCKET_TARGET = 50;

/**
 * Build a liquidation heatmap from a list of liquidation events.
 */
export function buildLiquidationHeatmap(
  events: readonly LiquidationEvent[],
  config: Readonly<LiquidationHeatmapConfig>,
): LiquidationHeatmap {
  if (events.length === 0) {
    return { cells: [], maxVolume: 0, priceBucketSize: config.priceBucketSize || 1, timeBucketMs: config.timeBucketMs };
  }

  // Auto-detect price bucket size if not set
  let priceBucket = config.priceBucketSize;
  if (priceBucket <= 0) {
    let minP = Infinity;
    let maxP = -Infinity;
    for (const e of events) {
      if (e.price < minP) minP = e.price;
      if (e.price > maxP) maxP = e.price;
    }
    const range = maxP - minP;
    priceBucket = range > 0 ? range / PRICE_BUCKET_TARGET : 1;
  }

  const timeBucket = config.timeBucketMs;
  const cellMap = new Map<string, LiquidationHeatmapCell>();

  for (const event of events) {
    const pKey = Math.floor(event.price / priceBucket) * priceBucket;
    const tKey = Math.floor(event.timestamp / timeBucket) * timeBucket;
    const key = `${pKey}:${tKey}`;

    let cell = cellMap.get(key);
    if (!cell) {
      cell = { price: pKey, timestamp: tKey, longVolume: 0, shortVolume: 0, count: 0 };
      cellMap.set(key, cell);
    }

    const vol = event.price * event.amount;
    if (event.side === 'buy') {
      cell.longVolume += vol;
    } else {
      cell.shortVolume += vol;
    }
    cell.count++;
  }

  const cells = Array.from(cellMap.values());
  let maxVolume = 0;
  for (const cell of cells) {
    const total = cell.longVolume + cell.shortVolume;
    if (total > maxVolume) maxVolume = total;
  }

  return { cells, maxVolume, priceBucketSize: priceBucket, timeBucketMs: timeBucket };
}
