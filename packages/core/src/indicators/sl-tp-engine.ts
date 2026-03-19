import type {
  OHLCVCandle,
} from '@terminal/types';
import type {
  SLTPCluster,
  SLTPHeatmap,
  SLTPHeatmapCell,
  SLTPConfig,
  EstimatedPosition,
  SwingPoint,
  StopTakeType,
  SLTPAlgorithm,
} from '@terminal/types';

const DEFAULT_SL_TP_WIDTH_RATIO = 0.002;
const MIN_PRICE_WIDTH_RATIO = 0.001;
const MAX_CLUSTER_INTENSITY_DIVISOR = 10;
const SWEEP_INTENSITY_DIVISOR = 5;
const RECENT_CANDLE_COUNT = 20;
const ROUND_NUMBER_INTENSITY = 0.15;
const PRICE_BUCKET_TARGET = 50;

// ─── Algorithm 1: Liquidation Level Math ─────────────────────────────

/**
 * Calculate liquidation prices for positions at various leverage levels.
 * long_liquidation  = entry * (1 - 1/L)
 * short_liquidation = entry * (1 + 1/L)
 */
export function computeLiquidationLevels(
  positions: readonly EstimatedPosition[],
  leverageLevels: readonly number[],
): SLTPCluster[] {
  const clusters: SLTPCluster[] = [];

  for (const pos of positions) {
    const levs = pos.leverage > 1 ? [pos.leverage] : leverageLevels;

    for (const lev of levs) {
      if (lev <= 0) continue;

      if (pos.side === 'long') {
        const liqPrice = pos.entryPrice * (1 - 1 / lev);
        if (liqPrice > 0) {
          clusters.push({
            price: liqPrice,
            width: pos.entryPrice * DEFAULT_SL_TP_WIDTH_RATIO,
            intensity: (pos.size ?? 1) / Math.max(1, lev),
            sources: ['liquidation-math'],
            type: 'stop-loss',
            side: 'long',
          });
        }
      } else {
        const liqPrice = pos.entryPrice * (1 + 1 / lev);
        clusters.push({
          price: liqPrice,
          width: pos.entryPrice * DEFAULT_SL_TP_WIDTH_RATIO,
          intensity: (pos.size ?? 1) / Math.max(1, lev),
          sources: ['liquidation-math'],
          type: 'stop-loss',
          side: 'short',
        });
      }
    }
  }

  return clusters;
}

// ─── Algorithm 2: Swing High/Low Clustering ──────────────────────────

/**
 * Detect swing highs and lows from OHLCV candles.
 * A swing high has `strength` candles on each side with lower highs.
 * A swing low has `strength` candles on each side with higher lows.
 */
export function detectSwingPoints(
  candles: readonly OHLCVCandle[],
  strength: number,
): SwingPoint[] {
  if (strength < 1) throw new RangeError(`Swing strength must be >= 1, got ${strength}`);
  const swings: SwingPoint[] = [];
  const len = candles.length;

  for (let i = strength; i < len - strength; i++) {
    const candle = candles[i] as OHLCVCandle;

    // Check swing high
    let isSwingHigh = true;
    for (let j = 1; j <= strength; j++) {
      if ((candles[i - j] as OHLCVCandle).high >= candle.high || (candles[i + j] as OHLCVCandle).high >= candle.high) {
        isSwingHigh = false;
        break;
      }
    }
    if (isSwingHigh) {
      swings.push({
        price: candle.high,
        timestamp: candle.timestamp,
        type: 'high',
        strength,
      });
    }

    // Check swing low
    let isSwingLow = true;
    for (let j = 1; j <= strength; j++) {
      if ((candles[i - j] as OHLCVCandle).low <= candle.low || (candles[i + j] as OHLCVCandle).low <= candle.low) {
        isSwingLow = false;
        break;
      }
    }
    if (isSwingLow) {
      swings.push({
        price: candle.low,
        timestamp: candle.timestamp,
        type: 'low',
        strength,
      });
    }
  }

  return swings;
}

/**
 * Cluster swing points that are within `eps` distance of each other.
 * Swing highs → SL for shorts, TP for longs.
 * Swing lows → SL for longs, TP for shorts.
 */
