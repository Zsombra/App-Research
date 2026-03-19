import type {
  ExchangeId,
  PriceLevel,
  OrderbookSnapshot,
  OrderbookDelta,
} from '@terminal/types';

/**
 * Error thrown when a sequence gap is detected in orderbook delta application.
 * The caller should handle this by requesting a new snapshot.
 */
export class SequenceGapError extends Error {
  readonly lastSequenceId: number;
  readonly receivedPrevSequenceId: number;

  constructor(lastSequenceId: number, receivedPrevSequenceId: number) {
    super(
      `Orderbook sequence gap: expected prevSequenceId=${lastSequenceId}, got ${receivedPrevSequenceId}`
    );
    this.name = 'SequenceGapError';
    this.lastSequenceId = lastSequenceId;
    this.receivedPrevSequenceId = receivedPrevSequenceId;
  }
}

/**
 * Configuration for the OrderbookManager.
 */
export interface OrderbookManagerConfig {
  /** Normalized symbol, e.g. 'BTC/USDT' */
  symbol: string;
  /** Exchange that owns this orderbook */
  exchange: ExchangeId;
  /** Maximum number of price levels per side. Default 50. */
  maxDepth?: number;
}

/**
 * Maintains the L2 orderbook state for a single symbol.
 * Applies snapshots and deltas, keeps bids sorted descending
 * and asks sorted ascending, and enforces a configurable depth limit.
 */
export class OrderbookManager {
  private readonly symbol: string;
  private readonly exchange: ExchangeId;
  private readonly maxDepth: number;

  /** Bids keyed by price. */
  private bidsMap: Map<number, number> = new Map();
  /** Asks keyed by price. */
  private asksMap: Map<number, number> = new Map();

  private lastTimestamp = 0;
  private lastSequenceId = 0;

  constructor(config: OrderbookManagerConfig) {
    this.symbol = config.symbol;
    this.exchange = config.exchange;
    this.maxDepth = config.maxDepth ?? 50;
  }

  /**
   * Replaces the entire orderbook state with the given snapshot.
   */
  applySnapshot(snapshot: OrderbookSnapshot): void {
    this.bidsMap.clear();
    this.asksMap.clear();

    for (const level of snapshot.bids) {
      if (level.size > 0 && level.price > 0) {
        this.bidsMap.set(level.price, level.size);
      }
    }
    for (const level of snapshot.asks) {
      if (level.size > 0 && level.price > 0) {
        this.asksMap.set(level.price, level.size);
      }
    }

    this.lastTimestamp = snapshot.timestamp;
    this.lastSequenceId = snapshot.sequenceId;
    this.trimDepth();
  }

  /**
   * Applies an incremental delta to the current orderbook state.
   * Levels with size 0 are removed; levels with size > 0 are set/updated.
   */
  applyDelta(delta: OrderbookDelta): void {
    // Validate sequence continuity if we have a previous sequence ID
    if (
      this.lastSequenceId !== 0 &&
      delta.prevSequenceId !== undefined &&
      delta.prevSequenceId !== this.lastSequenceId
    ) {
      throw new SequenceGapError(this.lastSequenceId, delta.prevSequenceId);
    }

    for (const level of delta.bids) {
      if (level.size === 0) {
        this.bidsMap.delete(level.price);
      } else {
        this.bidsMap.set(level.price, level.size);
      }
    }
    for (const level of delta.asks) {
      if (level.size === 0) {
        this.asksMap.delete(level.price);
      } else {
        this.asksMap.set(level.price, level.size);
      }
    }

    this.lastTimestamp = delta.timestamp;
    this.lastSequenceId = delta.sequenceId;
    this.trimDepth();
  }

  /**
   * Returns a full OrderbookSnapshot of the current state,
   * with bids sorted descending and asks sorted ascending,
   * limited to maxDepth levels per side.
   */
  getSnapshot(): OrderbookSnapshot {
    return {
      exchange: this.exchange,
      symbol: this.symbol,
      timestamp: this.lastTimestamp,
      bids: this.getSortedBids(),
      asks: this.getSortedAsks(),
      sequenceId: this.lastSequenceId,
    };
  }

  /** Returns the best (highest) bid, or null if no bids. */
  get bestBid(): PriceLevel | null {
    if (this.bidsMap.size === 0) return null;
    let bestPrice = -Infinity;
    let bestSize = 0;
    for (const [price, size] of this.bidsMap) {
      if (price > bestPrice) {
        bestPrice = price;
        bestSize = size;
      }
    }
    return { price: bestPrice, size: bestSize };
  }

  /** Returns the best (lowest) ask, or null if no asks. */
  get bestAsk(): PriceLevel | null {
    if (this.asksMap.size === 0) return null;
    let bestPrice = Infinity;
    let bestSize = 0;
    for (const [price, size] of this.asksMap) {
      if (price < bestPrice) {
        bestPrice = price;
        bestSize = size;
      }
    }
    return { price: bestPrice, size: bestSize };
  }

  private getSortedBids(): PriceLevel[] {
    const entries = Array.from(this.bidsMap.entries())
      .sort(([a], [b]) => b - a)
      .slice(0, this.maxDepth);
    return entries.map(([price, size]) => ({ price, size }));
  }

  private getSortedAsks(): PriceLevel[] {
    const entries = Array.from(this.asksMap.entries())
      .sort(([a], [b]) => a - b)
      .slice(0, this.maxDepth);
    return entries.map(([price, size]) => ({ price, size }));
  }

  /**
   * Trims the orderbook to maxDepth levels per side.
   * Removes levels furthest from the spread.
   */
  private trimDepth(): void {
    if (this.bidsMap.size > this.maxDepth) {
      const sortedBids = Array.from(this.bidsMap.keys()).sort((a, b) => b - a);
      for (let i = this.maxDepth; i < sortedBids.length; i++) {
        this.bidsMap.delete(sortedBids[i] as number);
      }
    }
    if (this.asksMap.size > this.maxDepth) {
      const sortedAsks = Array.from(this.asksMap.keys()).sort((a, b) => a - b);
      for (let i = this.maxDepth; i < sortedAsks.length; i++) {
        this.asksMap.delete(sortedAsks[i] as number);
      }
    }
  }
}
