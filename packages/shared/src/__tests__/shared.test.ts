import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_EXCHANGES,
  EXCHANGE_DISPLAY_NAMES,
  TIMEFRAME_MS,
  MAX_PANELS,
  RING_BUFFER_SIZE,
  normalizeSymbol,
  parseExchangeSymbol,
  toUnixMs,
  bucketToTimeframe,
  formatPrice,
  formatVolume,
} from '../index.js';

describe('@terminal/shared constants', () => {
  it('should export all supported exchanges', () => {
    expect(SUPPORTED_EXCHANGES).toContain('binance');
    expect(SUPPORTED_EXCHANGES).toContain('bybit');
    expect(SUPPORTED_EXCHANGES.length).toBeGreaterThanOrEqual(10);
  });

  it('should have display names for every supported exchange', () => {
    for (const exchange of SUPPORTED_EXCHANGES) {
      expect(EXCHANGE_DISPLAY_NAMES[exchange]).toBeDefined();
      expect(typeof EXCHANGE_DISPLAY_NAMES[exchange]).toBe('string');
    }
  });

  it('should define timeframe milliseconds', () => {
    expect(TIMEFRAME_MS['1s']).toBe(1_000);
    expect(TIMEFRAME_MS['1m']).toBe(60_000);
    expect(TIMEFRAME_MS['1h']).toBe(3_600_000);
    expect(TIMEFRAME_MS['1d']).toBe(86_400_000);
  });

  it('should have reasonable limits', () => {
    expect(MAX_PANELS).toBeGreaterThan(0);
    expect(RING_BUFFER_SIZE).toBeGreaterThan(0);
  });
});

describe('normalizeSymbol', () => {
  it('should normalize concatenated symbols', () => {
    expect(normalizeSymbol('BTCUSDT')).toBe('BTC/USDT');
    expect(normalizeSymbol('ETHUSDC')).toBe('ETH/USDC');
  });

  it('should pass through already-normalized symbols', () => {
    expect(normalizeSymbol('BTC/USDT')).toBe('BTC/USDT');
  });

  it('should uppercase symbols', () => {
    expect(normalizeSymbol('btcusdt')).toBe('BTC/USDT');
  });
});

describe('parseExchangeSymbol', () => {
  it('should parse base and quote from normalized symbol', () => {
    const result = parseExchangeSymbol('BTC/USDT');
    expect(result.base).toBe('BTC');
    expect(result.quote).toBe('USDT');
  });

  it('should throw on invalid format', () => {
    expect(() => parseExchangeSymbol('BTCUSDT')).toThrow('Invalid symbol format');
  });
});

describe('toUnixMs', () => {
  it('should return number as-is', () => {
    expect(toUnixMs(1710000000000)).toBe(1710000000000);
  });

  it('should convert Date to unix ms', () => {
    const date = new Date('2024-03-10T00:00:00Z');
    expect(toUnixMs(date)).toBe(date.getTime());
  });
});

describe('bucketToTimeframe', () => {
  it('should floor to 1-minute boundary', () => {
    const ts = 1710000123456;
    const bucketed = bucketToTimeframe(ts, '1m');
    expect(bucketed).toBe(1710000120000);
    expect(bucketed % 60_000).toBe(0);
  });
});

describe('formatPrice', () => {
  it('should format large prices with 2 decimals', () => {
    const result = formatPrice(45123.5);
    expect(result).toContain('45');
    expect(result).toContain('123');
  });
});

describe('formatVolume', () => {
  it('should abbreviate millions', () => {
    expect(formatVolume(1_234_567)).toBe('1.23M');
  });

  it('should abbreviate billions', () => {
    expect(formatVolume(1_234_567_890)).toBe('1.23B');
  });
});