export function clusterSwingPoints(
  swings: readonly SwingPoint[],
  eps: number,
): SLTPCluster[] {
  if (swings.length === 0) return [];

  const sorted = [...swings].sort((a, b) => a.price - b.price);
  const visited = new Array(sorted.length).fill(false);
  const clusters: SLTPCluster[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (visited[i]) continue;
    visited[i] = true;

    const group: SwingPoint[] = [sorted[i] as SwingPoint];
    for (let j = i + 1; j < sorted.length; j++) {
      if (visited[j]) continue;
      if ((sorted[i] as SwingPoint).price === 0) continue;
      if (Math.abs((sorted[j] as SwingPoint).price - (sorted[i] as SwingPoint).price) / (sorted[i] as SwingPoint).price <= eps) {
        visited[j] = true;
        group.push(sorted[j] as SwingPoint);
      }
    }

    const avgPrice = group.reduce((s, p) => s + p.price, 0) / group.length;
    const priceRange = group.length > 1
      ? (group[group.length - 1] as SwingPoint).price - (group[0] as SwingPoint).price
      : avgPrice * MIN_PRICE_WIDTH_RATIO;
    const intensity = Math.min(1, group.length / MAX_CLUSTER_INTENSITY_DIVISOR);

    const isHigh = group.filter((p) => p.type === 'high').length > group.length / 2;

    // Swing highs are SL zones for shorts, TP zones for longs
    if (isHigh) {
      clusters.push({
        price: avgPrice,
        width: priceRange || avgPrice * MIN_PRICE_WIDTH_RATIO,
        intensity,
        sources: ['swing-cluster'],
        type: 'stop-loss',
        side: 'short',
      });
      clusters.push({
        price: avgPrice,
        width: priceRange || avgPrice * MIN_PRICE_WIDTH_RATIO,
        intensity,
        sources: ['swing-cluster'],
        type: 'take-profit',
        side: 'long',
      });
    } else {
      clusters.push({
        price: avgPrice,
        width: priceRange || avgPrice * MIN_PRICE_WIDTH_RATIO,
        intensity,
        sources: ['swing-cluster'],
        type: 'stop-loss',
        side: 'long',
      });
      clusters.push({
        price: avgPrice,
        width: priceRange || avgPrice * MIN_PRICE_WIDTH_RATIO,
        intensity,
        sources: ['swing-cluster'],
        type: 'take-profit',
        side: 'short',
      });
    }
  }

  return clusters;
}

// ─── Algorithm 3: Round Number + ATR Zones ───────────────────────────

/**
 * Compute ATR (Average True Range) from candles.
 */
export function computeATR(candles: readonly OHLCVCandle[], period: number): number {
  if (period < 1) throw new RangeError(`ATR period must be >= 1, got ${period}`);
  if (candles.length < 2) return 0;

  let atrSum = 0;
  const start = Math.max(1, candles.length - period);
  let count = 0;

  for (let i = start; i < candles.length; i++) {
    const c = candles[i] as OHLCVCandle;
    const prev = candles[i - 1] as OHLCVCandle;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close),
    );
    atrSum += tr;
    count++;
  }

  return count > 0 ? atrSum / count : 0;
}

/**
 * Find round number levels within the current price range.
 * Osler (2002): ~10% of SL/TP orders cluster at round numbers.
 */
export function computeRoundNumberLevels(
  currentPrice: number,
  roundInterval: number,
  atr: number,
  atrMultiplier: number,
  range: number,
): SLTPCluster[] {
  if (roundInterval <= 0) return [];
  const clusters: SLTPCluster[] = [];
  const zoneWidth = atr * atrMultiplier;

  const low = currentPrice - range / 2;
  const high = currentPrice + range / 2;
  const startLevel = Math.ceil(low / roundInterval) * roundInterval;

  for (let level = startLevel; level <= high; level += roundInterval) {
    // Skip if too close to current price (within 0.1%)
    if (Math.abs(level - currentPrice) / currentPrice < MIN_PRICE_WIDTH_RATIO) continue;

    const isBelowPrice = level < currentPrice;

    // Below price: SL for longs, TP for shorts
    // Above price: SL for shorts, TP for longs
    clusters.push({
      price: level,
      width: zoneWidth,
      intensity: ROUND_NUMBER_INTENSITY, // Per Osler: ~10% of orders at round numbers
      sources: ['round-number'],
      type: isBelowPrice ? 'stop-loss' : 'take-profit',
      side: 'long',
    });
    clusters.push({
      price: level,
      width: zoneWidth,
      intensity: ROUND_NUMBER_INTENSITY,
      sources: ['round-number'],
      type: isBelowPrice ? 'take-profit' : 'stop-loss',
      side: 'short',
    });
  }

  return clusters;
}

