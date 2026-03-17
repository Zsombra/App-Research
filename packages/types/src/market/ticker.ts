import type { ExchangeId } from '../exchange/connection.js';

/**
 * Best Bid and Offer (top of book) for a symbol.
 */
export interface BBO {
  /** Best bid price */
  bidPrice: number;
  /** Best bid size */
  bidSize: number;
  /** Best ask price */
  askPrice: number;
  /** Best ask size */
  askSize: number;
}

/**
 * Ticker data for a symbol on a given exchange.
 * Includes 24h summary statistics and current BBO.
 */
export interface Ticker {
  /** Exchange that produced this ticker */
  exchange: ExchangeId;
  /** Normalized symbol, e.g. 'BTC/USDT' */
  symbol: string;
  /** Unix milliseconds timestamp */
  timestamp: number;
  /** Last trade price */
  lastPrice: number;
  /** 24h price change percentage */
  changePercent24h: number;
  /** 24h high price */
  high24h: number;
  /** 24h low price */
  low24h: number;
  /** 24h volume in base currency */
  volume24h: number;
  /** 24h volume in quote currency */
  quoteVolume24h: number;
  /** Best bid and offer */
  bbo: BBO;
}
