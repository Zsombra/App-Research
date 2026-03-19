import type { NormalizedTrade, TimeCluster, TimeClusterConfig } from '@terminal/types';

/**
 * Group consecutive trades into time-based clusters.
 * Trades within `maxGapMs` of each other form a single cluster.
 * Only clusters meeting the minimum thresholds are returned.
 *
 * @param trades - Sorted by timestamp ascending
 * @param config - Time clustering configuration
 * @returns Array of time clusters, sorted by start time
 */
export function clusterByTime(
  trades: NormalizedTrade[],
  config: TimeClusterConfig,
): TimeCluster[] {
  if (trades.length === 0) return [];

  const clusters: TimeCluster[] = [];
  let clusterTrades: NormalizedTrade[] = [trades[0] as NormalizedTrade];

  for (let i = 1; i < trades.length; i++) {
    const trade = trades[i] as NormalizedTrade;
    const prevTrade = trades[i - 1] as NormalizedTrade;

    if (trade.timestamp - prevTrade.timestamp <= config.maxGapMs) {
      clusterTrades.push(trade);
    } else {
      // Finalize current cluster
      const cluster = buildCluster(clusterTrades);
      if (meetsThreshold(cluster, config)) {
        clusters.push(cluster);
      }
      clusterTrades = [trade];
    }
  }

  // Finalize last cluster
  const lastCluster = buildCluster(clusterTrades);
  if (meetsThreshold(lastCluster, config)) {
    clusters.push(lastCluster);
  }

  return clusters;
}

function buildCluster(trades: NormalizedTrade[]): TimeCluster {
  let totalCost = 0;
  let totalAmount = 0;
  let buyCost = 0;
  let sellCost = 0;
  let costTimesPrice = 0;

  for (const t of trades) {
    totalCost += t.cost;
    totalAmount += t.amount;
    costTimesPrice += t.cost * t.price;
    if (t.side === 'buy') {
      buyCost += t.cost;
    } else {
      sellCost += t.cost;
    }
  }

  const first = trades[0] as NormalizedTrade;
  const last = trades[trades.length - 1] as NormalizedTrade;

  return {
    startTime: first.timestamp,
    endTime: last.timestamp,
    tradeCount: trades.length,
    totalCost,
    totalAmount,
    buyCost,
    sellCost,
    vwap: totalCost > 0 ? costTimesPrice / totalCost : first.price,
  };
}

function meetsThreshold(cluster: TimeCluster, config: TimeClusterConfig): boolean {
  return cluster.tradeCount >= config.minTrades && cluster.totalCost >= config.minCost;
}
