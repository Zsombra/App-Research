import { describe, it, expect } from 'vitest';
import { normalizeSymbol, parseExchangeSymbol } from '../utils/symbol.js';

describe('normalizeSymbol — empty string guard', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeSymbol('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeSymbol('   ')).toBe('');
    expect(normalizeSymbol('\t')).toBe('');
  });

  it('normalizes BTCUSDT to BTC/USDT', () => {
    expect(normalizeSymbol('BTCUSDT')).toBe('BTC/USDT');
  });

  it('normalizes lowercase to uppercase', () => {
    expect(normalizeSymbol('btcusdt')).toBe('BTC/USDT');
  });

  it('returns already-normalized symbols as uppercase', () => {
    expect(normalizeSymbol('btc/usdt')).toBe('BTC/USDT');
    expect(normalizeSymbol('BTC/USDT')).toBe('BTC/USDT');
  });

  it('normalizes ETHUSDC correctly', () => {
    expect(normalizeSymbol('ETHUSDC')).toBe('ETH/USDC');
  });

  it('normalizes ETHBTC correctly', () => {
    expect(normalizeSymbol('ETHBTC')).toBe('ETH/BTC');
  });

  it('handles unknown quote currency as fallback', () => {
    const result = normalizeSymbol('XYZABC');
    expect(result).toBe('XYZABC'); // uppercase fallback
  });
});

describe('parseExchangeSymbol', () => {
  it('parses valid symbol', () => {
    expect(parseExchangeSymbol('BTC/USDT')).toEqual({ base: 'BTC', quote: 'USDT' });
  });

  it('throws for invalid format (no slash)', () => {
    expect(() => parseExchangeSymbol('BTCUSDT')).toThrow('Invalid symbol format');
  });

  it('throws for empty string', () => {
    expect(() => parseExchangeSymbol('')).toThrow('Invalid symbol format');
  });

  it('throws for triple slash', () => {
    expect(() => parseExchangeSymbol('BTC/USDT/USD')).toThrow('Invalid symbol format');
  });
});