// ─── Algorithm 4: Historical Sweep Analysis ──────────────────────────

/**
 * Detect historical price sweeps: where price briefly pierced a swing level
 * and reversed, indicating stop hunts / liquidity grabs.
 */
export function detectHistoricalSweeps(
  candles: readonly OHLCVCandle[],
  swings: readonly SwingPoint[],
  tolerance: number,
): SLTPCluster[] {
  const clusters: SLTPCluster[] = [];
  const sweepCounts = new Map<number, number>();

  for (const swing of swings) {
    let sweepCount = 0;

    for (const candle of candles) {
      if (candle.timestamp <= swing.timestamp) continue;

      if (swing.type === 'high') {
        // Price pierced above the swing high then closed below it
        if (candle.high > swing.price * (1 + tolerance) && candle.close < swing.price) {
          sweepCount++;
        }
      } else {
        // Price pierced below the swing low then closed above it
        if (candle.low < swing.price * (1 - tolerance) && candle.close > swing.price) {
          sweepCount++;
        }
      }
    }

    if (sweepCount > 0) {
      sweepCounts.set(swing.price, (sweepCounts.get(swing.price) ?? 0) + sweepCount);
    }
  }

  for (const [price, count] of sweepCounts) {
    const intensity = Math.min(1, count / SWEEP_INTENSITY_DIVISOR);
    // Sweep zones are high-probability SL zones (stops get hunted here)
    clusters.push({
      price,
      width: price * DEFAULT_SL_TP_WIDTH_RATIO,
      intensity,
      sources: ['historical-sweep'],
      type: 'stop-loss',
      side: 'long',
    });
    clusters.push({
      price,
      width: price * DEFAULT_SL_TP_WIDTH_RATIO,
      intensity,
      sources: ['historical-sweep'],
      type: 'stop-loss',
      side: 'short',
    });
  }

  return clusters;
}

// ─── Algorithm 5: DBSCAN Clustering ─────────────────────────────────

/**
 * DBSCAN density-based clustering on a set of price points.
 * Groups nearby price levels into dense clusters.
 */
export function dbscanCluster(
  prices: readonly number[],
  eps: number,
  minPoints: number,
): number[][] {
  if (prices.length === 0) return [];

  const sorted = [...prices].sort((a, b) => a - b);
  const visited = new Array(sorted.length).fill(false);
  const clusters: number[][] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (visited[i]) continue;
    visited[i] = true;

    // Find neighbors within eps (relative distance)
    const neighbors: number[] = [i];
    for (let j = 0; j < sorted.length; j++) {
      if (j === i || visited[j]) continue;
      if ((sorted[i] as number) === 0) continue;
      if (Math.abs((sorted[j] as number) - (sorted[i] as number)) / (sorted[i] as number) <= eps) {
        neighbors.push(j);
      }
    }

    if (neighbors.length >= minPoints) {
      // Mark all neighbors as visited
      for (const idx of neighbors) visited[idx] = true;
      clusters.push(neighbors.map((idx) => sorted[idx] as number));
    }
  }

  return clusters;
}

/**
 * Run DBSCAN on all detected cluster prices to find dense zones.
 */
