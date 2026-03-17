/**
 * Supported candle timeframe intervals.
 */
export type CandleTimeframe =
  | '1s'
  | '5s'
  | '15s'
  | '30s'
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '12h'
  | '1d'
  | '1w';

/**
 * An OHLCV (Open-High-Low-Close-Volume) candle with additional
 * buy/sell volume breakdown for CVD (Cumulative Volume Delta) calculation.
 */
export interface OHLCVCandle {
  /** Exchange this candle originated from */
  exchange: string;
  /** Normalized symbol (e.g., 'BTC/USDT') */
  symbol: string;
  /** Candle timeframe */
  timeframe: CandleTimeframe;
  /** Candle open time in unix milliseconds */
  timestamp: number;
  /** Opening price */
  open: number;
  /** Highest price during the period */
  high: number;
  /** Lowest price during the period */
  low: number;
  /** Closing price */
  close: number;
  /** Total volume in base currency */
  volume: number;
  /** Taker buy volume (for CVD calculation) */
  buyVolume: number;
  /** Taker sell volume */
  sellVolume: number;
  /** Number of trades in this candle */
  tradeCount: number;
  /** Whether this candle is closed (false = currently forming) */
  closed: boolean;
}
