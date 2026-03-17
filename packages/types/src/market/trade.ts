import type { ExchangeId } from '../exchange/connection.js';

/**
 * A trade normalized across all supported exchanges into a common format.
 * Every exchange adapter must produce this shape.
 */
export interface NormalizedTrade {
  /** Unique trade identifier from the exchange */
  id: string;
  /** Exchange that produced this trade */
  exchange: ExchangeId;
  /** Normalized symbol, e.g. 'BTC/USDT' */
  symbol: string;
  /** Trade price in quote currency */
  price: number;
  /** Trade amount in base currency */
  amount: number;
  /** Taker aggressor side */
  side: 'buy' | 'sell';
  /** Unix milliseconds timestamp */
  timestamp: number;
  /** Whether the buyer was the maker */
  isMaker: boolean;
  /** Quote currency value (price * amount) */
  cost: number;
  /** Whether this trade is a forced liquidation */
  liquidation: boolean;
}
