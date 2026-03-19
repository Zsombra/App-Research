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

  it('should handle BTC-quoted pairs', () => {
    expect(normalizeSymbol('ETHBTC')).toBe('ETH/BTC');
  });

  it('should handle ETH-quoted pairs', () => {
    expect(normalizeSymbol('SOLETH')).toBe('SOL/ETH');
  });

  it('should handle BUSD and TUSD pairs', () => {
    expect(normalizeSymbol('BTCBUSD')).toBe('BTC/BUSD');
    expect(normalizeSymbol('BTCTUSD')).toBe('BTC/TUSD');
  });

  it('should return unrecognized symbol as-is uppercased', () => {
    expect(normalizeSymbol('xyz')).toBe('XYZ');
  });

  it('should handle mixed case with slash', () => {
    expect(normalizeSymbol('btc/usdt')).toBe('BTC/USDT');
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

  it('should throw on empty string', () => {
    expect(() => parseExchangeSymbol('')).toThrow('Invalid symbol format');
  });

  it('should throw on symbol with multiple slashes', () => {
    expect(() => parseExchangeSymbol('BTC/USD/T')).toThrow('Invalid symbol format');
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

  it('should show significant digits for small prices', () => {
    const result = formatPrice(0.00001234);
    expect(result).toContain('1234');
  });

  it('should handle exactly 1.00', () => {
    const result = formatPrice(1.0);
    expect(result).toContain('1');
  });
});

describe('formatVolume', () => {
  it('should abbreviate millions', () => {
    expect(formatVolume(1_234_567)).toBe('1.23M');
  });

  it('should abbreviate billions', () => {
    expect(formatVolume(1_234_567_890)).toBe('1.23B');
  });

  it('should format thousands with commas', () => {
    const result = formatVolume(5_432);
    expect(result).toContain('5');
    expect(result).toContain('432');
  });

  it('should format small values with 2 decimals', () => {
    expect(formatVolume(42.567)).toBe('42.57');
  });

  it('should handle zero', () => {
    expect(formatVolume(0)).toBe('0.00');
  });
});
