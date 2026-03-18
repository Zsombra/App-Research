/**
 * Stop-Loss / Take-Profit Heatmap types.
 *
 * Exchange-agnostic estimation of where SL/TP clusters exist
 * based on 6 algorithms from research:
 *   1. Liquidation Level Math (leverage-based)
 *   2. Swing High/Low Clustering (SMC)
 *   3. Round Number + ATR Zones (Osler 2002)
 *   4. Historical Sweep Analysis
 *   5. DBSCAN Density Clustering
 *   6. Composite scoring (weighted blend of 1-5)
 */

/** Which side is being estimated. */
export type StopTakeType = 'stop-loss' | 'take-profit';

/** A single estimated SL or TP cluster zone. */
export interface SLTPCluster {
  /** Center price of the cluster zone */
  price: number;
  /** Zone width (e.g. ± half the zone size around price) */
  width: number;
  /** Estimated intensity / confidence score (0-1) */
  intensity: number;
  /** Which algorithms contributed to this cluster */
  sources: SLTPAlgorithm[];
  /** Whether this is a stop-loss or take-profit cluster */
  type: StopTakeType;
  /** Side: 'long' SL/TP or 'short' SL/TP */
  side: 'long' | 'short';
}

/** Available estimation algorithms. */
export type SLTPAlgorithm =
  | 'liquidation-math'
  | 'swing-cluster'
  | 'round-number'
  | 'historical-sweep'
  | 'dbscan'
  | 'composite';

/** A cell in the SL/TP heatmap grid (for rendering). */
export interface SLTPHeatmapCell {
  /** Price bucket center */
  price: number;
  /** Time bucket start (unix ms) */
  timestamp: number;
  /** Estimated SL intensity at this cell (0-1) */
  slIntensity: number;
  /** Estimated TP intensity at this cell (0-1) */
  tpIntensity: number;
  /** Dominant side: longs or shorts accumulating here */
  dominantSide: 'long' | 'short';
}

/** Full SL/TP heatmap result. */
export interface SLTPHeatmap {
  /** All non-empty cells */
  cells: SLTPHeatmapCell[];
  /** Maximum intensity value for normalization */
  maxIntensity: number;
  /** Price bucket size used */
  priceBucketSize: number;
  /** SL clusters detected */
  slClusters: SLTPCluster[];
  /** TP clusters detected */
  tpClusters: SLTPCluster[];
}

/** Input for a known or estimated position. */
export interface EstimatedPosition {
  /** Entry price */
  entryPrice: number;
  /** Leverage used (1x = spot) */
  leverage: number;
  /** Position side */
  side: 'long' | 'short';
  /** Position size in quote currency (optional, for weighting) */
  size?: number;
}

/** A detected swing point from price action. */
export interface SwingPoint {
  /** Price of the swing high/low */
  price: number;
  /** Timestamp */
  timestamp: number;
  /** Type */
  type: 'high' | 'low';
  /** Strength: number of bars on each side confirming the swing */
  strength: number;
}

/** Configuration for the SL/TP estimation engine. */
export interface SLTPConfig {
  /** Which algorithms to run */
  algorithms: SLTPAlgorithm[];
  /** Common leverage levels to simulate (e.g. [3, 5, 10, 25, 50, 100]) */
  leverageLevels: number[];
  /** DBSCAN: minimum distance between points to be in same cluster */
  dbscanEps: number;
  /** DBSCAN: minimum points to form a cluster */
  dbscanMinPoints: number;
  /** Round number interval (e.g. 100 for BTC means $100 increments) */
  roundNumberInterval: number;
  /** ATR multiplier for zone width around round numbers */
  atrMultiplier: number;
  /** Swing detection: bars on each side to confirm swing */
  swingStrength: number;
  /** Price bucket size for heatmap grid (0 = auto) */
  priceBucketSize: number;
  /** Algorithm weights for composite scoring */
  weights: Record<SLTPAlgorithm, number>;
}

/** Default SL/TP config. */
export const DEFAULT_SLTP_CONFIG: SLTPConfig = {
  algorithms: ['liquidation-math', 'swing-cluster', 'round-number', 'historical-sweep', 'dbscan', 'composite'],
  leverageLevels: [3, 5, 10, 25, 50, 100],
  dbscanEps: 0.005,
  dbscanMinPoints: 3,
  roundNumberInterval: 100,
  atrMultiplier: 1.5,
  swingStrength: 3,
  priceBucketSize: 0,
  weights: {
    'liquidation-math': 0.3,
    'swing-cluster': 0.25,
    'round-number': 0.15,
    'historical-sweep': 0.2,
    'dbscan': 0.1,
    'composite': 0,
  },
};
