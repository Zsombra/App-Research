/**
 * A single order in the market-by-order (MBO) book.
 * Represents an individual resting order at a price level.
 */
export interface MBOOrder {
  /** Unique order identifier */
  orderId: string;
  /** Price of the order */
  price: number;
  /** Size (base currency) of the order */
  size: number;
  /** Side of the order */
  side: 'bid' | 'ask';
  /** Timestamp when the order was placed (unix ms) */
  timestamp: number;
}

/**
 * Full MBO snapshot: all individual orders visible in the book.
 */
export interface MBOSnapshot {
  /** Symbol this snapshot is for */
  symbol: string;
  /** All bid orders sorted by price descending, then time ascending */
  bids: MBOOrder[];
  /** All ask orders sorted by price ascending, then time ascending */
  asks: MBOOrder[];
  /** Snapshot timestamp (unix ms) */
  timestamp: number;
}

/**
 * MBO profile: aggregation stats per price level.
 */
export interface MBOProfileLevel {
  /** Price level */
  price: number;
  /** Side */
  side: 'bid' | 'ask';
  /** Number of individual orders at this level */
  orderCount: number;
  /** Total size at this level */
  totalSize: number;
  /** Average order size */
  avgSize: number;
  /** Largest single order at this level */
  maxOrderSize: number;
  /** Time since oldest order at this level (ms) */
  oldestOrderAge: number;
}

/**
 * Configuration for MBO profile display.
 */
export interface MBOProfileConfig {
  /** Number of price levels to display from each side */
  depthLevels: number;
  /** Highlight orders above this size */
  largeOrderThreshold: number;
  /** Whether to show individual order ages */
  showOrderAge: boolean;
}

/** Default MBO profile config. */
export const DEFAULT_MBO_PROFILE_CONFIG: MBOProfileConfig = {
  depthLevels: 20,
  largeOrderThreshold: 10,
  showOrderAge: true,
};

/**
 * Build an MBO profile from a snapshot.
 * Aggregates individual orders into per-level statistics.
 */
export function buildMBOProfile(
  snapshot: MBOSnapshot,
  config: MBOProfileConfig,
  now: number = Date.now(),
): MBOProfileLevel[] {
  const levels: MBOProfileLevel[] = [];

  // Group bids by price
  const bidMap = new Map<number, MBOOrder[]>();
  for (const order of snapshot.bids) {
    const existing = bidMap.get(order.price) ?? [];
    existing.push(order);
    bidMap.set(order.price, existing);
  }

  // Group asks by price
  const askMap = new Map<number, MBOOrder[]>();
  for (const order of snapshot.asks) {
    const existing = askMap.get(order.price) ?? [];
    existing.push(order);
    askMap.set(order.price, existing);
  }

  // Top N bid levels (highest prices)
  const bidPrices = [...bidMap.keys()].sort((a, b) => b - a).slice(0, config.depthLevels);
  for (const price of bidPrices) {
    const orders = bidMap.get(price)!;
    levels.push(buildLevel(price, 'bid', orders, now));
  }

  // Top N ask levels (lowest prices)
  const askPrices = [...askMap.keys()].sort((a, b) => a - b).slice(0, config.depthLevels);
  for (const price of askPrices) {
    const orders = askMap.get(price)!;
    levels.push(buildLevel(price, 'ask', orders, now));
  }

  return levels;
}

function buildLevel(price: number, side: 'bid' | 'ask', orders: MBOOrder[], now: number): MBOProfileLevel {
  let totalSize = 0;
  let maxOrderSize = 0;
  let oldestTimestamp = now;

  for (const order of orders) {
    totalSize += order.size;
    if (order.size > maxOrderSize) maxOrderSize = order.size;
    if (order.timestamp < oldestTimestamp) oldestTimestamp = order.timestamp;
  }

  return {
    price,
    side,
    orderCount: orders.length,
    totalSize,
    avgSize: orders.length > 0 ? totalSize / orders.length : 0,
    maxOrderSize,
    oldestOrderAge: now - oldestTimestamp,
  };
}
