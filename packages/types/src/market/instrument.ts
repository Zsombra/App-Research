import type { ExchangeId } from '../exchange/connection.js';

/**
 * Instrument metadata describing a tradable pair on an exchange.
 */
export interface Instrument {
  /** Normalized symbol, e.g. 'BTC/USDT' */
  symbol: string;
  /** Base currency, e.g. 'BTC' */
  baseCurrency: string;
  /** Quote currency, e.g. 'USDT' */
  quoteCurrency: string;
  /** Minimum price increment */
  tickSize: number;
  /** Minimum quantity increment */
  lotSize: number;
  /** Minimum notional value for an order */
  minNotional: number;
  /** Whether the instrument is currently actively traded */
  active: boolean;
}

/**
 * Maps an exchange-specific symbol format to the normalized form.
 */
export interface ExchangeSymbol {
  /** Exchange identifier */
  exchange: ExchangeId;
  /** Exchange-native symbol, e.g. 'BTCUSDT' on Binance */
  nativeSymbol: string;
  /** Normalized symbol, e.g. 'BTC/USDT' */
  normalizedSymbol: string;
  /** Full instrument metadata */
  instrument: Instrument;
}
