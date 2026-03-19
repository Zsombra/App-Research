import type { OHLCVCandle, IndicatorPoint, CVDOutput } from '@terminal/types';

/**
 * Compute Cumulative Volume Delta (CVD).
 * Delta per candle = buyVolume - sellVolume.
 * CVD is the running cumulative sum of per-candle deltas.
 */
export function computeCVD(
  candles: readonly OHLCVCandle[]
): IndicatorPoint<CVDOutput>[] {
  const len = candles.length;
  const result: IndicatorPoint<CVDOutput>[] = new Array(len);

  let cumulative = 0;

  for (let i = 0; i < len; i++) {
    const candle = candles[i] as OHLCVCandle;
    const delta = candle.buyVolume - candle.sellVolume;
    cumulative += delta;

    result[i] = {
      timestamp: candle.timestamp,
      data: { value: cumulative, delta },
    };
  }

  return result;
}
