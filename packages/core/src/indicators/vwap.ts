import type { OHLCVCandle, IndicatorPoint, VWAPOutput } from '@terminal/types';

/**
 * Compute Volume Weighted Average Price (VWAP) with +/- 1 standard deviation bands.
 *
 * VWAP = cumSum(typicalPrice * volume) / cumSum(volume)
 * where typicalPrice = (high + low + close) / 3
 *
 * Upper band = VWAP + stddev
 * Lower band = VWAP - stddev
 *
 * Resets at each new trading day (UTC midnight boundary).
 */
export function computeVWAP(
  candles: OHLCVCandle[]
): IndicatorPoint<VWAPOutput>[] {
  const len = candles.length;
  const result: IndicatorPoint<VWAPOutput>[] = new Array(len);

  let cumPV = 0;      // Cumulative (price * volume)
  let cumV = 0;       // Cumulative volume
  let cumPV2 = 0;     // Cumulative (price^2 * volume) for variance
  let prevDay = -1;

  for (let i = 0; i < len; i++) {
    const candle = candles[i]!;
    const tp = (candle.high + candle.low + candle.close) / 3;

    // Check for day boundary reset (UTC)
    const currentDay = Math.floor(candle.timestamp / 86_400_000);
    if (currentDay !== prevDay) {
      cumPV = 0;
      cumV = 0;
      cumPV2 = 0;
      prevDay = currentDay;
    }

    cumPV += tp * candle.volume;
    cumV += candle.volume;
    cumPV2 += tp * tp * candle.volume;

    if (cumV === 0) {
      result[i] = {
        timestamp: candle.timestamp,
        data: { vwap: null, upper: null, lower: null },
      };
      continue;
    }

    const vwap = cumPV / cumV;

    // Standard deviation: sqrt(cumPV2/cumV - vwap^2)
    const variance = cumPV2 / cumV - vwap * vwap;
    const sd = Math.sqrt(Math.max(0, variance));

    result[i] = {
      timestamp: candle.timestamp,
      data: {
        vwap,
        upper: vwap + sd,
        lower: vwap - sd,
      },
    };
  }

  return result;
}
