import { describe, it, expect } from 'vitest';
import type { OHLCVCandle, VWAPOutput, IndicatorPoint } from '@terminal/types';
import { computeIndicator } from '../indicators/index.js';

function makeCandle(close: number, volume: number, timestamp: number): OHLCVCandle {
  return {
    exchange: 'test',
    symbol: 'TEST/USDT',
    timeframe: '1m',
    timestamp,
    open: close,
    high: close + 5,
    low: close - 5,
    close,
    volume,
    buyVolume: volume / 2,
    sellVolume: volume / 2,
    tradeCount: 10,
    closed: true,
  };
}

function makeCandles(count: number): OHLCVCandle[] {
  const base = 1700000000000;
  return Array.from({ length: count }, (_, i) =>
    makeCandle(100 + i, 100 + i * 10, base + i * 60_000)
  );
}

describe('computeIndicator dispatch', () => {
  const candles = makeCandles(30);

  it('should dispatch vwap-anchored and return correct length', () => {
    const result = computeIndicator('vwap-anchored', candles, { anchorIndex: 5 });
    expect(result).toHaveLength(candles.length);

    // Before anchor should be null
    const before = result[0] as IndicatorPoint<VWAPOutput>;
    expect(before.data.vwap).toBeNull();

    // At anchor should be non-null
    const atAnchor = result[5] as IndicatorPoint<VWAPOutput>;
    expect(atAnchor.data.vwap).not.toBeNull();
    expect(atAnchor.data.vwap).toBeGreaterThan(0);
  });

  it('should dispatch vwap-rolling and return correct length', () => {
    const result = computeIndicator('vwap-rolling', candles, { windowSize: 5 });
    expect(result).toHaveLength(candles.length);

    // All should be non-null (rolling always has data)
    const first = result[0] as IndicatorPoint<VWAPOutput>;
    expect(first.data.vwap).not.toBeNull();

    const last = result[candles.length - 1] as IndicatorPoint<VWAPOutput>;
    expect(last.data.vwap).not.toBeNull();
    expect(last.data.upper).not.toBeNull();
    expect(last.data.lower).not.toBeNull();
  });

  it('should use default anchorIndex=0 when param is missing', () => {
    const result = computeIndicator('vwap-anchored', candles, {});
    expect(result).toHaveLength(candles.length);
    // Anchor at 0 means all candles should have data
    const first = result[0] as IndicatorPoint<VWAPOutput>;
    expect(first.data.vwap).not.toBeNull();
  });

  it('should use default windowSize=20 when param is missing', () => {
    const result = computeIndicator('vwap-rolling', candles, {});
    expect(result).toHaveLength(candles.length);
    // All should be valid
    for (const pt of result) {
      const p = pt as IndicatorPoint<VWAPOutput>;
      // Zero-volume would be null, but our candles all have volume
      expect(p.data.vwap).not.toBeNull();
    }
  });

  it('should still dispatch standard vwap', () => {
    const result = computeIndicator('vwap', candles, {});
    expect(result).toHaveLength(candles.length);
  });

  it('should still dispatch existing indicators (sma, ema, rsi, macd, bollinger, cvd)', () => {
    expect(computeIndicator('sma', candles, { period: 5 })).toHaveLength(candles.length);
    expect(computeIndicator('ema', candles, { period: 5 })).toHaveLength(candles.length);
    expect(computeIndicator('rsi', candles, { period: 14 })).toHaveLength(candles.length);
    expect(computeIndicator('macd', candles, {})).toHaveLength(candles.length);
    expect(computeIndicator('bollinger', candles, {})).toHaveLength(candles.length);
    expect(computeIndicator('cvd', candles, {})).toHaveLength(candles.length);
  });
});
