import type { OHLCVCandle, IndicatorPoint, EMAOutput } from '@terminal/types';

/**
 * Compute Exponential Moving Average over candle close prices.
 * Uses SMA of first `period` candles as the seed value.
 * Returns null for points with insufficient data.
 */
export function computeEMA(
  candles: OHLCVCandle[],
  period: number
): IndicatorPoint<EMAOutput>[] {
  if (period < 1) {
    throw new RangeError(`EMA period must be >= 1, got ${period}`);
  }
  const len = candles.length;
  const result: IndicatorPoint<EMAOutput>[] = new Array(len);
  const multiplier = 2 / (period + 1);

  let ema = 0;
  let sum = 0;

  for (let i = 0; i < len; i++) {
    const candle = candles[i] as OHLCVCandle;
    const close = candle.close;

    if (i < period - 1) {
      // Accumulating for initial SMA seed
      sum += close;
      result[i] = { timestamp: candle.timestamp, data: { value: null } };
    } else if (i === period - 1) {
      // Seed EMA with SMA
      sum += close;
      ema = sum / period;
      result[i] = { timestamp: candle.timestamp, data: { value: ema } };
    } else {
      // Standard EMA formula
      ema = (close - ema) * multiplier + ema;
      result[i] = { timestamp: candle.timestamp, data: { value: ema } };
    }
  }

  return result;
}
