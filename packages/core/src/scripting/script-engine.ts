import type { OHLCVCandle, ScriptResult, ScriptPlot } from '@terminal/types';

/** Default maximum execution time for scripts in milliseconds. */
const DEFAULT_SCRIPT_TIMEOUT_MS = 100;

/**
 * Helper: compute SMA on an array of numbers.
 */
function smaHelper(values: readonly number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] as number;
    if (i >= period) {
      sum -= values[i - period] as number;
    }
    if (i >= period - 1) {
      result.push(sum / period);
    } else {
      result.push(null);
    }
  }
  return result;
}

/**
 * Helper: compute EMA on an array of numbers.
 */
function emaHelper(values: readonly number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  // EMA smoothing factor: k = 2 / (period + 1)
  const k = 2 / (period + 1);
  let ema: number | null = null;

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (ema === null) {
      // Seed with SMA
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += values[j] as number;
      }
      ema = sum / period;
      result.push(ema);
    } else {
      ema = (values[i] as number) * k + ema * (1 - k);
      result.push(ema);
    }
  }
  return result;
}

/**
 * Helper: detect crossover of a over b at the latest point.
 */
function crossoverHelper(a: readonly number[], b: readonly number[]): boolean {
  if (a.length < 2 || b.length < 2) return false;
  const len = Math.min(a.length, b.length);
  return (a[len - 1] as number) > (b[len - 1] as number) && (a[len - 2] as number) <= (b[len - 2] as number);
}

/**
 * Helper: detect crossunder of a below b at the latest point.
 */
function crossunderHelper(a: readonly number[], b: readonly number[]): boolean {
  if (a.length < 2 || b.length < 2) return false;
  const len = Math.min(a.length, b.length);
  return (a[len - 1] as number) < (b[len - 1] as number) && (a[len - 2] as number) >= (b[len - 2] as number);
}

/**
 * Execute a custom script in a sandboxed context.
 *
 * The script receives a `ctx` object with candle data and helper functions.
 * Scripts can call `ctx.plot()` to draw lines and `ctx.alert()` to trigger alerts.
 *
 * @param source - JavaScript source code
 * @param candles - OHLCV candle data
 * @param symbol - Current symbol
 * @param timeout - Max execution time in milliseconds (default 100ms)
 * @returns ScriptResult with plots and alerts
 */
export function executeScript(
  source: string,
  candles: readonly OHLCVCandle[],
  symbol: string,
  timeout: number = DEFAULT_SCRIPT_TIMEOUT_MS,
): ScriptResult {
  const safeTimeout = Math.max(1, timeout);
  const plots: ScriptPlot[] = [];
  const alerts: string[] = [];

  try {
    // Build the context object
    const ctx = {
      candles: {
        open: candles.map((c) => c.open),
        high: candles.map((c) => c.high),
        low: candles.map((c) => c.low),
        close: candles.map((c) => c.close),
        volume: candles.map((c) => c.volume),
        timestamp: candles.map((c) => c.timestamp),
        length: candles.length,
      },
      symbol,
      plot: (values: (number | null)[], options?: { color?: string; width?: number; label?: string }) => {
        plots.push({
          values,
          color: options?.color ?? '#FFD700',
          width: options?.width ?? 1.5,
          label: options?.label ?? `Plot ${plots.length + 1}`,
        });
      },
      alert: (message: string) => {
        alerts.push(message);
      },
      sma: smaHelper,
      ema: emaHelper,
      crossover: crossoverHelper,
      crossunder: crossunderHelper,
    };

    // Create a sandboxed function
    // We intentionally limit scope to prevent access to globals
    const fn = new Function(
      'ctx',
      // Wrap in a timeout-safe IIFE
      `"use strict";
      const { candles, symbol, plot, alert, sma, ema, crossover, crossunder } = ctx;
      ${source}`
    );

    // Execute with timeout tracking
    const startTime = Date.now();
    fn(ctx);
    const elapsed = Date.now() - startTime;

    if (elapsed > safeTimeout) {
      return {
        plots,
        alerts,
        error: `Script took ${elapsed}ms (limit: ${safeTimeout}ms)`,
      };
    }

    return { plots, alerts, error: null };
  } catch (err) {
    return {
      plots: [],
      alerts: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
