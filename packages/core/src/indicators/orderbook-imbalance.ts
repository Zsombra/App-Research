import type { OrderbookSnapshot, PriceLevel } from '@terminal/types';

/**
 * Result of orderbook imbalance analysis.
 */
export interface ImbalanceResult {
  /** Bid/ask ratio (> 1 = bid heavy, < 1 = ask heavy) */
  bidAskRatio: number;
  /** Total bid volume in top N levels */
  totalBidVolume: number;
  /** Total ask volume in top N levels */
  totalAskVolume: number;
  /** Stacked imbalances: price levels with extreme bid/ask ratios */
  stackedImbalances: StackedImbalance[];
  /** Absorption detection: large resting orders that are being absorbed */
  absorptions: Absorption[];
}

/**
 * A stacked imbalance at a specific price level.
 */
export interface StackedImbalance {
  /** Price level */
  price: number;
  /** Side with larger volume */
  side: 'bid' | 'ask';
  /** Ratio of larger side to smaller side */
  ratio: number;
  /** Volume on the dominant side */
  dominantVolume: number;
}

/**
 * Absorption event: a large order being filled over time.
 */
export interface Absorption {
  /** Price level being absorbed */
  price: number;
  /** Side being absorbed (bid = buy wall, ask = sell wall) */
  side: 'bid' | 'ask';
  /** Current remaining size */
  remainingSize: number;
  /** Original estimated size */
  originalSize: number;
  /** Percentage absorbed so far */
  percentAbsorbed: number;
}

/**
 * Detect stacked imbalances in the orderbook.
 * Compares adjacent bid/ask levels looking for extreme ratios.
 *
 * @param bids - Sorted descending by price
 * @param asks - Sorted ascending by price
 * @param threshold - Minimum ratio to consider an imbalance (default 3x)
 * @param minConsecutive - Minimum consecutive imbalanced levels (default 3)
 */
export function detectStackedImbalances(
  bids: readonly PriceLevel[],
  asks: readonly PriceLevel[],
  threshold: number = 3,
  minConsecutive: number = 3,
): StackedImbalance[] {
  const imbalances: StackedImbalance[] = [];

  // Check bid-side imbalances (compare each bid level to the opposing ask level)
  const levels = Math.min(bids.length, asks.length);
  let consecutiveBid = 0;
  let consecutiveAsk = 0;
  const bidImbs: StackedImbalance[] = [];
  const askImbs: StackedImbalance[] = [];

  for (let i = 0; i < levels; i++) {
    const bid = bids[i] as PriceLevel;
    const ask = asks[i] as PriceLevel;

    if (bid.size > 0 && ask.size > 0) {
      const bidRatio = bid.size / ask.size;
      const askRatio = ask.size / bid.size;

      if (bidRatio >= threshold) {
        consecutiveBid++;
        bidImbs.push({
          price: bid.price,
          side: 'bid',
          ratio: bidRatio,
          dominantVolume: bid.size,
        });
        consecutiveAsk = 0;
        askImbs.length = 0;
      } else if (askRatio >= threshold) {
        consecutiveAsk++;
        askImbs.push({
          price: ask.price,
          side: 'ask',
          ratio: askRatio,
          dominantVolume: ask.size,
        });
        consecutiveBid = 0;
        bidImbs.length = 0;
      } else {
        if (consecutiveBid >= minConsecutive) {
          imbalances.push(...bidImbs);
        }
        if (consecutiveAsk >= minConsecutive) {
          imbalances.push(...askImbs);
        }
        consecutiveBid = 0;
        consecutiveAsk = 0;
        bidImbs.length = 0;
        askImbs.length = 0;
      }
    }
  }

  // Flush remaining
  if (consecutiveBid >= minConsecutive) imbalances.push(...bidImbs);
  if (consecutiveAsk >= minConsecutive) imbalances.push(...askImbs);

  return imbalances;
}

/**
 * Compute overall orderbook imbalance metrics.
 *
 * @param snapshot - Orderbook snapshot
 * @param depthLevels - Number of levels to analyze (default 20)
 */
export function computeOrderbookImbalance(
  snapshot: Readonly<OrderbookSnapshot>,
  depthLevels: number = 20,
): ImbalanceResult {
  const topBids = snapshot.bids.slice(0, depthLevels);
  const topAsks = snapshot.asks.slice(0, depthLevels);

  const totalBidVolume = topBids.reduce((sum, l) => sum + l.size, 0);
  const totalAskVolume = topAsks.reduce((sum, l) => sum + l.size, 0);

  const bidAskRatio = totalAskVolume > 0 ? totalBidVolume / totalAskVolume : totalBidVolume > 0 ? Infinity : 0;

  const stackedImbalances = detectStackedImbalances(topBids, topAsks);

  return {
    bidAskRatio,
    totalBidVolume,
    totalAskVolume,
    stackedImbalances,
    absorptions: [], // Absorption tracking requires time-series analysis
  };
}
