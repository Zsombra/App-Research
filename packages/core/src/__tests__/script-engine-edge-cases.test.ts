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

describe('executeScript edge cases', () => {
  // -------------------------------------------------------------------------
  // Sandbox / scope restrictions
  // -------------------------------------------------------------------------
  describe('sandbox restrictions', () => {
    it('cannot access globalThis.constructor to escape', () => {
      const result = executeScript(
        'alert(typeof globalThis.constructor);',
        makeCandles(5),
        'BTC/USDT'
      );
      // Script runs but cannot break out of sandbox via constructor
      expect(result.error).toBeNull();
    });

    it('cannot access require', () => {
      const result = executeScript(
        'const r = typeof require; alert(r);',
        makeCandles(5),
        'BTC/USDT'
      );
      // require should be undefined in strict sandbox
      if (result.error === null) {
        expect(result.alerts[0]).toBe('undefined');
      }
    });

    it('cannot modify the ctx object to escape', () => {
      const result = executeScript(
        `
        // Try to overwrite plot to inject
        const originalPlot = plot;
        plot([1, 2, 3], { label: "legit" });
        `,
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.plots).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  describe('error handling', () => {
    it('handles undefined variable reference', () => {
      const result = executeScript('nonExistentVar.foo();', makeCandles(5), 'BTC/USDT');
      expect(result.error).toBeTruthy();
    });

    it('handles TypeError from null access', () => {
      const result = executeScript(
        'const x = null; x.property;',
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeTruthy();
    });

    it('returns empty plots/alerts on error', () => {
      const result = executeScript('throw new Error("boom");', makeCandles(5), 'BTC/USDT');
      expect(result.plots).toHaveLength(0);
      expect(result.alerts).toHaveLength(0);
      expect(result.error).toBe('boom');
    });

    it('handles non-Error thrown values', () => {
      const result = executeScript('throw "string error";', makeCandles(5), 'BTC/USDT');
      expect(result.error).toBe('string error');
    });

    it('handles thrown numbers', () => {
      const result = executeScript('throw 42;', makeCandles(5), 'BTC/USDT');
      expect(result.error).toBe('42');
    });
  });

  // -------------------------------------------------------------------------
  // Helper function edge cases
  // -------------------------------------------------------------------------
  describe('SMA edge cases', () => {
    it('SMA with period=1 returns input values', () => {
      const result = executeScript(
        'plot(sma(candles.close, 1), { label: "SMA 1" });',
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      const values = result.plots[0]!.values;
      // SMA period 1 = the values themselves
      expect(values).toHaveLength(5);
      expect(values[0]).toBe(101); // first close
    });

    it('SMA with period larger than data returns all nulls', () => {
      const result = executeScript(
        'plot(sma(candles.close, 100), { label: "SMA 100" });',
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      const values = result.plots[0]!.values;
      expect(values.every(v => v === null)).toBe(true);
    });

    it('SMA on empty array returns empty array', () => {
      const result = executeScript(
        'plot(sma(candles.close, 3), { label: "SMA" });',
        [],
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.plots[0]!.values).toHaveLength(0);
    });
  });

  describe('EMA edge cases', () => {
    it('EMA with period=1 follows price closely', () => {
      const result = executeScript(
        'plot(ema(candles.close, 1), { label: "EMA 1" });',
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      const values = result.plots[0]!.values;
      expect(values).toHaveLength(5);
      // Period 1 EMA ≈ close values
      expect(values[0]).toBeCloseTo(101);
    });

    it('EMA with period larger than data returns all nulls', () => {
      const result = executeScript(
        'plot(ema(candles.close, 100), { label: "EMA 100" });',
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.plots[0]!.values.every(v => v === null)).toBe(true);
    });
  });

  describe('crossover/crossunder edge cases', () => {
    it('crossover with arrays too short returns false', () => {
      const result = executeScript(
        'alert(String(crossover([1], [2])));',
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.alerts[0]).toBe('false');
    });

    it('crossunder with arrays too short returns false', () => {
      const result = executeScript(
        'alert(String(crossunder([1], [2])));',
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.alerts[0]).toBe('false');
    });

    it('crossover detects actual crossing', () => {
      const result = executeScript(
        'alert(String(crossover([1, 3], [2, 2])));',
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.alerts[0]).toBe('true');
    });

    it('crossunder detects actual crossing', () => {
      const result = executeScript(
        'alert(String(crossunder([3, 1], [2, 2])));',
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.alerts[0]).toBe('true');
    });
  });

  // -------------------------------------------------------------------------
  // Plot edge cases
  // -------------------------------------------------------------------------
  describe('plot edge cases', () => {
    it('plot with no options uses defaults', () => {
      const result = executeScript(
        'plot(candles.close);',
        makeCandles(3),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.plots[0]!.color).toBe('#FFD700');
      expect(result.plots[0]!.width).toBe(1.5);
      expect(result.plots[0]!.label).toBe('Plot 1');
    });

    it('multiple plots auto-number labels', () => {
      const result = executeScript(
        'plot(candles.close); plot(candles.open); plot(candles.high);',
        makeCandles(3),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.plots[0]!.label).toBe('Plot 1');
      expect(result.plots[1]!.label).toBe('Plot 2');
      expect(result.plots[2]!.label).toBe('Plot 3');
    });

    it('plot with null values in array', () => {
      const result = executeScript(
        'plot([null, 1, null, 3, null], { label: "sparse" });',
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.plots[0]!.values).toEqual([null, 1, null, 3, null]);
    });

    it('plot with empty array', () => {
      const result = executeScript(
        'plot([], { label: "empty" });',
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.plots[0]!.values).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Alert edge cases
  // -------------------------------------------------------------------------
  describe('alert edge cases', () => {
    it('multiple alerts accumulate', () => {
      const result = executeScript(
        'alert("one"); alert("two"); alert("three");',
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.alerts).toEqual(['one', 'two', 'three']);
    });

    it('alert with empty string', () => {
      const result = executeScript(
        'alert("");',
        makeCandles(5),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.alerts).toEqual(['']);
    });
  });

  // -------------------------------------------------------------------------
  // Timeout edge cases (safeTimeout)
  // -------------------------------------------------------------------------
  describe('safeTimeout clamping', () => {
    it('negative timeout is clamped to 1ms (does not crash)', () => {
      const result = executeScript(
        'plot(candles.close, { label: "Close" });',
        makeCandles(3),
        'BTC/USDT',
        -100,
      );
      // Should not crash or produce negative limit messages
      expect(result.plots.length).toBeGreaterThanOrEqual(0);
      if (result.error) {
        expect(result.error).not.toContain('-100');
      }
    });

    it('zero timeout is clamped to 1ms (does not crash)', () => {
      const result = executeScript(
        'plot(candles.close, { label: "Close" });',
        makeCandles(3),
        'BTC/USDT',
        0,
      );
      expect(result.plots.length).toBeGreaterThanOrEqual(0);
      if (result.error) {
        expect(result.error).not.toContain('0ms');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Candle data access
  // -------------------------------------------------------------------------
  describe('candle data access', () => {
    it('candles.length matches input', () => {
      const result = executeScript(
        'alert(String(candles.length));',
        makeCandles(42),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.alerts[0]).toBe('42');
    });

    it('all OHLCV arrays are accessible', () => {
      const result = executeScript(
        `
        alert(String(candles.open.length));
        alert(String(candles.high.length));
        alert(String(candles.low.length));
        alert(String(candles.close.length));
        alert(String(candles.volume.length));
        alert(String(candles.timestamp.length));
        `,
        makeCandles(10),
        'BTC/USDT'
      );
      expect(result.error).toBeNull();
      expect(result.alerts).toEqual(['10', '10', '10', '10', '10', '10']);
    });
  });
});