export function dbscanSLTPClusters(
  existingClusters: readonly SLTPCluster[],
  eps: number,
  minPoints: number,
): SLTPCluster[] {
  if (existingClusters.length === 0) return [];

  const prices = existingClusters.map((c) => c.price);
  const denseClusters = dbscanCluster(prices, eps, minPoints);
  const result: SLTPCluster[] = [];

  for (const cluster of denseClusters) {
    const avgPrice = cluster.reduce((s, p) => s + p, 0) / cluster.length;
    const width = cluster.length > 1
      ? (cluster[cluster.length - 1] as number) - (cluster[0] as number)
      : avgPrice * MIN_PRICE_WIDTH_RATIO;
    const intensity = Math.min(1, cluster.length / MAX_CLUSTER_INTENSITY_DIVISOR);

    // Inherit type/side from the majority of contributing clusters
    const contributing = existingClusters.filter((c) =>
      cluster.some((p) => Math.abs(p - c.price) / c.price <= eps),
    );
    const slCount = contributing.filter((c) => c.type === 'stop-loss').length;
    const type: StopTakeType = slCount >= contributing.length / 2 ? 'stop-loss' : 'take-profit';
    const longCount = contributing.filter((c) => c.side === 'long').length;
    const side: 'long' | 'short' = longCount >= contributing.length / 2 ? 'long' : 'short';

    result.push({
      price: avgPrice,
      width,
      intensity,
      sources: ['dbscan'],
      type,
      side,
    });
  }

  return result;
}

// ─── Algorithm 6: Composite Scoring ─────────────────────────────────

/**
 * Merge all clusters and compute composite score by bucketing
 * nearby clusters and summing weighted intensities.
 */
export function computeCompositeScores(
  allClusters: readonly SLTPCluster[],
  weights: Record<SLTPAlgorithm, number>,
  bucketSize: number,
): SLTPCluster[] {
  if (allClusters.length === 0) return [];
  if (bucketSize <= 0) return [...allClusters];

  // Bucket clusters by price
  const bucketMap = new Map<string, SLTPCluster[]>();
  for (const cluster of allClusters) {
    const bucketKey = Math.round(cluster.price / bucketSize) * bucketSize;
    const key = `${bucketKey}:${cluster.type}:${cluster.side}`;
    const arr = bucketMap.get(key) ?? [];
    arr.push(cluster);
    bucketMap.set(key, arr);
  }

  const result: SLTPCluster[] = [];
  for (const [key, group] of bucketMap) {
    const [priceStr, type, side] = key.split(':');
    const price = Number(priceStr);

    let weightedSum = 0;
    const sources = new Set<SLTPAlgorithm>();
    let maxWidth = 0;

    for (const c of group) {
      for (const src of c.sources) {
        const w = weights[src] ?? 0.1;
        weightedSum += c.intensity * w;
        sources.add(src);
      }
      if (c.width > maxWidth) maxWidth = c.width;
    }

    result.push({
      price,
      width: maxWidth || price * DEFAULT_SL_TP_WIDTH_RATIO,
      intensity: Math.min(1, weightedSum),
      sources: [...sources, 'composite'],
      type: type as StopTakeType,
      side: side as 'long' | 'short',
    });
  }

  return result.sort((a, b) => b.intensity - a.intensity);
}

// ─── Main Engine ────────────────────────────────────────────────────

/**
 * Run the full SL/TP estimation engine.
 *
 * Exchange-agnostic: works with any OHLCV data and optional position info.
 */
