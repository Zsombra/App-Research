import type { ExchangeId } from '../exchange/connection.js';

/**
 * Open Interest snapshot for a symbol on an exchange.
 */
export interface OpenInterestSnapshot {
  /** Exchange this data is from */
  exchange: ExchangeId;
  /** Normalized symbol */
  symbol: string;
  /** Total open interest in contracts/base currency */
  openInterest: number;
  /** Open interest in quote currency (notional value) */
  openInterestValue: number;
  /** Unix milliseconds timestamp */
  timestamp: number;
}

/**
 * Historical open interest data point for charting.
 */
export interface OpenInterestPoint {
  /** Unix milliseconds timestamp */
  timestamp: number;
  /** Open interest value */
  openInterest: number;
  /** Change from previous point */
  change: number;
}

/**
 * Funding rate data for perpetual contracts.
 */
export interface FundingRate {
  /** Exchange this data is from */
  exchange: ExchangeId;
  /** Normalized symbol */
  symbol: string;
  /** Current funding rate (positive = longs pay shorts) */
  rate: number;
  /** Predicted next funding rate */
  predictedRate: number;
  /** Next funding time in unix milliseconds */
  nextFundingTime: number;
  /** Unix milliseconds timestamp */
  timestamp: number;
}
