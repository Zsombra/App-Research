import type {
  NormalizedTrade,
  TradeSizeBucket,
  TradeSizeCluster,
  TradeClassification,
  TradeClusterResult,
  TradeClusterConfig,
} from '@terminal/types';

const BUCKET_LABELS = ['small', 'medium', 'large', 'whale'] as const;

/**
 * Classify trades into size buckets using K-Means clustering.
 *
 * @param trades - Array of normalized trades
 * @param config - Clustering configuration
 * @returns Cluster summaries + per-trade classifications
 */
export function clusterTradeSizes(
  trades: readonly NormalizedTrade[],
  config: Readonly<TradeClusterConfig>,
): TradeClusterResult {
  const k = Math.min(config.k, trades.length, 4);

  if (trades.length === 0) {
    return { clusters: [], classifications: [], iterations: 0 };
  }

  // Extract values to cluster on
  const values = trades.map((t) => (config.useCost ? t.cost : t.amount));

  if (k <= 1 || trades.length < k) {
    // Not enough data for meaningful clustering — single bucket
    const totalVolume = values.reduce((s, v) => s + v, 0);
    return {
      clusters: [{
        bucket: 'small',
        centroid: totalVolume / trades.length,
        count: trades.length,
        totalVolume,
        min: Math.min(...values),
        max: Math.max(...values),
      }],
      classifications: trades.map((t) => ({
        tradeId: t.id,
        bucket: 'small' as TradeSizeBucket,
        cost: config.useCost ? t.cost : t.amount,
      })),
      iterations: 0,
    };
  }

  // Initialize centroids using percentile-based seeding for stability
  const sorted = [...values].sort((a, b) => a - b);
  const centroids: number[] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(((i + 0.5) / k) * sorted.length);
    centroids.push(sorted[Math.min(idx, sorted.length - 1)] as number);
  }

  // K-Means iterations
  const assignments: number[] = new Array(values.length).fill(0);
  let iterations = 0;

  for (let iter = 0; iter < config.maxIterations; iter++) {
    iterations = iter + 1;
    let changed = false;

    // Assign each value to nearest centroid
    for (let i = 0; i < values.length; i++) {
      const val = values[i] as number;
      let bestCluster = 0;
      let bestDist = Math.abs(val - (centroids[0] as number));
      for (let c = 1; c < k; c++) {
        const dist = Math.abs(val - (centroids[c] as number));
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = c;
        }
      }
      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    if (!changed) break;

    // Recompute centroids
    const sums: number[] = new Array(k).fill(0);
    const counts: number[] = new Array(k).fill(0);
    for (let i = 0; i < values.length; i++) {
      const c = assignments[i] as number;
      sums[c] = (sums[c] as number) + (values[i] as number);
      counts[c] = (counts[c] as number) + 1;
    }
    for (let c = 0; c < k; c++) {
      if ((counts[c] as number) > 0) {
        centroids[c] = (sums[c] as number) / (counts[c] as number);
      }
    }
  }

  // Sort clusters by centroid ascending and build results
  const clusterIndices = centroids.map((_, i) => i).sort((a, b) => (centroids[a] as number) - (centroids[b] as number));
  const indexMap: number[] = new Array(k).fill(0); // old cluster index → new sorted index
  for (let newIdx = 0; newIdx < clusterIndices.length; newIdx++) {
    indexMap[clusterIndices[newIdx] as number] = newIdx;
  }

  // Build cluster summaries
  const clusterStats: { count: number; totalVol: number; min: number; max: number }[] = [];
  for (let i = 0; i < k; i++) {
    clusterStats.push({ count: 0, totalVol: 0, min: Infinity, max: -Infinity });
  }
  for (let i = 0; i < values.length; i++) {
    const newIdx = indexMap[assignments[i] as number] as number;
    const stat = clusterStats[newIdx] as { count: number; totalVol: number; min: number; max: number };
    const v = values[i] as number;
    stat.count++;
    stat.totalVol += v;
    if (v < stat.min) stat.min = v;
    if (v > stat.max) stat.max = v;
  }

  const sortedCentroids = clusterIndices.map((i) => centroids[i] as number);

  const clusters: TradeSizeCluster[] = clusterStats.map((stat, i) => ({
    bucket: BUCKET_LABELS[Math.min(i, BUCKET_LABELS.length - 1)] as TradeSizeBucket,
    centroid: sortedCentroids[i] as number,
    count: stat.count,
    totalVolume: stat.totalVol,
    min: stat.min === Infinity ? 0 : stat.min,
    max: stat.max === -Infinity ? 0 : stat.max,
  }));

  const classifications: TradeClassification[] = trades.map((t, i) => ({
    tradeId: t.id,
    bucket: BUCKET_LABELS[Math.min(indexMap[assignments[i] as number] as number, BUCKET_LABELS.length - 1)] as TradeSizeBucket,
    cost: config.useCost ? t.cost : t.amount,
  }));

  return { clusters, classifications, iterations };
}
