import { describe, it, expect } from 'vitest';
import { formatPrice, formatVolume } from '../utils/number.js';

describe('formatPrice edge cases', () => {
  it('should handle NaN', () => {
    const result = formatPrice(NaN);
    expect(result).toBe('NaN');
  });

  it('should handle Infinity', () => {
    const result = formatPrice(Infinity);
    // Should not throw
    expect(typeof result).toBe('string');
  });

  it('should handle negative Infinity', () => {
    const result = formatPrice(-Infinity);
    expect(typeof result).toBe('string');
  });

  it('should handle very large prices', () => {
    const result = formatPrice(1_000_000_000);
    expect(result).toContain('1,000,000,000');
  });

  it('should handle very small positive prices', () => {
    const result = formatPrice(0.00000001);
    expect(result).toContain('1');
  });

  it('should handle negative prices', () => {
    const result = formatPrice(-100.50);
    expect(result).toContain('100');
  });

  it('should handle exactly 0', () => {
    const result = formatPrice(0);
    expect(result).toBe('0.00');
  });

  it('should handle price just below 1', () => {
    const result = formatPrice(0.99);
    expect(result).toContain('99');
  });

  it('should handle price exactly 1', () => {
    const result = formatPrice(1);
    expect(result).toBe('1.00');
  });
});

describe('formatVolume edge cases', () => {
  it('should handle NaN', () => {
    const result = formatVolume(NaN);
    expect(result).toBe('NaN');
  });

  it('should handle trillion-level volumes', () => {
    const result = formatVolume(1_500_000_000_000);
    expect(result).toContain('B');
    expect(result).toContain('1500');
  });

  it('should handle volume just below million threshold', () => {
    const result = formatVolume(999_999);
    expect(result).toContain('999');
    expect(result).toContain('999');
  });

  it('should handle volume just at million threshold', () => {
    const result = formatVolume(1_000_000);
    expect(result).toBe('1.00M');
  });

  it('should handle volume just below thousand threshold', () => {
    const result = formatVolume(999);
    expect(result).toBe('999.00');
  });

  it('should handle volume just at thousand threshold', () => {
    const result = formatVolume(1_000);
    expect(result).toContain('1,000');
  });

  it('should handle fractional volumes', () => {
    const result = formatVolume(0.5);
    expect(result).toBe('0.50');
  });

  it('should handle negative volumes gracefully', () => {
    const result = formatVolume(-100);
    expect(typeof result).toBe('string');
  });
});
