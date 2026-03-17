import type { OHLCVCandle, IndicatorPoint, SMAOutput } from '@terminal/types';

/**
 * Compute Simple Moving Average over candle close prices.
 * Returns null for points with insufficient data (first period-1 candles).
 */
export function computeSMA(
  candles: OHLCVCandle[],
  period: number
): IndicatorPoint<SMAOutput>[] {
  const len = candles.length;
  const result: IndicatorPoint<SMAOutput>[] = new Array(len);

  let sum = 0;

  for (let i = 0; i < len; i++) {
    sum += candles[i]!.close;

    if (i >= period) {
      sum -= candles[i - period]!.close;
    }

    if (i >= period - 1) {
      result[i] = {
        timestamp: candles[i]!.timestamp,
        data: { value: sum / period },
      };
    } else {
      result[i] = {
        timestamp: candles[i]!.timestamp,
        data: { value: null },
      };
    }
  }

  return result;
}
