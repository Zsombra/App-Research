import type { ExchangeId } from '@terminal/types';

/**
 * List of all supported exchanges in the terminal.
 */
export const SUPPORTED_EXCHANGES: readonly ExchangeId[] = [
  'binance',
  'bybit',
  'okx',
  'bitget',
  'coinbase',
  'kraken',
  'deribit',
  'bitmex',
  'gate',
  'kucoin',
  'simulated',
] as const;

/**
 * Human-readable display names for each supported exchange.
 */
export const EXCHANGE_DISPLAY_NAMES: Readonly<Record<ExchangeId, string>> = {
  binance: 'Binance',
  bybit: 'Bybit',
  okx: 'OKX',
  bitget: 'Bitget',
  coinbase: 'Coinbase',
  kraken: 'Kraken',
  deribit: 'Deribit',
  bitmex: 'BitMEX',
  gate: 'Gate.io',
  kucoin: 'KuCoin',
  simulated: 'Simulated',
};
