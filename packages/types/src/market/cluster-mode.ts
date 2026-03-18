import type { TradeSizeBucket } from './trade-cluster.js';

/**
 * Cluster mode type.
 * - 'size': K-Means on trade sizes (Phase 20)
 * - 'time': Group trades within time windows
 * - 'combined': Both time and size clustering applied
 */
export type ClusterMode = 'size' | 'time' | 'combined';

/**
 * A time-clustered group of consecutive trades.
 * Trades within `maxGapMs` of each other are merged into one cluster.
 */
export interface TimeCluster {
  /** Cluster start timestamp (first trade) */
  startTime: number;
  /** Cluster end timestamp (last trade) */
  endTime: number;
  /** Number of trades in this cluster */
  tradeCount: number;
  /** Total volume (quote currency) */
  totalCost: number;
  /** Total base amount */
  totalAmount: number;
  /** Buy volume (quote currency) */
  buyCost: number;
  /** Sell volume (quote currency) */
  sellCost: number;
  /** Volume-weighted average price */
  vwap: number;
  /** Size bucket assigned from K-Means (only in combined mode) */
  sizeBucket?: TradeSizeBucket | undefined;
}

/**
 * Configuration for time-based clustering.
 */
export interface TimeClusterConfig {
  /** Maximum time gap (ms) between trades to be in the same cluster */
  maxGapMs: number;
  /** Minimum number of trades for a cluster to be significant */
  minTrades: number;
  /** Minimum total cost for a cluster to be significant */
  minCost: number;
}

/** Default time cluster config. */
export const DEFAULT_TIME_CLUSTER_CONFIG: TimeClusterConfig = {
  maxGapMs: 500,
  minTrades: 3,
  minCost: 0,
};
