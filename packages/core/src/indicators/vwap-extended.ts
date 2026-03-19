import type { OHLCVCandle, IndicatorPoint, VWAPOutput } from '@terminal/types';

/**
 * Compute anchored VWAP: starts from a user-specified candle index.
 *
 * Unlike session VWAP which resets daily, anchored VWAP accumulates
 * from the anchor point forward indefinitely.
 */
export function computeAnchoredVWAP(
  candles: OHLCVCandle[],
  anchorIndex: number,
): IndicatorPoint<VWAPOutput>[] {
  const len = candles.length;
  const result: IndicatorPoint<VWAPOutput>[] = new Array(len);

  let cumPV = 0;
  let cumV = 0;
  let cumPV2 = 0;

  for (let i = 0; i < len; i++) {
    const candle = candles[i] as OHLCVCandle;

    if (i < anchorIndex) {
      result[i] = {
        timestamp: candle.timestamp,
        data: { vwap: null, upper: null, lower: null },
      };
      continue;
    }

    const tp = (candle.high + candle.low + candle.close) / 3;
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
    const variance = cumPV2 / cumV - vwap * vwap;
    const sd = Math.sqrt(Math.max(0, variance));

    result[i] = {
      timestamp: candle.timestamp,
      data: { vwap, upper: vwap + sd, lower: vwap - sd },
    };
  }

  return result;
}

/**
 * Compute rolling VWAP: uses a sliding window of N candles.
 *
 * Unlike session VWAP (resets daily) or anchored VWAP (fixed start),
 * rolling VWAP continuously recalculates over the most recent N candles.
 */
export function computeRollingVWAP(
  candles: OHLCVCandle[],
  windowSize: number,
): IndicatorPoint<VWAPOutput>[] {
  const len = candles.length;
  const result: IndicatorPoint<VWAPOutput>[] = new Array(len);

  for (let i = 0; i < len; i++) {
    const windowStart = Math.max(0, i - windowSize + 1);

    let cumPV = 0;
    let cumV = 0;
    let cumPV2 = 0;

    for (let j = windowStart; j <= i; j++) {
      const c = candles[j] as OHLCVCandle;
      const tp = (c.high + c.low + c.close) / 3;
      cumPV += tp * c.volume;
      cumV += c.volume;
      cumPV2 += tp * tp * c.volume;
    }

    const candle = candles[i] as OHLCVCandle;
    if (cumV === 0) {
      result[i] = {
        timestamp: candle.timestamp,
        data: { vwap: null, upper: null, lower: null },
      };
      continue;
    }

    const vwap = cumPV / cumV;
    const variance = cumPV2 / cumV - vwap * vwap;
    const sd = Math.sqrt(Math.max(0, variance));

    result[i] = {
      timestamp: candle.timestamp,
      data: { vwap, upper: vwap + sd, lower: vwap - sd },
    };
  }

  return result;
}
