import type { ExchangeId } from '../exchange/connection.js';

/**
 * A single price level in an order book.
 * A size of 0 indicates the level has been removed (for delta messages).
 */
export interface PriceLevel {
  /** Price at this level */
  price: number;
  /** Size (quantity) at this level. 0 = level removed. */
  size: number;
}

/**
 * A full order book snapshot for a given symbol on a given exchange.
 */
export interface OrderbookSnapshot {
  /** Exchange that produced this snapshot */
  exchange: ExchangeId;
  /** Normalized symbol, e.g. 'BTC/USDT' */
  symbol: string;
  /** Unix milliseconds timestamp */
  timestamp: number;
  /** Bid levels, sorted descending by price */
  bids: PriceLevel[];
  /** Ask levels, sorted ascending by price */
  asks: PriceLevel[];
  /** Sequence ID for ordering validation */
  sequenceId: number;
}

/**
 * An incremental order book update (delta) to be applied to a snapshot.
 */
export interface OrderbookDelta {
  /** Exchange that produced this delta */
  exchange: ExchangeId;
  /** Normalized symbol, e.g. 'BTC/USDT' */
  symbol: string;
  /** Unix milliseconds timestamp */
  timestamp: number;
  /** Bid level changes */
  bids: PriceLevel[];
  /** Ask level changes */
  asks: PriceLevel[];
  /** Sequence ID of this delta */
  sequenceId: number;
  /** Sequence ID of the previous message (for gap detection) */
  prevSequenceId: number;
}
