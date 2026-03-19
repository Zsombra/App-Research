import { describe, it, expect } from 'vitest';
import { toUnixMs, bucketToTimeframe } from '../utils/time.js';

describe('toUnixMs edge cases', () => {
  it('should return 0 for 0', () => {
    expect(toUnixMs(0)).toBe(0);
  });

  it('should return negative numbers as-is', () => {
    expect(toUnixMs(-1000)).toBe(-1000);
  });

  it('should handle epoch date', () => {
    const epoch = new Date(0);
    expect(toUnixMs(epoch)).toBe(0);
  });

  it('should handle future dates', () => {
    const future = new Date('2030-01-01T00:00:00Z');
    expect(toUnixMs(future)).toBeGreaterThan(Date.now());
  });

  it('should handle very large timestamps', () => {
    const ts = Number.MAX_SAFE_INTEGER;
    expect(toUnixMs(ts)).toBe(ts);
  });
});

describe('bucketToTimeframe edge cases', () => {
  it('should floor 1m bucket correctly', () => {
    // 2024-03-10T12:34:56.789Z
    const ts = 1710074096789;
    const bucketed = bucketToTimeframe(ts, '1m');
    expect(bucketed % 60_000).toBe(0);
    expect(bucketed).toBeLessThanOrEqual(ts);
    expect(ts - bucketed).toBeLessThan(60_000);
  });

  it('should floor 1h bucket correctly', () => {
    const ts = 1710074096789;
    const bucketed = bucketToTimeframe(ts, '1h');
    expect(bucketed % 3_600_000).toBe(0);
    expect(bucketed).toBeLessThanOrEqual(ts);
  });

  it('should floor 1d bucket correctly', () => {
    const ts = 1710074096789;
    const bucketed = bucketToTimeframe(ts, '1d');
    expect(bucketed % 86_400_000).toBe(0);
    expect(bucketed).toBeLessThanOrEqual(ts);
  });

  it('should return same value when already aligned', () => {
    const aligned = 1710072000000; // exactly on a 1h boundary
    expect(bucketToTimeframe(aligned, '1h')).toBe(aligned);
  });

  it('should handle timestamp 0', () => {
    expect(bucketToTimeframe(0, '1m')).toBe(0);
  });

  it('should handle 1s timeframe', () => {
    const ts = 1710074096789;
    const bucketed = bucketToTimeframe(ts, '1s');
    expect(bucketed % 1_000).toBe(0);
    expect(ts - bucketed).toBeLessThan(1_000);
  });

  it('should handle 5m timeframe', () => {
    const ts = 1710074096789;
    const bucketed = bucketToTimeframe(ts, '5m');
    expect(bucketed % (5 * 60_000)).toBe(0);
  });

  it('should handle 15m timeframe', () => {
    const ts = 1710074096789;
    const bucketed = bucketToTimeframe(ts, '15m');
    expect(bucketed % (15 * 60_000)).toBe(0);
  });
});
