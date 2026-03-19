import { describe, it, expect } from 'vitest';
import type { OHLCVCandle } from '@terminal/types';
import { computeMACD } from '../indicators/macd.js';

function makeCandles(closes: number[]): OHLCVCandle[] {
  return closes.map((close, i) => ({
    exchange: 'test',
    symbol: 'TEST/USDT',
    timeframe: '1m',
    timestamp: 1000 + i * 60000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
    buyVolume: 50,
    sellVolume: 50,
    tradeCount: 10,
    closed: true,
  }));
}

describe('computeMACD', () => {
  const fastPeriod = 12;
  const slowPeriod = 26;
  const signalPeriod = 9;

  it('should return null MACD until slow EMA is ready', () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);
    const candles = makeCandles(closes);
    const result = computeMACD(candles, fastPeriod, slowPeriod, signalPeriod);

    // Before slowPeriod-1 (index 25), MACD should be null
    for (let i = 0; i < slowPeriod - 1; i++) {
      expect(result[i]!.data.macd).toBeNull();
    }

    // At index 25 (slowPeriod-1), MACD should have a value
    expect(result[slowPeriod - 1]!.data.macd).not.toBeNull();
  });

  it('should return null signal until signal EMA is ready', () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);
    const candles = makeCandles(closes);
    const result = computeMACD(candles, fastPeriod, slowPeriod, signalPeriod);

    // Signal needs slowPeriod-1 + signalPeriod-1 candles to become valid
    const signalStart = slowPeriod - 1 + signalPeriod - 1;

    // Before signal is ready, signal should be null
    expect(result[slowPeriod - 1]!.data.signal).toBeNull();

    // At signalStart, signal should have a value
    expect(result[signalStart]!.data.signal).not.toBeNull();
    expect(result[signalStart]!.data.histogram).not.toBeNull();
  });

  it('should compute histogram as MACD - Signal', () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.3) * 5);
    const candles = makeCandles(closes);
    const result = computeMACD(candles, fastPeriod, slowPeriod, signalPeriod);

    for (const point of result) {
      if (point.data.macd !== null && point.data.signal !== null && point.data.histogram !== null) {
        expect(point.data.histogram).toBeCloseTo(point.data.macd - point.data.signal, 10);
      }
    }
  });

  it('should handle empty input', () => {
    const result = computeMACD([], fastPeriod, slowPeriod, signalPeriod);
    expect(result).toHaveLength(0);
  });

  it('should handle constant prices (MACD = 0)', () => {
    const closes = Array.from({ length: 50 }, () => 100);
    const candles = makeCandles(closes);
    const result = computeMACD(candles, fastPeriod, slowPeriod, signalPeriod);

    // With constant price, fast EMA = slow EMA, so MACD = 0
    const lastPoint = result[result.length - 1]!;
    expect(lastPoint.data.macd).toBeCloseTo(0, 5);
  });

  it('should return all nulls when fewer candles than slowPeriod', () => {
    const candles = makeCandles([10, 20, 30]);
    const result = computeMACD(candles, fastPeriod, slowPeriod, signalPeriod);
    for (const point of result) {
      expect(point.data.macd).toBeNull();
      expect(point.data.signal).toBeNull();
    }
  });

  it('should produce positive MACD during strong uptrend', () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + i * 2);
    const candles = makeCandles(closes);
    const result = computeMACD(candles, fastPeriod, slowPeriod, signalPeriod);
    const last = result[49]!;
    // Fast EMA reacts quicker to uptrend → MACD > 0
    expect(last.data.macd).toBeGreaterThan(0);
  });

  it('should produce negative MACD during strong downtrend', () => {
    const closes = Array.from({ length: 50 }, (_, i) => 200 - i * 2);
    const candles = makeCandles(closes);
    const result = computeMACD(candles, fastPeriod, slowPeriod, signalPeriod);
    const last = result[49]!;
    expect(last.data.macd).toBeLessThan(0);
  });
});
