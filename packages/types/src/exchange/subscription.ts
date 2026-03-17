import type { ExchangeId } from './connection.js';

/**
 * Available subscription topics for market data streams.
 */
export type SubscriptionTopic = 'trades' | 'orderbook' | 'ticker' | 'liquidations';

/**
 * A request to subscribe to or unsubscribe from a market data stream.
 */
export interface SubscriptionRequest {
  /** The exchange to subscribe on */
  exchange: ExchangeId;
  /** The normalized symbol, e.g. 'BTC/USDT' */
  symbol: string;
  /** The data topic to subscribe to */
  topic: SubscriptionTopic;
  /** Order book depth (only relevant for 'orderbook' topic) */
  depth?: number;
}
