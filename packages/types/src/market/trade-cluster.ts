/**
 * A trade size bucket/cluster label.
 */
export type TradeSizeBucket = 'small' | 'medium' | 'large' | 'whale';

/**
 * Result of K-Means clustering on trade sizes.
 */
export interface TradeSizeCluster {
  /** Cluster label */
  bucket: TradeSizeBucket;
  /** Centroid value (mean trade size in the cluster) */
  centroid: number;
  /** Number of trades in this cluster */
  count: number;
  /** Total volume in this cluster */
  totalVolume: number;
  /** Min trade size in this cluster */
  min: number;
  /** Max trade size in this cluster */
  max: number;
}

/**
 * Classification result for a single trade.
 */
export interface TradeClassification {
  /** Trade id */
  tradeId: string;
  /** Assigned bucket */
  bucket: TradeSizeBucket;
  /** Trade amount (cost in quote currency) */
  cost: number;
}

/**
 * Full clustering result for a symbol's recent trades.
 */
export interface TradeClusterResult {
  /** Clusters with summary stats */
  clusters: TradeSizeCluster[];
  /** Per-trade classifications (most recent first) */
  classifications: TradeClassification[];
  /** Number of K-Means iterations used */
  iterations: number;
}

/**
 * Configuration for trade size clustering.
 */
export interface TradeClusterConfig {
  /** Number of clusters (default 4: small/medium/large/whale) */
  k: number;
  /** Maximum iterations for K-Means convergence */
  maxIterations: number;
  /** Use trade cost (price*amount) instead of raw amount */
  useCost: boolean;
}

/** Default trade clustering config: 4 clusters (small/medium/large/whale), 50 iterations, cost-based. */
export const DEFAULT_TRADE_CLUSTER_CONFIG: TradeClusterConfig = {
  k: 4,
  maxIterations: 50,
  useCost: true,
};
