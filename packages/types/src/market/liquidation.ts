import type { ExchangeId } from '../exchange/connection.js';

/**
 * A liquidation event from an exchange.
 * Represents a forced closure of a leveraged position.
 */
export interface LiquidationEvent {
  /** Exchange where the liquidation occurred */
  exchange: ExchangeId;
  /** Normalized symbol, e.g. 'BTC/USDT' */
  symbol: string;
  /** Liquidation side (the position that was liquidated) */
  side: 'buy' | 'sell';
  /** Liquidation price */
  price: number;
  /** Liquidated quantity in base currency */
  amount: number;
  /** Unix milliseconds timestamp */
  timestamp: number;
}