export function computeSLTPHeatmap(
  candles: readonly OHLCVCandle[],
  config: Readonly<SLTPConfig>,
  positions?: readonly EstimatedPosition[],
): SLTPHeatmap {
  if (candles.length === 0) {
    return { cells: [], maxIntensity: 0, priceBucketSize: config.priceBucketSize || 1, slClusters: [], tpClusters: [] };
  }

  const currentPrice = (candles[candles.length - 1] as OHLCVCandle).close;
  const allClusters: SLTPCluster[] = [];

  // Auto-detect bucket size
  let priceBucket = config.priceBucketSize;
  if (priceBucket <= 0) {
    let minP = Infinity;
    let maxP = -Infinity;
    for (const c of candles) {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    }
    priceBucket = (maxP - minP) / PRICE_BUCKET_TARGET || 1;
  }

  const algorithms = config.algorithms;

  // Algorithm 1: Liquidation Level Math
  if (algorithms.includes('liquidation-math')) {
    const pos = positions ?? generateEstimatedPositions(candles, config.leverageLevels);
    allClusters.push(...computeLiquidationLevels(pos, config.leverageLevels));
  }

  // Algorithm 2: Swing Clustering
  const swings = detectSwingPoints(candles, config.swingStrength);
  if (algorithms.includes('swing-cluster')) {
    allClusters.push(...clusterSwingPoints(swings, config.dbscanEps));
  }

  // Algorithm 3: Round Number + ATR
  if (algorithms.includes('round-number')) {
    const atr = computeATR(candles, 14);
    const maxHigh = candles.reduce((r, c) => Math.max(r, c.high), 0);
    const minLow = candles.reduce((r, c) => Math.min(r, c.low), Infinity);
    const priceRange = isFinite(minLow) ? maxHigh - minLow : maxHigh;
    allClusters.push(
      ...computeRoundNumberLevels(
        currentPrice,
        config.roundNumberInterval,
        atr,
        config.atrMultiplier,
        priceRange,
      ),
    );
  }

  // Algorithm 4: Historical Sweep
  if (algorithms.includes('historical-sweep')) {
    allClusters.push(...detectHistoricalSweeps(candles, swings, MIN_PRICE_WIDTH_RATIO));
  }

  // Algorithm 5: DBSCAN
  if (algorithms.includes('dbscan') && allClusters.length > 0) {
    allClusters.push(...dbscanSLTPClusters(allClusters, config.dbscanEps, config.dbscanMinPoints));
  }

  // Algorithm 6: Composite scoring
  const compositeClusters = algorithms.includes('composite')
    ? computeCompositeScores(allClusters, config.weights, priceBucket)
    : allClusters;

  // Split into SL and TP
  const slClusters = compositeClusters.filter((c) => c.type === 'stop-loss');
  const tpClusters = compositeClusters.filter((c) => c.type === 'take-profit');

  // Build heatmap cells
  const cells = buildHeatmapCells(compositeClusters, priceBucket);

  let maxIntensity = 0;
  for (const cell of cells) {
    const total = cell.slIntensity + cell.tpIntensity;
    if (total > maxIntensity) maxIntensity = total;
  }

  return { cells, maxIntensity, priceBucketSize: priceBucket, slClusters, tpClusters };
}

/**
 * Generate synthetic estimated positions from recent candle data
 * when real position data is not available.
 */
function generateEstimatedPositions(
  candles: readonly OHLCVCandle[],
  leverageLevels: readonly number[],
): EstimatedPosition[] {
  const positions: EstimatedPosition[] = [];
  // Use recent candle closes as estimated entry prices
  const recentCount = Math.min(RECENT_CANDLE_COUNT, candles.length);
  const recentCandles = candles.slice(-recentCount);

  for (const candle of recentCandles) {
    for (const lev of leverageLevels) {
      positions.push({
        entryPrice: candle.close,
        leverage: lev,
        side: 'long',
        size: candle.volume,
      });
      positions.push({
        entryPrice: candle.close,
        leverage: lev,
        side: 'short',
        size: candle.volume,
      });
    }
  }

  return positions;
}

/**
 * Convert clusters into heatmap grid cells.
 */
function buildHeatmapCells(
  clusters: readonly SLTPCluster[],
  priceBucket: number,
): SLTPHeatmapCell[] {
  const cellMap = new Map<number, SLTPHeatmapCell>();

  for (const cluster of clusters) {
    const bucketKey = Math.round(cluster.price / priceBucket) * priceBucket;

    let cell = cellMap.get(bucketKey);
    if (!cell) {
      cell = {
        price: bucketKey,
        timestamp: Date.now(),
        slIntensity: 0,
        tpIntensity: 0,
        dominantSide: 'long',
      };
      cellMap.set(bucketKey, cell);
    }

    if (cluster.type === 'stop-loss') {
      cell.slIntensity += cluster.intensity;
    } else {
      cell.tpIntensity += cluster.intensity;
    }
    cell.dominantSide = cluster.side;
  }

  return Array.from(cellMap.values());
}
