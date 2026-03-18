import { describe, it, expect } from 'vitest';
import { executeScript } from '../scripting/script-engine.js';
import type { OHLCVCandle } from '@terminal/types';

function makeCandles(count: number): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  for (let i = 0; i < count; i++) {
    candles.push({
      exchange: 'simulated',
      symbol: 'BTC/USDT',
      timeframe: '1m',
      timestamp: 1700000000000 + i * 60000,
      open: 100 + i,
      high: 102 + i,
      low: 98 + i,
      close: 101 + i,
      volume: 10,
      buyVolume: 6,
      sellVolume: 4,
      tradeCount: 20,
      closed: true,
    });
  }
  return candles;
}

describe('executeScript', () => {
  it('should execute basic script and produce plots', () => {
    const source = `
      const ma = sma(candles.close, 3);
      plot(ma, { label: 'SMA 3' });
    `;
    const result = executeScript(source, makeCandles(10), 'BTC/USDT');

    expect(result.error).toBeNull();
    expect(result.plots).toHaveLength(1);
    expect(result.plots[0]!.values).toHaveLength(10);
    expect(result.plots[0]!.label).toBe('SMA 3');
  });

  it('should provide candle data in context', () => {
    const source = `
      plot(candles.close, { label: 'Close' });
    `;
    const candles = makeCandles(5);
    const result = executeScript(source, candles, 'BTC/USDT');

    expect(result.error).toBeNull();
    expect(result.plots[0]!.values).toHaveLength(5);
    expect(result.plots[0]!.values[0]).toBe(candles[0]!.close);
  });

  it('should trigger alerts', () => {
    const source = `
      alert('Test alert message');
    `;
    const result = executeScript(source, makeCandles(5), 'BTC/USDT');

    expect(result.error).toBeNull();
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toBe('Test alert message');
  });

  it('should catch script errors', () => {
    const source = `
      throw new Error('Script failed');
    `;
    const result = executeScript(source, makeCandles(5), 'BTC/USDT');

    expect(result.error).toBe('Script failed');
    expect(result.plots).toHaveLength(0);
  });

  it('should catch syntax errors', () => {
    const source = `
      const x = {{{;
    `;
    const result = executeScript(source, makeCandles(5), 'BTC/USDT');

    expect(result.error).toBeTruthy();
  });

  it('should support EMA helper', () => {
    const source = `
      const ema20 = ema(candles.close, 5);
      plot(ema20, { label: 'EMA 5' });
    `;
    const result = executeScript(source, makeCandles(20), 'BTC/USDT');

    expect(result.error).toBeNull();
    expect(result.plots).toHaveLength(1);
    // First 4 values should be null (EMA period - 1)
    expect(result.plots[0]!.values[0]).toBeNull();
    expect(result.plots[0]!.values[4]).not.toBeNull();
  });

  it('should support multiple plots', () => {
    const source = `
      plot(candles.open, { color: '#ff0000', label: 'Open' });
      plot(candles.close, { color: '#00ff00', label: 'Close' });
    `;
    const result = executeScript(source, makeCandles(5), 'BTC/USDT');

    expect(result.error).toBeNull();
    expect(result.plots).toHaveLength(2);
    expect(result.plots[0]!.color).toBe('#ff0000');
    expect(result.plots[1]!.color).toBe('#00ff00');
  });

  it('should handle empty candle data', () => {
    const source = `
      plot(candles.close, { label: 'Close' });
    `;
    const result = executeScript(source, [], 'BTC/USDT');

    expect(result.error).toBeNull();
    expect(result.plots[0]!.values).toHaveLength(0);
  });

  it('should expose symbol in context', () => {
    const source = `
      if (symbol === 'BTC/USDT') {
        alert('BTC detected');
      }
    `;
    const result = executeScript(source, makeCandles(5), 'BTC/USDT');

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toBe('BTC detected');
  });
});
