import type { OHLCVCandle, IndicatorPoint, BollingerOutput } from '@terminal/types';

/**
 * Compute Bollinger Bands.
 * Middle band = SMA(period)
 * Upper band = Middle + stdDev * rolling standard deviation
 * Lower band = Middle - stdDev * rolling standard deviation
 */
export function computeBollinger(
  candles: OHLCVCandle[],
  period: number,
  stdDev: number
): IndicatorPoint<BollingerOutput>[] {
  const len = candles.length;
  const result: IndicatorPoint<BollingerOutput>[] = new Array(len);

  for (let i = 0; i < len; i++) {
    if (i < period - 1) {
      result[i] = {
        timestamp: candles[i]!.timestamp,
        data: { upper: null, middle: null, lower: null },
      };
      continue;
    }

    // Calculate SMA and standard deviation over the window
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j]!.close;
    }
    const mean = sum / period;

    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = candles[j]!.close - mean;
      variance += diff * diff;
    }
    const sd = Math.sqrt(variance / period);

    result[i] = {
      timestamp: candles[i]!.timestamp,
      data: {
        upper: mean + stdDev * sd,
        middle: mean,
        lower: mean - stdDev * sd,
      },
    };
  }

  return result;
}
