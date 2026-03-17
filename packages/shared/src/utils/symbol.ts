/**
 * Normalizes an exchange-specific symbol into the standard `BASE/QUOTE` format.
 *
 * @example
 * normalizeSymbol('BTCUSDT') // => 'BTC/USDT'
 * normalizeSymbol('BTC/USDT') // => 'BTC/USDT'
 * normalizeSymbol('btcusdt') // => 'BTC/USDT'
 */
export function normalizeSymbol(symbol: string): string {
  // Already normalized
  if (symbol.includes('/')) {
    return symbol.toUpperCase();
  }

  const upper = symbol.toUpperCase();

  // Common quote currencies sorted by length descending to match longest first
  const quoteCurrencies = ['USDT', 'USDC', 'BUSD', 'TUSD', 'USD', 'BTC', 'ETH', 'BNB'];

  for (const quote of quoteCurrencies) {
    if (upper.endsWith(quote)) {
      const base = upper.slice(0, -quote.length);
      if (base.length > 0) {
        return `${base}/${quote}`;
      }
    }
  }

  // Fallback: return as-is uppercased
  return upper;
}

/**
 * Parses a normalized symbol into its base and quote components.
 *
 * @example
 * parseExchangeSymbol('BTC/USDT') // => { base: 'BTC', quote: 'USDT' }
 */
export function parseExchangeSymbol(symbol: string): { base: string; quote: string } {
  const parts = symbol.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid symbol format: ${symbol}. Expected BASE/QUOTE format.`);
  }
  return { base: parts[0], quote: parts[1] };
}
