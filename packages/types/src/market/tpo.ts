/**
 * A single TPO (Time Price Opportunity) row in a market profile.
 */
export interface TPORow {
  /** Bucketed price level */
  price: number;
  /** Number of time periods (letters) at this price */
  tpoCount: number;
  /** Total volume traded at this price */
  volume: number;
  /** Buy volume at this price */
  buyVolume: number;
  /** Sell volume at this price */
  sellVolume: number;
}

/**
 * A computed Market Profile for a session.
 */
export interface MarketProfile {
  /** Session start timestamp */
  sessionStart: number;
  /** Session end timestamp */
  sessionEnd: number;
  /** Price tick size used */
  tickSize: number;
  /** TPO rows sorted by price ascending */
  rows: TPORow[];
  /** Point of Control (price level with highest TPO count) */
  poc: number;
  /** Value Area High (upper bound of 70% volume) */
  vah: number;
  /** Value Area Low (lower bound of 70% volume) */
  val: number;
  /** Session high */
  high: number;
  /** Session low */
  low: number;
  /** Initial Balance High (first hour high) */
  ibHigh: number;
  /** Initial Balance Low (first hour low) */
  ibLow: number;
}

/**
 * Configuration for Market Profile.
 */
export interface MarketProfileConfig {
  /** Price tick size for bucketing (0 = auto) */
  tickSize: number;
  /** Value area percentage (default 70%) */
  valueAreaPercent: number;
  /** Initial balance period in minutes (default 60) */
  ibPeriodMinutes: number;
}

/** Default Market Profile config: auto tick size, 70% value area, 60-min initial balance. */
export const DEFAULT_MARKET_PROFILE_CONFIG: MarketProfileConfig = {
  tickSize: 0,
  valueAreaPercent: 0.70,
  ibPeriodMinutes: 60,
};
