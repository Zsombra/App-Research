import type { OHLCVCandle, IndicatorPoint, SMAOutput } from '@terminal/types';

/**
 * Compute Simple Moving Average over candle close prices.
 * Returns null for points with insufficient data (first period-1 candles).
 */
export function computeSMA(
  candles: readonly OHLCVCandle[],
  period: number
): IndicatorPoint<SMAOutput>[] {
  if (period < 1) {
    throw new RangeError(`SMA period must be >= 1, got ${period}`);
  }
  const len = candles.length;
  const result: IndicatorPoint<SMAOutput>[] = new Array(len);

  let sum = 0;

  for (let i = 0; i < len; i++) {
    const candle = candles[i] as OHLCVCandle;
    sum += candle.close;

    if (i >= period) {
      const prev = candles[i - period] as OHLCVCandle;
      sum -= prev.close;
    }

    if (i >= period - 1) {
      result[i] = {
        timestamp: candle.timestamp,
        data: { value: sum / period },
      };
    } else {
      result[i] = {
        timestamp: candle.timestamp,
        data: { value: null },
      };
    }
  }

  return result;
}
